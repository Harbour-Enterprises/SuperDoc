import type {
  FlowBlock,
  Layout,
  Measure,
  HeaderFooterLayout,
  SectionMetadata,
  ParagraphBlock,
} from '@superdoc/contracts';
import {
  layoutDocument,
  layoutHeaderFooter,
  type LayoutOptions,
  type HeaderFooterConstraints,
  computeDisplayPageNumber,
  resolvePageNumberTokens,
  type NumberingContext,
} from '../../layout-engine/src/index';
import { remeasureParagraph } from './remeasure';
import { computeDirtyRegions } from './diff';
import { MeasureCache } from './cache';
import { layoutHeaderFooterWithCache, HeaderFooterLayoutCache, type HeaderFooterBatch } from './layoutHeaderFooter';
import { FeatureFlags } from './featureFlags';
import { PageTokenLogger, HeaderFooterCacheLogger, globalMetrics } from './instrumentation';
import { HeaderFooterCacheState, invalidateHeaderFooterCache } from './cacheInvalidation';

export type HeaderFooterMeasureFn = (
  block: FlowBlock,
  constraints: { maxWidth: number; maxHeight: number },
) => Promise<Measure>;

export type HeaderFooterLayoutResult = {
  kind: 'header' | 'footer';
  type: keyof HeaderFooterBatch;
  layout: HeaderFooterLayout;
  blocks: FlowBlock[];
  measures: Measure[];
};

export type IncrementalLayoutResult = {
  layout: Layout;
  measures: Measure[];
  dirty: ReturnType<typeof computeDirtyRegions>;
  headers?: HeaderFooterLayoutResult[];
  footers?: HeaderFooterLayoutResult[];
};

export const measureCache = new MeasureCache<Measure>();
const headerMeasureCache = new HeaderFooterLayoutCache();
const headerFooterCacheState = new HeaderFooterCacheState();

const layoutDebugEnabled =
  typeof process !== 'undefined' && typeof process.env !== 'undefined' && Boolean(process.env.SD_DEBUG_LAYOUT);

const perfLog = (...args: unknown[]): void => {
  if (!layoutDebugEnabled) return;

  console.log(...args);
};

/**
 * Performs incremental layout of document blocks with header/footer support.
 *
 * This function orchestrates the complete layout pipeline including:
 * - Dirty region detection and selective cache invalidation
 * - Block measurement with caching
 * - Header/footer pre-layout to prevent body content overlap
 * - Document pagination with header/footer height awareness
 * - Page number token resolution with convergence iteration
 * - Final header/footer layout with section-aware numbering
 *
 * The function supports two modes for header/footer specification:
 * 1. **Variant-based** (headerBlocks/footerBlocks): Headers/footers organized by variant type
 *    ('default', 'first', 'even', 'odd'). Used for single-section documents or when all
 *    sections share the same header/footer variants.
 * 2. **Relationship ID-based** (headerBlocksByRId/footerBlocksByRId): Headers/footers organized
 *    by relationship ID. Used for multi-section documents where each section may have unique
 *    headers/footers referenced by their relationship IDs.
 *
 * Both modes can coexist - the function will extract header/footer heights from both sources
 * to ensure body content doesn't overlap with header/footer content.
 *
 * @param previousBlocks - Previous version of flow blocks (used for dirty region detection)
 * @param _previousLayout - Previous layout result (currently unused, reserved for future optimization)
 * @param nextBlocks - Current version of flow blocks to layout
 * @param options - Layout options including page size, margins, columns, and section metadata
 * @param measureBlock - Async function to measure a block's dimensions given constraints
 * @param headerFooter - Optional header/footer configuration with two modes:
 *   - headerBlocks/footerBlocks: Variant-based headers/footers organized by type
 *     ('default', 'first', 'even', 'odd'). Use this for simple documents with consistent
 *     headers/footers across all sections.
 *   - headerBlocksByRId/footerBlocksByRId: Relationship ID-based headers/footers organized
 *     by unique relationship ID (Map<string, FlowBlock[]>). Use this for complex multi-section
 *     documents where each section references specific headers/footers by their relationship IDs.
 *   - constraints: Header/footer layout constraints (width, height)
 *   - measure: Optional custom measurement function for header/footer blocks
 * @returns Layout result containing:
 *   - layout: Final paginated document layout with page breaks and positioning
 *   - measures: Measurements for all blocks (parallel to nextBlocks array)
 *   - dirty: Dirty region information indicating which blocks changed
 *   - headers: Optional array of header layout results (one per variant type)
 *   - footers: Optional array of footer layout results (one per variant type)
 * @throws Error if measurement constraints are invalid (non-positive width or height)
 *
 * @example
 * ```typescript
 * // Single-section document with variant-based headers
 * const result = await incrementalLayout(
 *   previousBlocks,
 *   previousLayout,
 *   nextBlocks,
 *   { pageSize: { w: 612, h: 792 }, margins: { top: 72, right: 72, bottom: 72, left: 72 } },
 *   measureBlock,
 *   {
 *     headerBlocks: {
 *       default: [headerBlock1, headerBlock2],
 *       first: [firstPageHeaderBlock]
 *     },
 *     constraints: { width: 468, height: 72 }
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Multi-section document with relationship ID-based headers
 * const headersByRId = new Map([
 *   ['rId1', [section1HeaderBlock]],
 *   ['rId2', [section2HeaderBlock]]
 * ]);
 * const result = await incrementalLayout(
 *   previousBlocks,
 *   previousLayout,
 *   nextBlocks,
 *   { pageSize: { w: 612, h: 792 }, sectionMetadata: [...] },
 *   measureBlock,
 *   {
 *     headerBlocksByRId: headersByRId,
 *     constraints: { width: 468, height: 72 }
 *   }
 * );
 * ```
 */
export async function incrementalLayout(
  previousBlocks: FlowBlock[],
  _previousLayout: Layout | null,
  nextBlocks: FlowBlock[],
  options: LayoutOptions,
  measureBlock: (block: FlowBlock, constraints: { maxWidth: number; maxHeight: number }) => Promise<Measure>,
  headerFooter?: {
    headerBlocks?: HeaderFooterBatch;
    footerBlocks?: HeaderFooterBatch;
    headerBlocksByRId?: Map<string, FlowBlock[]>;
    footerBlocksByRId?: Map<string, FlowBlock[]>;
    constraints: HeaderFooterConstraints;
    measure?: HeaderFooterMeasureFn;
  },
): Promise<IncrementalLayoutResult> {
  const _perfStart = performance.now();
  const dirty = computeDirtyRegions(previousBlocks, nextBlocks);
  if (dirty.deletedBlockIds.length > 0) {
    measureCache.invalidate(dirty.deletedBlockIds);
  }

  const { measurementWidth, measurementHeight } = resolveMeasurementConstraints(options, nextBlocks);

  if (measurementWidth <= 0 || measurementHeight <= 0) {
    throw new Error('incrementalLayout: invalid measurement constraints resolved from options');
  }

  const measureStart = performance.now();
  const constraints = { maxWidth: measurementWidth, maxHeight: measurementHeight };
  const measures: Measure[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;
  for (const block of nextBlocks) {
    if (block.kind === 'sectionBreak') {
      measures.push({ kind: 'sectionBreak' });
      continue;
    }
    const cached = measureCache.get(block, measurementWidth, measurementHeight);

    if (cached) {
      measures.push(cached);
      cacheHits++;
      continue;
    }
    const measurement = await measureBlock(block, constraints);
    measureCache.set(block, measurementWidth, measurementHeight, measurement);
    measures.push(measurement);
    cacheMisses++;
  }
  const measureEnd = performance.now();
  perfLog(
    `[Perf] 4.1 Measure all blocks: ${(measureEnd - measureStart).toFixed(2)}ms (${cacheMisses} measured, ${cacheHits} cached)`,
  );

  // Pre-layout headers to get their actual content heights BEFORE body layout.
  // This prevents header content from overlapping with body content when headers
  // exceed their allocated margin space.
  /**
   * Actual measured header content heights per variant type extracted from pre-layout.
   * Keys correspond to header variant types: 'default', 'first', 'even', 'odd'.
   * Values are the actual content heights in pixels, guaranteed to be finite and non-negative.
   * Undefined if headers are not present.
   */
  let headerContentHeights: Partial<Record<'default' | 'first' | 'even' | 'odd', number>> | undefined;

  // Check if we have headers via either headerBlocks (by variant) or headerBlocksByRId (by relationship ID)
  const hasHeaderBlocks = headerFooter?.headerBlocks && Object.keys(headerFooter.headerBlocks).length > 0;
  const hasHeaderBlocksByRId = headerFooter?.headerBlocksByRId && headerFooter.headerBlocksByRId.size > 0;

  if (headerFooter?.constraints && (hasHeaderBlocks || hasHeaderBlocksByRId)) {
    const hfPreStart = performance.now();
    const measureFn = headerFooter.measure ?? measureBlock;

    // Invalidate header/footer cache if content or constraints changed
    invalidateHeaderFooterCache(
      headerMeasureCache,
      headerFooterCacheState,
      headerFooter.headerBlocks,
      headerFooter.footerBlocks,
      headerFooter.constraints,
      options.sectionMetadata,
    );

    /**
     * Placeholder page count used during header pre-layout for height measurement.
     * The actual page count is not yet known at this stage, but it doesn't affect
     * header height calculations. A value of 1 is sufficient as a placeholder.
     */
    const HEADER_PRELAYOUT_PLACEHOLDER_PAGE_COUNT = 1;

    /**
     * Type guard to check if a key is a valid header variant type.
     * Ensures type safety when extracting header heights from the pre-layout results.
     *
     * @param key - The key to validate
     * @returns True if the key is one of the valid header variant types
     */
    type HeaderVariantType = 'default' | 'first' | 'even' | 'odd';
    const isValidHeaderType = (key: string): key is HeaderVariantType => {
      return ['default', 'first', 'even', 'odd'].includes(key);
    };

    headerContentHeights = {};

    // Extract heights from headerBlocks (by variant)
    if (hasHeaderBlocks && headerFooter.headerBlocks) {
      const preHeaderLayouts = await layoutHeaderFooterWithCache(
        headerFooter.headerBlocks,
        headerFooter.constraints,
        measureFn,
        headerMeasureCache,
        HEADER_PRELAYOUT_PLACEHOLDER_PAGE_COUNT,
        undefined, // No page resolver needed for height calculation
      );

      // Extract actual content heights from each variant
      for (const [type, value] of Object.entries(preHeaderLayouts)) {
        if (!isValidHeaderType(type)) continue;
        if (value?.layout && typeof value.layout.height === 'number') {
          const height = value.layout.height;
          if (Number.isFinite(height) && height >= 0) {
            headerContentHeights[type] = height;
          }
        }
      }
    }

    // Also extract heights from headerBlocksByRId (for multi-section documents)
    // These headers may not be in headerBlocks but still need to prevent body overlap
    if (hasHeaderBlocksByRId && headerFooter.headerBlocksByRId) {
      for (const [_rId, blocks] of headerFooter.headerBlocksByRId) {
        if (!blocks || blocks.length === 0) continue;
        // Measure blocks to get height
        const measureConstraints = {
          maxWidth: headerFooter.constraints.width,
          maxHeight: headerFooter.constraints.height,
        };
        const measures = await Promise.all(blocks.map((block) => measureFn(block, measureConstraints)));
        // Layout to get actual height
        const layout = layoutHeaderFooter(blocks, measures, {
          width: headerFooter.constraints.width,
          height: headerFooter.constraints.height,
        });
        if (layout.height > 0) {
          // Store as 'default' if no variant-specific heights exist, or take max
          const currentDefault = headerContentHeights.default ?? 0;
          headerContentHeights.default = Math.max(currentDefault, layout.height);
        }
      }
    }

    const hfPreEnd = performance.now();
    perfLog(`[Perf] 4.1.5 Pre-layout headers for height: ${(hfPreEnd - hfPreStart).toFixed(2)}ms`);
  }

  // Pre-layout footers to get their actual content heights BEFORE body layout.
  // This prevents footer content from overlapping with body content when footers
  // exceed their allocated margin space.
  /**
   * Actual measured footer content heights per variant type extracted from pre-layout.
   * Keys correspond to footer variant types: 'default', 'first', 'even', 'odd'.
   * Values are the actual content heights in pixels, guaranteed to be finite and non-negative.
   * Undefined if footer pre-layout fails or footers are not present.
   */
  let footerContentHeights: Partial<Record<'default' | 'first' | 'even' | 'odd', number>> | undefined;

  // Check if we have footers via either footerBlocks (by variant) or footerBlocksByRId (by relationship ID)
  const hasFooterBlocks = headerFooter?.footerBlocks && Object.keys(headerFooter.footerBlocks).length > 0;
  const hasFooterBlocksByRId = headerFooter?.footerBlocksByRId && headerFooter.footerBlocksByRId.size > 0;

  if (headerFooter?.constraints && (hasFooterBlocks || hasFooterBlocksByRId)) {
    const footerPreStart = performance.now();
    const measureFn = headerFooter.measure ?? measureBlock;

    // Cache invalidation already happened during header pre-layout (if headers exist)
    // or needs to happen now if only footers are present
    if (!hasHeaderBlocks && !hasHeaderBlocksByRId) {
      invalidateHeaderFooterCache(
        headerMeasureCache,
        headerFooterCacheState,
        headerFooter.headerBlocks,
        headerFooter.footerBlocks,
        headerFooter.constraints,
        options.sectionMetadata,
      );
    }

    /**
     * Placeholder page count used during footer pre-layout for height measurement.
     * The actual page count is not yet known at this stage, but it doesn't affect
     * footer height calculations. A value of 1 is sufficient as a placeholder.
     */
    const FOOTER_PRELAYOUT_PLACEHOLDER_PAGE_COUNT = 1;

    /**
     * Type guard to check if a key is a valid footer variant type.
     * Ensures type safety when extracting footer heights from the pre-layout results.
     *
     * @param key - The key to validate
     * @returns True if the key is one of the valid footer variant types
     */
    type FooterVariantType = 'default' | 'first' | 'even' | 'odd';
    const isValidFooterType = (key: string): key is FooterVariantType => {
      return ['default', 'first', 'even', 'odd'].includes(key);
    };

    footerContentHeights = {};

    try {
      // Extract heights from footerBlocks (by variant)
      if (hasFooterBlocks && headerFooter.footerBlocks) {
        const preFooterLayouts = await layoutHeaderFooterWithCache(
          headerFooter.footerBlocks,
          headerFooter.constraints,
          measureFn,
          headerMeasureCache,
          FOOTER_PRELAYOUT_PLACEHOLDER_PAGE_COUNT,
          undefined, // No page resolver needed for height calculation
        );

        // Extract actual content heights from each variant
        for (const [type, value] of Object.entries(preFooterLayouts)) {
          if (!isValidFooterType(type)) continue;
          if (value?.layout && typeof value.layout.height === 'number') {
            const height = value.layout.height;
            if (Number.isFinite(height) && height >= 0) {
              footerContentHeights[type] = height;
            }
          }
        }
      }

      // Also extract heights from footerBlocksByRId (for multi-section documents)
      if (hasFooterBlocksByRId && headerFooter.footerBlocksByRId) {
        for (const [_rId, blocks] of headerFooter.footerBlocksByRId) {
          if (!blocks || blocks.length === 0) continue;
          // Measure blocks to get height
          const measureConstraints = {
            maxWidth: headerFooter.constraints.width,
            maxHeight: headerFooter.constraints.height,
          };
          const measures = await Promise.all(blocks.map((block) => measureFn(block, measureConstraints)));
          // Layout to get actual height
          const layout = layoutHeaderFooter(blocks, measures, {
            width: headerFooter.constraints.width,
            height: headerFooter.constraints.height,
          });
          if (layout.height > 0) {
            // Store as 'default' if no variant-specific heights exist, or take max
            const currentDefault = footerContentHeights.default ?? 0;
            footerContentHeights.default = Math.max(currentDefault, layout.height);
          }
        }
      }
    } catch (error) {
      console.error('[Layout] Footer pre-layout failed:', error);
      footerContentHeights = undefined;
    }

    const footerPreEnd = performance.now();
    perfLog(`[Perf] 4.1.6 Pre-layout footers for height: ${(footerPreEnd - footerPreStart).toFixed(2)}ms`);
  }

  const layoutStart = performance.now();
  let layout = layoutDocument(nextBlocks, measures, {
    ...options,
    headerContentHeights, // Pass header heights to prevent overlap
    footerContentHeights, // Pass footer heights to prevent overlap
    remeasureParagraph: (block: FlowBlock, maxWidth: number, firstLineIndent?: number) =>
      remeasureParagraph(block as ParagraphBlock, maxWidth, firstLineIndent),
  });
  const layoutEnd = performance.now();
  perfLog(`[Perf] 4.2 Layout document (pagination): ${(layoutEnd - layoutStart).toFixed(2)}ms`);

  // Two-pass convergence loop for page number token resolution.
  // Steps: paginate -> build numbering context -> resolve PAGE/NUMPAGES tokens
  //        -> remeasure affected blocks -> re-paginate -> repeat until stable
  const maxIterations = 3;
  let currentBlocks = nextBlocks;
  let currentMeasures = measures;
  let iteration = 0;

  const pageTokenStart = performance.now();
  let totalAffectedBlocks = 0;
  let totalRemeasureTime = 0;
  let totalRelayoutTime = 0;
  let converged = true;

  // Only run token resolution if feature flag is enabled
  if (FeatureFlags.BODY_PAGE_TOKENS) {
    while (iteration < maxIterations) {
      // Build numbering context from current layout
      const sections = options.sectionMetadata ?? [];
      const numberingCtx = buildNumberingContext(layout, sections);

      // Log iteration start
      PageTokenLogger.logIterationStart(iteration, layout.pages.length);

      // Resolve page number tokens
      const tokenResult = resolvePageNumberTokens(layout, currentBlocks, currentMeasures, numberingCtx);

      // Check for convergence
      if (tokenResult.affectedBlockIds.size === 0) {
        perfLog(`[Perf] 4.3 Page token resolution converged after ${iteration} iterations`);
        break;
      }

      perfLog(`[Perf] 4.3.${iteration + 1} Page tokens resolved: ${tokenResult.affectedBlockIds.size} blocks affected`);

      // Log affected blocks
      const blockSamples = Array.from(tokenResult.affectedBlockIds).slice(0, 5) as string[];
      PageTokenLogger.logAffectedBlocks(iteration, tokenResult.affectedBlockIds, blockSamples);

      totalAffectedBlocks += tokenResult.affectedBlockIds.size;

      // Apply updated blocks
      currentBlocks = currentBlocks.map((block) => tokenResult.updatedBlocks.get(block.id) ?? block);

      // Invalidate cache for affected blocks
      measureCache.invalidate(Array.from(tokenResult.affectedBlockIds));

      // Re-measure affected blocks
      const remeasureStart = performance.now();
      currentMeasures = await remeasureAffectedBlocks(
        currentBlocks,
        currentMeasures,
        tokenResult.affectedBlockIds,
        constraints,
        measureBlock,
      );
      const remeasureEnd = performance.now();
      const remeasureTime = remeasureEnd - remeasureStart;
      totalRemeasureTime += remeasureTime;
      perfLog(`[Perf] 4.3.${iteration + 1}.1 Re-measure: ${remeasureTime.toFixed(2)}ms`);
      PageTokenLogger.logRemeasure(tokenResult.affectedBlockIds.size, remeasureTime);

      // Check if page count has stabilized
      const oldPageCount = layout.pages.length;

      // Re-run pagination with updated measures
      const relayoutStart = performance.now();
      layout = layoutDocument(currentBlocks, currentMeasures, {
        ...options,
        headerContentHeights, // Pass header heights to prevent overlap
        footerContentHeights, // Pass footer heights to prevent overlap
        remeasureParagraph: (block: FlowBlock, maxWidth: number, firstLineIndent?: number) =>
          remeasureParagraph(block as ParagraphBlock, maxWidth, firstLineIndent),
      });
      const relayoutEnd = performance.now();
      const relayoutTime = relayoutEnd - relayoutStart;
      totalRelayoutTime += relayoutTime;
      perfLog(`[Perf] 4.3.${iteration + 1}.2 Re-layout: ${relayoutTime.toFixed(2)}ms`);

      const newPageCount = layout.pages.length;

      // Early exit if page count is stable (common case: no change or minor text adjustment)
      if (newPageCount === oldPageCount && iteration > 0) {
        perfLog(`[Perf] 4.3 Page count stable at ${newPageCount} - breaking convergence loop`);
        break;
      }

      iteration++;
    }

    if (iteration >= maxIterations) {
      converged = false;
      console.warn(
        `[incrementalLayout] Page token resolution did not converge after ${maxIterations} iterations - stopping`,
      );
    }
  }

  const pageTokenEnd = performance.now();
  const totalTokenTime = pageTokenEnd - pageTokenStart;

  if (iteration > 0) {
    perfLog(`[Perf] 4.3 Total page token resolution time: ${totalTokenTime.toFixed(2)}ms`);

    // Log convergence status
    PageTokenLogger.logConvergence(iteration, converged, totalTokenTime);

    // Record metrics for monitoring
    globalMetrics.recordPageTokenMetrics({
      totalTimeMs: totalTokenTime,
      iterations: iteration,
      affectedBlocks: totalAffectedBlocks,
      remeasureTimeMs: totalRemeasureTime,
      relayoutTimeMs: totalRelayoutTime,
      converged,
    });
  }

  let headers: HeaderFooterLayoutResult[] | undefined;
  let footers: HeaderFooterLayoutResult[] | undefined;

  if (headerFooter?.constraints && (headerFooter.headerBlocks || headerFooter.footerBlocks)) {
    const hfStart = performance.now();

    const measureFn = headerFooter.measure ?? measureBlock;

    // Invalidate header/footer cache if content or constraints changed
    invalidateHeaderFooterCache(
      headerMeasureCache,
      headerFooterCacheState,
      headerFooter.headerBlocks,
      headerFooter.footerBlocks,
      headerFooter.constraints,
      options.sectionMetadata,
    );

    // Build numbering context from final layout for header/footer token resolution
    const sections = options.sectionMetadata ?? [];
    const numberingCtx = buildNumberingContext(layout, sections);

    // Create page resolver for section-aware header/footer numbering
    // Only use page resolver if feature flag is enabled
    const pageResolver = FeatureFlags.HEADER_FOOTER_PAGE_TOKENS
      ? (pageNumber: number): { displayText: string; totalPages: number } => {
          const pageIndex = pageNumber - 1;
          const displayInfo = numberingCtx.displayPages[pageIndex];
          return {
            displayText: displayInfo?.displayText ?? String(pageNumber),
            totalPages: numberingCtx.totalPages,
          };
        }
      : undefined;

    if (headerFooter.headerBlocks) {
      const headerLayouts = await layoutHeaderFooterWithCache(
        headerFooter.headerBlocks,
        headerFooter.constraints,
        measureFn,
        headerMeasureCache,
        FeatureFlags.HEADER_FOOTER_PAGE_TOKENS ? undefined : numberingCtx.totalPages, // Fallback for backward compat
        pageResolver, // Use page resolver for section-aware numbering
      );
      headers = serializeHeaderFooterResults('header', headerLayouts);
    }
    if (headerFooter.footerBlocks) {
      const footerLayouts = await layoutHeaderFooterWithCache(
        headerFooter.footerBlocks,
        headerFooter.constraints,
        measureFn,
        headerMeasureCache,
        FeatureFlags.HEADER_FOOTER_PAGE_TOKENS ? undefined : numberingCtx.totalPages, // Fallback for backward compat
        pageResolver, // Use page resolver for section-aware numbering
      );
      footers = serializeHeaderFooterResults('footer', footerLayouts);
    }

    const hfEnd = performance.now();
    perfLog(`[Perf] 4.4 Header/footer layout: ${(hfEnd - hfStart).toFixed(2)}ms`);

    // Record header/footer cache metrics
    const cacheStats = headerMeasureCache.getStats();
    globalMetrics.recordHeaderFooterCacheMetrics(cacheStats);
    HeaderFooterCacheLogger.logStats(cacheStats);
  }

  return {
    layout,
    measures: currentMeasures,
    dirty,
    headers,
    footers,
  };
}

const DEFAULT_PAGE_SIZE = { w: 612, h: 792 };
const DEFAULT_MARGINS = { top: 72, right: 72, bottom: 72, left: 72 };

/**
 * Normalizes a margin value, using a fallback for undefined or non-finite values.
 * Prevents NaN content sizes when margin properties are partially defined.
 *
 * @param value - The margin value to normalize (may be undefined)
 * @param fallback - The default margin value to use if value is invalid
 * @returns The normalized margin value (guaranteed to be finite)
 */
export const normalizeMargin = (value: number | undefined, fallback: number): number =>
  Number.isFinite(value) ? (value as number) : fallback;

/**
 * Resolves the maximum measurement constraints (width and height) needed for measuring blocks
 * across all sections in a document.
 *
 * This function scans the entire document (including all section breaks) to determine the
 * widest column configuration and tallest content area that will be encountered during layout.
 * All blocks must be measured at these maximum constraints to ensure they fit correctly when
 * placed in any section, preventing remeasurement during pagination.
 *
 * Why maximum constraints are needed:
 * - Documents can have multiple sections with different page sizes, margins, and column counts
 * - Each section may have a different effective column width (e.g., 2 columns vs 3 columns)
 * - Blocks measured too narrow will overflow when placed in wider sections
 * - Blocks measured at maximum width will fit in all sections (may have extra space in narrower ones)
 *
 * Algorithm:
 * 1. Start with base content width/height from options.pageSize and options.margins
 * 2. Calculate base column width from options.columns (if multi-column)
 * 3. Scan all sectionBreak blocks to find maximum column width and content height
 * 4. For each section: compute content area, calculate column width, track maximum
 * 5. Return the widest column width and tallest content height found
 *
 * Column width calculation:
 * - Single column: contentWidth (no gap subtraction)
 * - Multi-column: (contentWidth - totalGap) / columnCount
 * - Total gap = gap * (columnCount - 1)
 *
 * @param options - Layout options containing default page size, margins, and columns
 * @param blocks - Optional array of flow blocks to scan for section breaks
 *   If not provided, only base constraints from options are used
 * @returns Object containing:
 *   - measurementWidth: Maximum column width in pixels (guaranteed positive)
 *   - measurementHeight: Maximum content height in pixels (guaranteed positive)
 *
 * @throws Error if resolved constraints are non-positive (indicates invalid configuration)
 *
 * @example
 * ```typescript
 * // Document with two sections: single column and 2-column
 * const options = {
 *   pageSize: { w: 612, h: 792 }, // Letter size
 *   margins: { top: 72, right: 72, bottom: 72, left: 72 },
 *   columns: { count: 1, gap: 0 }
 * };
 * const blocks = [
 *   // ... content blocks ...
 *   {
 *     kind: 'sectionBreak',
 *     columns: { count: 2, gap: 48 },
 *     // ... other section properties ...
 *   }
 * ];
 * const constraints = resolveMeasurementConstraints(options, blocks);
 * // Returns: { measurementWidth: 468, measurementHeight: 648 }
 * // 468px = (612 - 72 - 72) width, single column (wider than 2-column: 234px)
 * // All blocks measured at 468px will fit in both sections
 * ```
 */
export function resolveMeasurementConstraints(
  options: LayoutOptions,
  blocks?: FlowBlock[],
): {
  measurementWidth: number;
  measurementHeight: number;
} {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const margins = {
    top: normalizeMargin(options.margins?.top, DEFAULT_MARGINS.top),
    right: normalizeMargin(options.margins?.right, DEFAULT_MARGINS.right),
    bottom: normalizeMargin(options.margins?.bottom, DEFAULT_MARGINS.bottom),
    left: normalizeMargin(options.margins?.left, DEFAULT_MARGINS.left),
  };
  const baseContentWidth = pageSize.w - (margins.left + margins.right);
  const baseContentHeight = pageSize.h - (margins.top + margins.bottom);

  const computeColumnWidth = (contentWidth: number, columns?: { count: number; gap?: number }): number => {
    if (!columns || columns.count <= 1) return contentWidth;
    const gap = Math.max(0, columns.gap ?? 0);
    const totalGap = gap * (columns.count - 1);
    return (contentWidth - totalGap) / columns.count;
  };

  let measurementWidth = computeColumnWidth(baseContentWidth, options.columns);
  let measurementHeight = baseContentHeight;

  if (blocks && blocks.length > 0) {
    for (const block of blocks) {
      if (block.kind !== 'sectionBreak') continue;
      const sectionPageSize = block.pageSize ?? pageSize;
      const sectionMargins = {
        top: normalizeMargin(block.margins?.top, margins.top),
        right: normalizeMargin(block.margins?.right, margins.right),
        bottom: normalizeMargin(block.margins?.bottom, margins.bottom),
        left: normalizeMargin(block.margins?.left, margins.left),
      };
      const contentWidth = sectionPageSize.w - (sectionMargins.left + sectionMargins.right);
      const contentHeight = sectionPageSize.h - (sectionMargins.top + sectionMargins.bottom);
      if (contentWidth <= 0 || contentHeight <= 0) continue;
      const columnWidth = computeColumnWidth(contentWidth, block.columns ?? options.columns);
      if (columnWidth > measurementWidth) {
        measurementWidth = columnWidth;
      }
      if (contentHeight > measurementHeight) {
        measurementHeight = contentHeight;
      }
    }
  }

  return {
    measurementWidth,
    measurementHeight,
  };
}

const serializeHeaderFooterResults = (
  kind: 'header' | 'footer',
  batch: Awaited<ReturnType<typeof layoutHeaderFooterWithCache>>,
): HeaderFooterLayoutResult[] => {
  const results: HeaderFooterLayoutResult[] = [];
  Object.entries(batch).forEach(([type, value]) => {
    if (!value) return;
    results.push({
      kind,
      type: type as keyof HeaderFooterBatch,
      layout: value.layout,
      blocks: value.blocks,
      measures: value.measures,
    });
  });
  return results;
};

/**
 * Builds numbering context from layout and section metadata.
 *
 * Creates display page information for each page using section-aware numbering
 * (restart, format, etc.). This context is used for page token resolution.
 *
 * @param layout - Current layout with pages
 * @param sections - Section metadata array
 * @returns Numbering context with total pages and display page info
 */
function buildNumberingContext(layout: Layout, sections: SectionMetadata[]): NumberingContext {
  const totalPages = layout.pages.length;
  const displayPages = computeDisplayPageNumber(layout.pages, sections);

  return {
    totalPages,
    displayPages,
  };
}

/**
 * Re-measures affected blocks after token resolution.
 *
 * For each affected block, re-measures it using the measureBlock function
 * and updates the measures array. Unaffected blocks keep their cached measurements.
 *
 * @param blocks - Current blocks array (with resolved tokens)
 * @param measures - Current measures array (parallel to blocks)
 * @param affectedBlockIds - Set of block IDs that need re-measurement
 * @param constraints - Measurement constraints (width, height)
 * @param measureBlock - Function to measure a block
 * @returns Updated measures array with re-measured blocks
 */
async function remeasureAffectedBlocks(
  blocks: FlowBlock[],
  measures: Measure[],
  affectedBlockIds: Set<string>,
  constraints: { maxWidth: number; maxHeight: number },
  measureBlock: (block: FlowBlock, constraints: { maxWidth: number; maxHeight: number }) => Promise<Measure>,
): Promise<Measure[]> {
  const updatedMeasures: Measure[] = [...measures];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Only re-measure affected blocks
    if (!affectedBlockIds.has(block.id)) {
      continue;
    }

    try {
      // Re-measure the block
      const newMeasure = await measureBlock(block, constraints);

      // Update in the measures array
      updatedMeasures[i] = newMeasure;

      // Cache the new measurement
      measureCache.set(block, constraints.maxWidth, constraints.maxHeight, newMeasure);
    } catch (error) {
      // Error handling per plan: log warning, keep prior layout for block
      console.warn(`[incrementalLayout] Failed to re-measure block ${block.id} after token resolution:`, error);
      // Keep the old measure - don't update updatedMeasures[i]
    }
  }

  return updatedMeasures;
}
