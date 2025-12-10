import type {
  FlowBlock,
  Layout,
  Measure,
  Fragment,
  DrawingFragment,
  ImageFragment,
  Run,
  Line,
  TableFragment,
  TableBlock,
  TableMeasure,
  ParagraphBlock,
  ParagraphMeasure,
} from '@superdoc/contracts';
import { charOffsetToPm, findCharacterAtX, measureCharacterX } from './text-measurement.js';
import { clickToPositionDom } from './dom-mapping.js';

export type { HeaderFooterType } from '@superdoc/contracts';
export {
  extractIdentifierFromConverter,
  getHeaderFooterType,
  defaultHeaderFooterIdentifier,
  resolveHeaderFooterForPage,
  // Multi-section header/footer support
  buildMultiSectionIdentifier,
  defaultMultiSectionIdentifier,
  getHeaderFooterTypeForSection,
  getHeaderFooterIdForPage,
  resolveHeaderFooterForPageAndSection,
} from './headerFooterUtils';
export type {
  HeaderFooterIdentifier,
  MultiSectionHeaderFooterIdentifier,
  SectionHeaderFooterIds,
} from './headerFooterUtils';
export {
  layoutHeaderFooterWithCache,
  type HeaderFooterBatchResult,
  getBucketForPageNumber,
  getBucketRepresentative,
} from './layoutHeaderFooter';
export type { HeaderFooterBatch, DigitBucket } from './layoutHeaderFooter';
export { findWordBoundaries, findParagraphBoundaries } from './text-boundaries';
export type { BoundaryRange } from './text-boundaries';
export { incrementalLayout, measureCache } from './incrementalLayout';
export type { HeaderFooterLayoutResult } from './incrementalLayout';
// Re-export computeDisplayPageNumber from layout-engine for section-aware page numbering
export { computeDisplayPageNumber, type DisplayPageInfo } from '../../layout-engine/src/index';
export { remeasureParagraph } from './remeasure';
export { measureCharacterX } from './text-measurement';
export { clickToPositionDom } from './dom-mapping';
export { LayoutVersionManager } from './layout-version-manager';
export type { VersionedLayoutState, LayoutVersionMetrics } from './layout-version-manager';
export { LayoutVersionLogger, LayoutVersionMetricsCollector, globalLayoutVersionMetrics } from './instrumentation';
export type { LayoutVersionTelemetry } from './instrumentation';

// Font Metrics Cache
export { FontMetricsCache } from './font-metrics-cache';
export type { FontMetrics, FontMetricsCacheConfig } from './font-metrics-cache';

// Paragraph Line Cache
export { ParagraphLineCache } from './paragraph-line-cache';
export type { LineInfo, ParagraphLines } from './paragraph-line-cache';

// Cursor Renderer
export { CursorRenderer } from './cursor-renderer';
export type { CursorRendererOptions, CursorRect } from './cursor-renderer';

// Local Paragraph Layout
export { LocalParagraphLayout } from './local-paragraph-layout';
export type { LocalLayoutResult, TextRun } from './local-paragraph-layout';

// PM DOM Fallback
export { PmDomFallback } from './pm-dom-fallback';
export type { PageTransform, PmEditorView } from './pm-dom-fallback';

// Layout Scheduler
export { LayoutScheduler, Priority } from './layout-scheduler';
export type { LayoutRequest, ScheduledTask, TaskStatus, QueueStats } from './layout-scheduler';

// Layout Coordinator
export { LayoutCoordinator } from './layout-coordinator';
export type { LayoutResult, P0Executor, P1Executor, WorkerExecutor, LayoutCoordinatorDeps } from './layout-coordinator';

// Layout Worker Manager
export { LayoutWorkerManager } from './layout-worker';
export type { SerializedDoc, Range, WorkerMessage, WorkerResult, WorkerLayoutResult } from './layout-worker';

// DOM Reconciler
export { DomReconciler } from './dom-reconciler';
export type { ReconciliationResult } from './dom-reconciler';

// Layout Pipeline
export { LayoutPipeline } from './layout-pipeline';
export type { Transaction, LayoutPipelineConfig } from './layout-pipeline';

// Dirty Tracker
export { DirtyTracker } from './dirty-tracker';
export type { DirtyRange } from './dirty-tracker';

// Debounced Pass Manager
export { DebouncedPassManager } from './debounced-passes';
export type { DebouncedPass } from './debounced-passes';

// PM Position Validator
export { PmPositionValidator } from './pm-position-validator';
export type { ValidationResult, ValidationError } from './pm-position-validator';

// IME Handler
export { ImeHandler } from './ime-handler';
export type { ImeState } from './ime-handler';

// Table Handler
export { TableHandler } from './table-handler';
export type { TableLayoutState } from './table-handler';

// Track Changes Handler
export { TrackChangesHandler } from './track-changes-handler';
export type { TrackChangeSpan } from './track-changes-handler';

// Cache Warmer
export { CacheWarmer } from './cache-warmer';
export type { WarmingConfig, ParagraphWarmInfo } from './cache-warmer';

// Performance Metrics
export { PerformanceMetricsCollector, perfMetrics } from './performance-metrics';
export type { MetricSample, MetricSummary, TypingPerfMetrics, BudgetViolation } from './performance-metrics';

// Safety Net
export { SafetyNet } from './safety-net';
export type { FallbackReason, SafetyConfig } from './safety-net';

// Focus Watchdog
export { FocusWatchdog } from './focus-watchdog';
export type { FocusWatchdogConfig } from './focus-watchdog';

// Benchmarks
export { TypingPerfBenchmark } from './benchmarks';
export type { BenchmarkResult, BenchmarkScenario } from './benchmarks';

// Drag Handler
export { DragHandler, createDragHandler } from './drag-handler';
export type {
  FieldAnnotationDragData,
  DragStartEvent,
  DropEvent,
  DragOverEvent,
  DragStartCallback,
  DropCallback,
  DragOverCallback,
  DragEndCallback,
  DragHandlerConfig,
} from './drag-handler';

export type Point = { x: number; y: number };
export type PageHit = { pageIndex: number; page: Layout['pages'][number] };
export type FragmentHit = {
  fragment: Fragment;
  block: FlowBlock;
  measure: Measure;
  pageIndex: number;
  pageY: number;
};

export type PositionHit = {
  pos: number;
  blockId: string;
  pageIndex: number;
  column: number;
  lineIndex: number;
};

export type Rect = { x: number; y: number; width: number; height: number; pageIndex: number };

type AtomicFragment = DrawingFragment | ImageFragment;

const isAtomicFragment = (fragment: Fragment): fragment is AtomicFragment => {
  return fragment.kind === 'drawing' || fragment.kind === 'image';
};

/**
 * Click mapping telemetry for tracking DOM vs geometry mapping usage.
 * Exposed for performance monitoring and optimization decisions.
 */
export interface ClickMappingTelemetry {
  /** Total click mappings attempted */
  total: number;
  /** Successful DOM-based mappings */
  domSuccess: number;
  /** Successful geometry-based mappings */
  geometrySuccess: number;
  /** Failed mappings (returned null) */
  failed: number;
}

/**
 * Global click mapping telemetry instance.
 * Reset this periodically to avoid unbounded growth.
 */
export const clickMappingTelemetry: ClickMappingTelemetry = {
  total: 0,
  domSuccess: 0,
  geometrySuccess: 0,
  failed: 0,
};

/**
 * Resets click mapping telemetry counters.
 */
export function resetClickMappingTelemetry(): void {
  clickMappingTelemetry.total = 0;
  clickMappingTelemetry.domSuccess = 0;
  clickMappingTelemetry.geometrySuccess = 0;
  clickMappingTelemetry.failed = 0;
}

const logClickStage = (_level: 'log' | 'warn' | 'error', _stage: string, _payload: Record<string, unknown>) => {
  // No-op in production. Enable for debugging click-to-position mapping.
};

const SELECTION_DEBUG_ENABLED = false;
const logSelectionDebug = (payload: Record<string, unknown>): void => {
  if (!SELECTION_DEBUG_ENABLED) return;
  try {
    console.log('[SELECTION-DEBUG]', JSON.stringify(payload));
  } catch {
    console.log('[SELECTION-DEBUG]', payload);
  }
};

/**
 * Debug flag for DOM and geometry position mapping.
 * Set to true to enable detailed logging of click-to-position operations.
 * WARNING: Should be false in production to avoid performance degradation.
 */
const DEBUG_POSITION_MAPPING = false;

/**
 * Logs position mapping debug information when DEBUG_POSITION_MAPPING is enabled.
 * @param payload - Debug data to log
 */
const logPositionDebug = (payload: Record<string, unknown>): void => {
  if (!DEBUG_POSITION_MAPPING) return;
  try {
    console.log('[CLICK-POS]', JSON.stringify(payload));
  } catch {
    console.log('[CLICK-POS]', payload);
  }
};

/**
 * Logs selection mapping debug information when DEBUG_POSITION_MAPPING is enabled.
 * @param payload - Debug data to log
 */
const logSelectionMapDebug = (payload: Record<string, unknown>): void => {
  if (!DEBUG_POSITION_MAPPING) return;
  try {
    console.log('[SELECTION-MAP]', JSON.stringify(payload));
  } catch {
    console.log('[SELECTION-MAP]', payload);
  }
};

/**
 * Extracts text content from a specific line within a paragraph block.
 *
 * This function concatenates text from all runs that contribute to the specified line,
 * handling partial runs at line boundaries and filtering out non-text runs (images, breaks).
 *
 * @param block - The flow block to extract text from (must be a paragraph block)
 * @param line - The line specification including run range (fromRun to toRun) and character offsets
 * @returns The complete text content of the line, or empty string if block is not a paragraph
 *
 * @example
 * ```typescript
 * // Line spanning runs [0, 1] with partial text from first and last run
 * const text = buildLineText(paragraphBlock, line);
 * // Returns: "Hello world" (combining partial run text)
 * ```
 */
const buildLineText = (block: FlowBlock, line: Line): string => {
  if (block.kind !== 'paragraph') return '';
  let text = '';
  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run || 'src' in run || run.kind === 'lineBreak' || run.kind === 'break' || run.kind === 'fieldAnnotation')
      continue;
    const runText = run.text ?? '';
    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;
    const start = isFirstRun ? line.fromChar : 0;
    const end = isLastRun ? line.toChar : runText.length;
    text += runText.slice(start, end);
  }
  return text;
};

const blockPmRangeFromAttrs = (block: FlowBlock): { pmStart?: number; pmEnd?: number } => {
  const attrs = (block as { attrs?: Record<string, unknown> })?.attrs;
  const pmStart = typeof attrs?.pmStart === 'number' ? attrs.pmStart : undefined;
  const pmEnd = typeof attrs?.pmEnd === 'number' ? attrs.pmEnd : pmStart != null ? pmStart + 1 : undefined;
  return { pmStart, pmEnd };
};

const getAtomicPmRange = (fragment: AtomicFragment, block: FlowBlock): { pmStart?: number; pmEnd?: number } => {
  const pmStart = typeof fragment.pmStart === 'number' ? fragment.pmStart : blockPmRangeFromAttrs(block).pmStart;
  const pmEnd = typeof fragment.pmEnd === 'number' ? fragment.pmEnd : blockPmRangeFromAttrs(block).pmEnd;
  return { pmStart, pmEnd };
};

const rangesOverlap = (startA: number | undefined, endA: number | undefined, startB: number, endB: number): boolean => {
  if (startA == null) return false;
  const effectiveEndA = endA ?? startA + 1;
  return effectiveEndA > startB && startA < endB;
};

/**
 * Find the page hit given layout and a coordinate relative to the layout container.
 * Accounts for gaps between pages when calculating page boundaries.
 */
export function hitTestPage(layout: Layout, point: Point): PageHit | null {
  const pageGap = layout.pageGap ?? 0;
  let cursorY = 0;
  for (let pageIndex = 0; pageIndex < layout.pages.length; pageIndex += 1) {
    const page = layout.pages[pageIndex];
    const top = cursorY;
    const bottom = top + layout.pageSize.h;
    if (point.y >= top && point.y < bottom) {
      return { pageIndex, page };
    }
    // Add gap after each page (gap appears between pages)
    cursorY = bottom + pageGap;
  }
  return null;
}

/**
 * Hit-test fragments within a page for a given point (page-relative coordinates).
 */
export function hitTestFragment(
  layout: Layout,
  pageHit: PageHit,
  blocks: FlowBlock[],
  measures: Measure[],
  point: Point,
): FragmentHit | null {
  const fragments = [...pageHit.page.fragments].sort((a, b) => {
    const ay = a.kind === 'para' ? a.y : 0;
    const by = b.kind === 'para' ? b.y : 0;
    if (Math.abs(ay - by) > 0.5) return ay - by;
    const ax = a.kind === 'para' ? a.x : 0;
    const bx = b.kind === 'para' ? b.x : 0;
    return ax - bx;
  });

  for (const fragment of fragments) {
    if (fragment.kind !== 'para') continue;
    const blockIndex = findBlockIndexByFragmentId(blocks, fragment.blockId);
    if (blockIndex === -1) continue;
    const block = blocks[blockIndex];
    const measure = measures[blockIndex];
    if (!block || block.kind !== 'paragraph' || measure?.kind !== 'paragraph') continue;

    // Calculate fragment's actual height from its lines, not measure.totalHeight
    const fragmentHeight = measure.lines
      .slice(fragment.fromLine, fragment.toLine)
      .reduce((sum, line) => sum + line.lineHeight, 0);

    const withinX = point.x >= fragment.x && point.x <= fragment.x + fragment.width;
    const withinY = point.y >= fragment.y && point.y <= fragment.y + fragmentHeight;
    if (!withinX || !withinY) {
      continue;
    }

    return {
      fragment,
      block,
      measure,
      pageIndex: pageHit.pageIndex,
      pageY: point.y - fragment.y,
    };
  }

  return null;
}

const hitTestAtomicFragment = (
  pageHit: PageHit,
  blocks: FlowBlock[],
  measures: Measure[],
  point: Point,
): FragmentHit | null => {
  for (const fragment of pageHit.page.fragments) {
    if (!isAtomicFragment(fragment)) continue;
    const withinX = point.x >= fragment.x && point.x <= fragment.x + fragment.width;
    const withinY = point.y >= fragment.y && point.y <= fragment.y + fragment.height;
    if (!withinX || !withinY) continue;

    const blockIndex = findBlockIndexByFragmentId(blocks, fragment.blockId);
    if (blockIndex === -1) continue;
    const block = blocks[blockIndex];
    const measure = measures[blockIndex];
    if (!block || !measure) continue;

    return {
      fragment,
      block,
      measure,
      pageIndex: pageHit.pageIndex,
      pageY: 0,
    };
  }
  return null;
};

/**
 * Type for table hit test result containing cell and paragraph info
 */
type TableHitResult = {
  fragment: TableFragment;
  block: TableBlock;
  measure: TableMeasure;
  pageIndex: number;
  cellRowIndex: number;
  cellColIndex: number;
  cellBlock: ParagraphBlock;
  cellMeasure: ParagraphMeasure;
  localX: number;
  localY: number;
};

/**
 * Hit-test table fragments to find the cell and paragraph at a click point.
 *
 * This function performs a multi-stage spatial lookup to map a 2D coordinate to a specific
 * paragraph within a table cell. The algorithm handles:
 * - Tables that span multiple pages (via fragments)
 * - Cells containing multiple paragraph blocks
 * - Vertical positioning within cells with padding
 * - Edge cases where clicks fall outside exact cell boundaries
 *
 * Algorithm:
 * 1. Iterate through all table fragments on the page
 * 2. Check if the point falls within the fragment's bounding box
 * 3. Find the corresponding table block and measure from the document structure
 * 4. Locate the row by accumulating row heights
 * 5. Locate the column by accumulating cell widths
 * 6. Within the cell, iterate through paragraph blocks and select the one containing the Y coordinate
 * 7. Return the paragraph block, its measure, and the local coordinates within that paragraph
 *
 * Multi-paragraph selection: When a cell contains multiple paragraphs, the function calculates
 * the vertical offset of each paragraph block and selects the one whose vertical span contains
 * the click point. If the click is below all paragraphs, the last paragraph is selected.
 *
 * @param pageHit - The page hit result containing the page and fragments
 * @param blocks - The complete array of flow blocks in the document
 * @param measures - The complete array of layout measures corresponding to the blocks
 * @param point - The 2D coordinate to hit-test (in page coordinate space)
 * @returns TableHitResult containing the fragment, block, measure, cell indices, paragraph, and local coordinates,
 *          or null if no table fragment contains the point or the cell data is invalid
 *
 * Edge cases handled:
 * - Empty tables with no rows or cells
 * - Clicks outside cell boundaries (clamped to nearest cell)
 * - Cells with no paragraph blocks
 * - Mismatched block and measure arrays
 * - Invalid cell padding values
 */
const hitTestTableFragment = (
  pageHit: PageHit,
  blocks: FlowBlock[],
  measures: Measure[],
  point: Point,
): TableHitResult | null => {
  for (const fragment of pageHit.page.fragments) {
    if (fragment.kind !== 'table') continue;

    const tableFragment = fragment as TableFragment;
    const withinX = point.x >= tableFragment.x && point.x <= tableFragment.x + tableFragment.width;
    const withinY = point.y >= tableFragment.y && point.y <= tableFragment.y + tableFragment.height;
    if (!withinX || !withinY) continue;

    const blockIndex = blocks.findIndex((block) => block.id === tableFragment.blockId);
    if (blockIndex === -1) continue;

    const block = blocks[blockIndex];
    const measure = measures[blockIndex];
    if (!block || block.kind !== 'table' || !measure || measure.kind !== 'table') continue;

    const tableBlock = block as TableBlock;
    const tableMeasure = measure as TableMeasure;

    // Calculate local position within the table fragment
    const localX = point.x - tableFragment.x;
    const localY = point.y - tableFragment.y;

    // Find the row at localY
    let rowY = 0;
    let rowIndex = -1;
    // Bounds check: skip if table has no rows
    if (tableMeasure.rows.length === 0 || tableBlock.rows.length === 0) continue;
    for (let r = tableFragment.fromRow; r < tableFragment.toRow && r < tableMeasure.rows.length; r++) {
      const rowMeasure = tableMeasure.rows[r];
      if (localY >= rowY && localY < rowY + rowMeasure.height) {
        rowIndex = r;
        break;
      }
      rowY += rowMeasure.height;
    }

    if (rowIndex === -1) {
      // Click is below all rows, use the last row
      rowIndex = Math.min(tableFragment.toRow - 1, tableMeasure.rows.length - 1);
      if (rowIndex < tableFragment.fromRow) continue;
    }

    const rowMeasure = tableMeasure.rows[rowIndex];
    const row = tableBlock.rows[rowIndex];
    if (!rowMeasure || !row) continue;

    // Find the column at localX using column widths
    let colX = 0;
    let colIndex = -1;
    // Bounds check: skip if row has no cells
    if (rowMeasure.cells.length === 0 || row.cells.length === 0) continue;
    for (let c = 0; c < rowMeasure.cells.length; c++) {
      const cellMeasure = rowMeasure.cells[c];
      if (localX >= colX && localX < colX + cellMeasure.width) {
        colIndex = c;
        break;
      }
      colX += cellMeasure.width;
    }

    if (colIndex === -1) {
      // Click is to the right of all columns, use the last column
      colIndex = rowMeasure.cells.length - 1;
      if (colIndex < 0) continue;
    }

    const cellMeasure = rowMeasure.cells[colIndex];
    const cell = row.cells[colIndex];
    if (!cellMeasure || !cell) continue;

    // Get the first paragraph block and measure from the cell
    const cellBlocks = cell.blocks ?? (cell.paragraph ? [cell.paragraph] : []);
    // Runtime validation: filter out null/undefined values instead of unsafe cast
    const rawMeasures = cellMeasure.blocks ?? (cellMeasure.paragraph ? [cellMeasure.paragraph] : []);
    const cellBlockMeasures = (Array.isArray(rawMeasures) ? rawMeasures : []).filter(
      (m): m is Measure => m != null && typeof m === 'object' && 'kind' in m,
    );

    // Find a paragraph block in the cell, respecting vertical position when multiple blocks exist
    let blockStartY = 0;
    const getBlockHeight = (m: Measure | undefined): number => {
      if (!m) return 0;
      if ('totalHeight' in m && typeof (m as { totalHeight?: number }).totalHeight === 'number') {
        return (m as { totalHeight: number }).totalHeight;
      }
      if ('height' in m && typeof (m as { height?: number }).height === 'number') {
        return (m as { height: number }).height;
      }
      return 0;
    };

    for (let i = 0; i < cellBlocks.length && i < cellBlockMeasures.length; i++) {
      const cellBlock = cellBlocks[i];
      const cellBlockMeasure = cellBlockMeasures[i];
      if (cellBlock?.kind !== 'paragraph' || cellBlockMeasure?.kind !== 'paragraph') {
        blockStartY += getBlockHeight(cellBlockMeasure);
        continue;
      }

      const blockHeight = getBlockHeight(cellBlockMeasure);
      const blockEndY = blockStartY + blockHeight;

      // Calculate position within the cell (accounting for cell padding)
      const padding = cell.attrs?.padding ?? { top: 2, left: 4, right: 4, bottom: 2 };
      const cellLocalX = localX - colX - (padding.left ?? 4);
      const cellLocalY = localY - rowY - (padding.top ?? 2);
      const paragraphBlock = cellBlock as ParagraphBlock;
      const paragraphMeasure = cellBlockMeasure as ParagraphMeasure;

      // Choose the paragraph whose vertical span contains the click; if none match, fall through to last
      const isWithinBlock = cellLocalY >= blockStartY && cellLocalY < blockEndY;
      const isLastParagraph = i === Math.min(cellBlocks.length, cellBlockMeasures.length) - 1;
      if (isWithinBlock || isLastParagraph) {
        const unclampedLocalY = cellLocalY - blockStartY;
        const localYWithinBlock = Math.max(0, Math.min(unclampedLocalY, Math.max(blockHeight, 0)));
        return {
          fragment: tableFragment,
          block: tableBlock,
          measure: tableMeasure,
          pageIndex: pageHit.pageIndex,
          cellRowIndex: rowIndex,
          cellColIndex: colIndex,
          cellBlock: paragraphBlock,
          cellMeasure: paragraphMeasure,
          localX: Math.max(0, cellLocalX),
          localY: Math.max(0, localYWithinBlock),
        };
      }

      blockStartY = blockEndY;
    }
  }

  return null;
};

/**
 * Map a coordinate click to a ProseMirror position.
 *
 * This function supports two mapping strategies:
 * 1. **DOM-based mapping** (preferred): Uses actual DOM elements with data attributes
 *    for pixel-perfect accuracy. Handles PM position gaps correctly.
 * 2. **Geometry-based mapping** (fallback): Uses layout geometry and text measurement
 *    when DOM is unavailable or mapping fails.
 *
 * To enable DOM mapping, provide the `domContainer` parameter and `clientX`/`clientY`
 * coordinates. The function will attempt DOM mapping first, falling back to geometry
 * if needed.
 *
 * @param layout - The layout data containing pages and fragments
 * @param blocks - Array of flow blocks from the document
 * @param measures - Array of text measurements for the blocks
 * @param containerPoint - Click point in layout container space (for geometry mapping)
 * @param domContainer - Optional DOM container element (enables DOM mapping)
 * @param clientX - Optional client X coordinate (required for DOM mapping)
 * @param clientY - Optional client Y coordinate (required for DOM mapping)
 * @returns Position hit with PM position and metadata, or null if mapping fails
 */
export function clickToPosition(
  layout: Layout,
  blocks: FlowBlock[],
  measures: Measure[],
  containerPoint: Point,
  domContainer?: HTMLElement,
  clientX?: number,
  clientY?: number,
): PositionHit | null {
  clickMappingTelemetry.total++;

  logClickStage('log', 'entry', {
    point: containerPoint,
    pages: layout.pages.length,
    hasDomContainer: domContainer != null,
  });

  // Try DOM-based mapping first if container and coordinates provided
  if (domContainer != null && clientX != null && clientY != null) {
    logClickStage('log', 'dom-attempt', { trying: 'DOM-based mapping' });
    const domPos = clickToPositionDom(domContainer, clientX, clientY);

    if (domPos != null) {
      logPositionDebug({
        origin: 'dom',
        pos: domPos,
        clientX,
        clientY,
      });
      clickMappingTelemetry.domSuccess++;
      // DOM mapping succeeded - we need to construct a PositionHit with metadata
      // Find the block containing this position to get blockId
      let blockId = '';
      let pageIndex = 0;
      let column = 0;
      let lineIndex = -1;

      // Search through layout to find the fragment containing this position
      for (let pi = 0; pi < layout.pages.length; pi++) {
        const page = layout.pages[pi];
        for (const fragment of page.fragments) {
          if (fragment.kind === 'para' && fragment.pmStart != null && fragment.pmEnd != null) {
            if (domPos >= fragment.pmStart && domPos <= fragment.pmEnd) {
              blockId = fragment.blockId;
              pageIndex = pi;
              column = determineColumn(layout, fragment.x);
              // Find line index if possible
              const blockIndex = findBlockIndexByFragmentId(blocks, fragment.blockId);
              if (blockIndex !== -1) {
                const measure = measures[blockIndex];
                if (measure && measure.kind === 'paragraph') {
                  for (let li = fragment.fromLine; li < fragment.toLine; li++) {
                    const line = measure.lines[li];
                    const range = computeLinePmRange(blocks[blockIndex], line);
                    if (range.pmStart != null && range.pmEnd != null) {
                      if (domPos >= range.pmStart && domPos <= range.pmEnd) {
                        lineIndex = li;
                        break;
                      }
                    }
                  }
                }
              }
              logClickStage('log', 'success', {
                blockId,
                pos: domPos,
                pageIndex,
                column,
                lineIndex,
                usedMethod: 'DOM',
              });
              return { pos: domPos, blockId, pageIndex, column, lineIndex };
            }
          }
        }
      }

      // Position found but couldn't locate in fragments - still return it
      logClickStage('log', 'success', {
        pos: domPos,
        usedMethod: 'DOM',
        note: 'position found but fragment not located',
      });
      return { pos: domPos, blockId: '', pageIndex: 0, column: 0, lineIndex: -1 };
    }

    logClickStage('log', 'dom-fallback', { reason: 'DOM mapping returned null, trying geometry' });
  }

  // Fallback to geometry-based mapping
  logClickStage('log', 'geometry-attempt', { trying: 'geometry-based mapping' });
  const pageHit = hitTestPage(layout, containerPoint);
  if (!pageHit) {
    logClickStage('warn', 'no-page', {
      point: containerPoint,
    });
    return null;
  }

  // Account for gaps between pages when calculating page-relative Y
  const pageGap = layout.pageGap ?? 0;
  const pageRelativePoint: Point = {
    x: containerPoint.x,
    y: containerPoint.y - pageHit.pageIndex * (layout.pageSize.h + pageGap),
  };
  logClickStage('log', 'page-hit', {
    pageIndex: pageHit.pageIndex,
    pageRelativePoint,
  });

  const fragmentHit = hitTestFragment(layout, pageHit, blocks, measures, pageRelativePoint);
  if (fragmentHit) {
    const { fragment, block, measure, pageIndex, pageY } = fragmentHit;
    if (fragment.kind !== 'para' || measure.kind !== 'paragraph' || block.kind !== 'paragraph') {
      logClickStage('warn', 'fragment-type-mismatch', {
        fragmentKind: fragment.kind,
        measureKind: measure.kind,
        blockKind: block.kind,
      });
      return null;
    }
    const lineIndex = findLineIndexAtY(measure, pageY, fragment.fromLine, fragment.toLine);
    if (lineIndex == null) {
      logClickStage('warn', 'no-line', {
        blockId: fragment.blockId,
        pageIndex,
        pageY,
      });
      return null;
    }
    const line = measure.lines[lineIndex];

    const isRTL = isRtlBlock(block);
    const pos = mapPointToPm(block, line, pageRelativePoint.x - fragment.x, isRTL);
    if (pos == null) {
      logClickStage('warn', 'no-position', {
        blockId: fragment.blockId,
        lineIndex,
        isRTL,
      });
      return null;
    }

    const column = determineColumn(layout, fragment.x);
    clickMappingTelemetry.geometrySuccess++;
    logPositionDebug({
      origin: 'geometry',
      pos,
      blockId: fragment.blockId,
      pageIndex,
      column,
      lineIndex,
      x: pageRelativePoint.x - fragment.x,
      y: pageRelativePoint.y,
      isRTL,
    });

    logClickStage('log', 'success', {
      blockId: fragment.blockId,
      pos,
      pageIndex,
      column,
      lineIndex,
      origin: 'paragraph',
    });

    return {
      pos,
      blockId: fragment.blockId,
      pageIndex,
      column,
      lineIndex, // lineIndex is now already absolute (within measure.lines), no need to add fragment.fromLine
    };
  }

  // Try table fragment hit testing
  const tableHit = hitTestTableFragment(pageHit, blocks, measures, pageRelativePoint);
  if (tableHit) {
    const { cellBlock, cellMeasure, localX, localY, pageIndex } = tableHit;

    // Find the line at the local Y position within the cell paragraph
    const lineIndex = findLineIndexAtY(cellMeasure, localY, 0, cellMeasure.lines.length);
    if (lineIndex != null) {
      const line = cellMeasure.lines[lineIndex];
      const isRTL = isRtlBlock(cellBlock);
      const pos = mapPointToPm(cellBlock, line, localX, isRTL);

      if (pos != null) {
        clickMappingTelemetry.geometrySuccess++;
        logClickStage('log', 'success', {
          blockId: tableHit.fragment.blockId,
          pos,
          pageIndex,
          column: determineColumn(layout, tableHit.fragment.x),
          lineIndex,
          origin: 'table-cell',
        });

        return {
          pos,
          blockId: tableHit.fragment.blockId,
          pageIndex,
          column: determineColumn(layout, tableHit.fragment.x),
          lineIndex,
        };
      }
    }

    // Fallback: return first position in the cell if line/position mapping fails
    const firstRun = cellBlock.runs?.[0];
    if (firstRun && firstRun.pmStart != null) {
      clickMappingTelemetry.geometrySuccess++;
      logClickStage('log', 'success', {
        blockId: tableHit.fragment.blockId,
        pos: firstRun.pmStart,
        pageIndex,
        column: determineColumn(layout, tableHit.fragment.x),
        lineIndex: 0,
        origin: 'table-cell-fallback',
      });

      return {
        pos: firstRun.pmStart,
        blockId: tableHit.fragment.blockId,
        pageIndex,
        column: determineColumn(layout, tableHit.fragment.x),
        lineIndex: 0,
      };
    }

    logClickStage('warn', 'table-cell-no-position', {
      blockId: tableHit.fragment.blockId,
      cellRow: tableHit.cellRowIndex,
      cellCol: tableHit.cellColIndex,
    });
  }

  const atomicHit = hitTestAtomicFragment(pageHit, blocks, measures, pageRelativePoint);
  if (atomicHit && isAtomicFragment(atomicHit.fragment)) {
    const { fragment, block, pageIndex } = atomicHit;
    const pmRange = getAtomicPmRange(fragment, block);
    const pos = pmRange.pmStart ?? pmRange.pmEnd ?? null;
    if (pos == null) {
      clickMappingTelemetry.failed++;
      logClickStage('warn', 'atomic-without-range', {
        fragmentId: fragment.blockId,
      });
      return null;
    }

    clickMappingTelemetry.geometrySuccess++;

    logClickStage('log', 'success', {
      blockId: fragment.blockId,
      pos,
      pageIndex,
      column: determineColumn(layout, fragment.x),
      lineIndex: -1,
      origin: 'atomic',
    });

    return {
      pos,
      blockId: fragment.blockId,
      pageIndex,
      column: determineColumn(layout, fragment.x),
      lineIndex: -1,
    };
  }

  clickMappingTelemetry.failed++;

  logClickStage('warn', 'no-fragment', {
    pageIndex: pageHit.pageIndex,
    pageRelativePoint,
  });
  return null;
}

/**
 * Find a block by fragment blockId, handling continuation fragments.
 * When paragraphs split across pages, continuation fragments get suffixed IDs
 * (e.g., "5-paragraph-1") while the blocks array uses the base ID ("5-paragraph").
 *
 * When a page break is inserted (CMD+ENTER), the paragraph splits into multiple blocks
 * with the same base ID but different PM ranges. The targetPmRange helps find the
 * correct block by checking which one contains the target range.
 *
 * @param blocks - Array of flow blocks to search through
 * @param fragmentBlockId - The block ID from the fragment (may include continuation suffix like "-1")
 * @param targetPmRange - Optional PM range {from, to} to disambiguate when multiple blocks share the same ID
 * @returns The index of the matching block, or -1 if not found
 */
function findBlockIndexByFragmentId(
  blocks: FlowBlock[],
  fragmentBlockId: string,
  targetPmRange?: { from: number; to: number },
): number {
  // Try exact match first, but skip pageBreak/sectionBreak blocks that may share IDs with continuation paragraphs.
  // This allows drawings, images, tables, and paragraphs to match while avoiding structural break blocks.
  const index = blocks.findIndex(
    (block) => block.id === fragmentBlockId && block.kind !== 'pageBreak' && block.kind !== 'sectionBreak',
  );
  if (index !== -1) {
    return index;
  }

  // If no match, try stripping continuation suffix (e.g., "5-paragraph-1" -> "5-paragraph")
  const baseBlockId = fragmentBlockId.replace(/-\d+$/, '');
  if (baseBlockId === fragmentBlockId) {
    return -1; // No suffix to strip, nothing more to try
  }

  // Find all paragraph blocks with matching base ID.
  // Note: continuation suffixes (-1, -2) are only used for paragraphs split across pages.
  const matchingIndices: number[] = [];
  blocks.forEach((block, idx) => {
    if (block.id === baseBlockId && block.kind === 'paragraph') {
      matchingIndices.push(idx);
    }
  });

  if (matchingIndices.length === 0) {
    return -1;
  }

  // If only one match, return it
  if (matchingIndices.length === 1) {
    return matchingIndices[0];
  }

  // Multiple blocks with same ID - use target PM range to disambiguate
  if (targetPmRange) {
    for (const idx of matchingIndices) {
      const block = blocks[idx];
      // Extra safety check - should always be true due to filtering above
      if (block.kind !== 'paragraph') continue;

      // Check if any run in this block overlaps the target range
      const hasOverlap = block.runs.some((run) => {
        if (run.pmStart == null || run.pmEnd == null) return false;
        return run.pmEnd > targetPmRange.from && run.pmStart < targetPmRange.to;
      });
      if (hasOverlap) {
        return idx;
      }
    }
  }

  // Fallback to first matching block
  return matchingIndices[0];
}

type TableRowBlock = TableBlock['rows'][number];
type TableCellBlock = TableRowBlock['cells'][number];
type TableCellMeasure = TableMeasure['rows'][number]['cells'][number];

const DEFAULT_CELL_PADDING = { top: 2, bottom: 2, left: 4, right: 4 };

const getCellPaddingFromRow = (cellIdx: number, row?: TableRowBlock) => {
  const padding = row?.cells?.[cellIdx]?.attrs?.padding ?? {};
  return {
    top: padding.top ?? DEFAULT_CELL_PADDING.top,
    bottom: padding.bottom ?? DEFAULT_CELL_PADDING.bottom,
    left: padding.left ?? DEFAULT_CELL_PADDING.left,
    right: padding.right ?? DEFAULT_CELL_PADDING.right,
  };
};

const getCellBlocks = (cell: TableCellBlock | undefined) => {
  if (!cell) return [];
  return cell.blocks ?? (cell.paragraph ? [cell.paragraph] : []);
};

const getCellMeasures = (cell: TableCellMeasure | undefined) => {
  if (!cell) return [];
  return cell.blocks ?? (cell.paragraph ? [cell.paragraph] : []);
};

const sumLineHeights = (measure: ParagraphMeasure, fromLine: number, toLine: number) => {
  let height = 0;
  for (let i = fromLine; i < toLine && i < measure.lines.length; i += 1) {
    height += measure.lines[i]?.lineHeight ?? 0;
  }
  return height;
};

/**
 * Given a PM range [from, to), return selection rectangles for highlighting.
 */
export function selectionToRects(
  layout: Layout,
  blocks: FlowBlock[],
  measures: Measure[],
  from: number,
  to: number,
): Rect[] {
  if (from === to) {
    return [];
  }

  const rects: Rect[] = [];
  const debugEntries: Record<string, unknown>[] = [];

  layout.pages.forEach((page, pageIndex) => {
    page.fragments.forEach((fragment) => {
      if (fragment.kind === 'para') {
        const blockIndex = findBlockIndexByFragmentId(blocks, fragment.blockId, { from, to });
        if (blockIndex === -1) {
          return;
        }
        const block = blocks[blockIndex];
        const measure = measures[blockIndex];
        if (!block || block.kind !== 'paragraph' || measure?.kind !== 'paragraph') {
          return;
        }

        const intersectingLines = findLinesIntersectingRange(block, measure, from, to);
        intersectingLines.forEach(({ line, index }) => {
          if (index < fragment.fromLine || index >= fragment.toLine) {
            return;
          }
          const range = computeLinePmRange(block, line);
          if (range.pmStart == null || range.pmEnd == null) return;
          const sliceFrom = Math.max(range.pmStart, from);
          const sliceTo = Math.min(range.pmEnd, to);
          if (sliceFrom >= sliceTo) return;

          // Convert PM positions to character offsets properly
          // (accounts for gaps in PM positions between runs)
          const charOffsetFrom = pmPosToCharOffset(block, line, sliceFrom);
          const charOffsetTo = pmPosToCharOffset(block, line, sliceTo);
          const startX = mapPmToX(block, line, charOffsetFrom, fragment.width);
          const endX = mapPmToX(block, line, charOffsetTo, fragment.width);
          // Align highlights with DOM-rendered list markers by offsetting for the marker box
          const markerWidth = fragment.markerWidth ?? measure.marker?.markerWidth ?? 0;
          const rectX = fragment.x + markerWidth + Math.min(startX, endX);
          const rectWidth = Math.max(1, Math.abs(endX - startX));
          const lineOffset = lineHeightBeforeIndex(measure, index) - lineHeightBeforeIndex(measure, fragment.fromLine);
          const rectY = fragment.y + lineOffset;
          rects.push({
            x: rectX,
            y: rectY + pageIndex * (layout.pageSize.h + (layout.pageGap ?? 0)),
            width: rectWidth,
            height: line.lineHeight,
            pageIndex,
          });

          if (SELECTION_DEBUG_ENABLED) {
            const runs = block.runs.slice(line.fromRun, line.toRun + 1).map((run, idx) => {
              const isAtomic =
                'src' in run || run.kind === 'lineBreak' || run.kind === 'break' || run.kind === 'fieldAnnotation';
              const text = isAtomic ? '' : (run.text ?? '');
              return {
                idx: line.fromRun + idx,
                kind: run.kind ?? 'text',
                pmStart: run.pmStart,
                pmEnd: run.pmEnd,
                textLength: text.length,
                textPreview: text.slice(0, 30),
                fontFamily: (run as { fontFamily?: string }).fontFamily,
                fontSize: (run as { fontSize?: number }).fontSize,
              };
            });

            debugEntries.push({
              pageIndex,
              blockId: block.id,
              lineIndex: index,
              lineFromRun: line.fromRun,
              lineToRun: line.toRun,
              lineFromChar: line.fromChar,
              lineToChar: line.toChar,
              lineWidth: line.width,
              fragment: {
                x: fragment.x,
                y: fragment.y,
                width: fragment.width,
                fromLine: fragment.fromLine,
                toLine: fragment.toLine,
              },
              pmRange: range,
              sliceFrom,
              sliceTo,
              charOffsetFrom,
              charOffsetTo,
              startX,
              endX,
              rect: { x: rectX, y: rectY, width: rectWidth, height: line.lineHeight },
              runs,
              lineText: buildLineText(block, line),
              selectedText: buildLineText(block, line).slice(
                Math.min(charOffsetFrom, charOffsetTo),
                Math.max(charOffsetFrom, charOffsetTo),
              ),
              indent: (block.attrs as { indent?: unknown } | undefined)?.indent,
              marker: measure.marker,
              lineSegments: line.segments,
            });
          }
        });
        return;
      }

      if (fragment.kind === 'table') {
        const blockIndex = findBlockIndexByFragmentId(blocks, fragment.blockId, { from, to });
        if (blockIndex === -1) return;

        const block = blocks[blockIndex];
        const measure = measures[blockIndex];
        if (!block || block.kind !== 'table' || measure?.kind !== 'table') {
          return;
        }

        const tableBlock = block as TableBlock;
        const tableMeasure = measure as TableMeasure;
        const tableFragment = fragment as TableFragment;

        const rowHeights = tableMeasure.rows.map((rowMeasure, idx) => {
          if (tableFragment.partialRow && tableFragment.partialRow.rowIndex === idx) {
            return tableFragment.partialRow.partialHeight;
          }
          return rowMeasure?.height ?? 0;
        });

        const calculateCellX = (cellIdx: number, cellMeasure: TableCellMeasure) => {
          const gridStart = cellMeasure.gridColumnStart ?? cellIdx;
          let x = 0;
          for (let i = 0; i < gridStart && i < tableMeasure.columnWidths.length; i += 1) {
            x += tableMeasure.columnWidths[i];
          }
          return x;
        };

        const processRow = (rowIndex: number, rowOffset: number): number => {
          const rowMeasure = tableMeasure.rows[rowIndex];
          const row = tableBlock.rows[rowIndex];
          if (!rowMeasure || !row) return rowOffset;

          const rowHeight = rowHeights[rowIndex] ?? rowMeasure.height;
          const isPartialRow = tableFragment.partialRow?.rowIndex === rowIndex;
          const partialRowData = isPartialRow ? tableFragment.partialRow : null;

          const totalColumns = Math.min(rowMeasure.cells.length, row.cells.length);

          for (let cellIdx = 0; cellIdx < totalColumns; cellIdx += 1) {
            const cellMeasure = rowMeasure.cells[cellIdx];
            const cell = row.cells[cellIdx];
            if (!cellMeasure || !cell) continue;

            const padding = getCellPaddingFromRow(cellIdx, row);
            const cellX = calculateCellX(cellIdx, cellMeasure);

            const cellBlocks = getCellBlocks(cell);
            const cellBlockMeasures = getCellMeasures(cellMeasure);

            // Map each block to its global line range within the cell
            const renderedBlocks: Array<{
              block: ParagraphBlock;
              measure: ParagraphMeasure;
              startLine: number;
              endLine: number;
              height: number;
            }> = [];

            let cumulativeLine = 0;
            for (let i = 0; i < Math.min(cellBlocks.length, cellBlockMeasures.length); i += 1) {
              const paraBlock = cellBlocks[i];
              const paraMeasure = cellBlockMeasures[i];
              if (!paraBlock || !paraMeasure || paraBlock.kind !== 'paragraph' || paraMeasure.kind !== 'paragraph') {
                continue;
              }
              const lineCount = paraMeasure.lines.length;
              const blockStart = cumulativeLine;
              const blockEnd = cumulativeLine + lineCount;
              cumulativeLine = blockEnd;

              const allowedStart = partialRowData?.fromLineByCell?.[cellIdx] ?? 0;
              const rawAllowedEnd = partialRowData?.toLineByCell?.[cellIdx];
              const allowedEnd = rawAllowedEnd == null || rawAllowedEnd === -1 ? cumulativeLine : rawAllowedEnd;

              const renderStartGlobal = Math.max(blockStart, allowedStart);
              const renderEndGlobal = Math.min(blockEnd, allowedEnd);
              if (renderStartGlobal >= renderEndGlobal) continue;

              const startLine = renderStartGlobal - blockStart;
              const endLine = renderEndGlobal - blockStart;

              let height = sumLineHeights(paraMeasure, startLine, endLine);
              const rendersWholeBlock = startLine === 0 && endLine >= lineCount;
              if (rendersWholeBlock) {
                const totalHeight = (paraMeasure as { totalHeight?: number }).totalHeight;
                if (typeof totalHeight === 'number' && totalHeight > height) {
                  height = totalHeight;
                }
                const spacingAfter = (paraBlock.attrs as { spacing?: { after?: number } } | undefined)?.spacing?.after;
                if (typeof spacingAfter === 'number' && spacingAfter > 0) {
                  height += spacingAfter;
                }
              }

              renderedBlocks.push({ block: paraBlock, measure: paraMeasure, startLine, endLine, height });
            }

            const contentHeight = renderedBlocks.reduce((acc, info) => acc + info.height, 0);
            const contentAreaHeight = Math.max(0, rowHeight - (padding.top + padding.bottom));
            const freeSpace = Math.max(0, contentAreaHeight - contentHeight);

            let verticalOffset = 0;
            const vAlign = cell.attrs?.verticalAlign;
            if (vAlign === 'center' || vAlign === 'middle') {
              verticalOffset = freeSpace / 2;
            } else if (vAlign === 'bottom') {
              verticalOffset = freeSpace;
            }

            let blockTopCursor = padding.top + verticalOffset;

            renderedBlocks.forEach((info) => {
              const paragraphMarkerWidth = info.measure.marker?.markerWidth ?? 0;
              const intersectingLines = findLinesIntersectingRange(info.block, info.measure, from, to);

              intersectingLines.forEach(({ line, index }) => {
                if (index < info.startLine || index >= info.endLine) {
                  return;
                }
                const range = computeLinePmRange(info.block, line);
                if (range.pmStart == null || range.pmEnd == null) return;
                const sliceFrom = Math.max(range.pmStart, from);
                const sliceTo = Math.min(range.pmEnd, to);
                if (sliceFrom >= sliceTo) return;

                const charOffsetFrom = pmPosToCharOffset(info.block, line, sliceFrom);
                const charOffsetTo = pmPosToCharOffset(info.block, line, sliceTo);
                const availableWidth = Math.max(1, cellMeasure.width - padding.left - padding.right);
                const startX = mapPmToX(info.block, line, charOffsetFrom, availableWidth);
                const endX = mapPmToX(info.block, line, charOffsetTo, availableWidth);

                const rectX = fragment.x + cellX + padding.left + paragraphMarkerWidth + Math.min(startX, endX);
                const rectWidth = Math.max(1, Math.abs(endX - startX));
                const lineOffset =
                  lineHeightBeforeIndex(info.measure, index) - lineHeightBeforeIndex(info.measure, info.startLine);
                const rectY = fragment.y + rowOffset + blockTopCursor + lineOffset;

                rects.push({
                  x: rectX,
                  y: rectY + pageIndex * (layout.pageSize.h + (layout.pageGap ?? 0)),
                  width: rectWidth,
                  height: line.lineHeight,
                  pageIndex,
                });
              });

              blockTopCursor += info.height;
            });
          }

          return rowOffset + rowHeight;
        };

        let rowCursor = 0;

        const repeatHeaderCount = tableFragment.repeatHeaderCount ?? 0;
        for (let r = 0; r < repeatHeaderCount && r < tableMeasure.rows.length; r += 1) {
          rowCursor = processRow(r, rowCursor);
        }

        for (let r = tableFragment.fromRow; r < tableFragment.toRow && r < tableMeasure.rows.length; r += 1) {
          rowCursor = processRow(r, rowCursor);
        }

        return;
      }

      if (isAtomicFragment(fragment)) {
        const blockIndex = findBlockIndexByFragmentId(blocks, fragment.blockId, { from, to });
        if (blockIndex === -1) return;
        const block = blocks[blockIndex];
        const pmRange = getAtomicPmRange(fragment, block);
        if (!rangesOverlap(pmRange.pmStart, pmRange.pmEnd, from, to)) return;
        rects.push({
          x: fragment.x,
          y: fragment.y + pageIndex * (layout.pageSize.h + (layout.pageGap ?? 0)),
          width: fragment.width,
          height: fragment.height,
          pageIndex,
        });
      }
    });
  });

  if (SELECTION_DEBUG_ENABLED && debugEntries.length > 0) {
    logSelectionDebug({
      from,
      to,
      entries: debugEntries,
    });
  }

  return rects;
}

export function getFragmentAtPosition(
  layout: Layout,
  blocks: FlowBlock[],
  measures: Measure[],
  pos: number,
): FragmentHit | null {
  // Suppress bridge debug logs

  for (let pageIndex = 0; pageIndex < layout.pages.length; pageIndex += 1) {
    const page = layout.pages[pageIndex];
    for (const fragment of page.fragments) {
      // Debug fragment checks removed to reduce noise

      const blockIndex = findBlockIndexByFragmentId(blocks, fragment.blockId);
      if (blockIndex === -1) {
        continue;
      }
      const block = blocks[blockIndex];
      const measure = measures[blockIndex];
      if (!block || !measure) continue;

      if (fragment.kind === 'para') {
        if (block.kind !== 'paragraph' || measure.kind !== 'paragraph') continue;

        if (fragment.pmStart != null && fragment.pmEnd != null && pos >= fragment.pmStart && pos <= fragment.pmEnd) {
          return {
            fragment,
            block,
            measure,
            pageIndex,
            pageY: 0,
          };
        }
        continue;
      }

      // Handle table fragments - check if position falls within any cell's content
      if (fragment.kind === 'table') {
        if (block.kind !== 'table' || measure.kind !== 'table') continue;

        const tableBlock = block as TableBlock;
        const _tableMeasure = measure as TableMeasure;
        const tableFragment = fragment as TableFragment;

        // Calculate the PM range for this table fragment (rows fromRow to toRow)
        let tableMinPos: number | null = null;
        let tableMaxPos: number | null = null;

        for (let r = tableFragment.fromRow; r < tableFragment.toRow && r < tableBlock.rows.length; r++) {
          const row = tableBlock.rows[r];
          for (const cell of row.cells) {
            const cellBlocks = cell.blocks ?? (cell.paragraph ? [cell.paragraph] : []);
            for (const cellBlock of cellBlocks) {
              if (cellBlock?.kind === 'paragraph') {
                const paraBlock = cellBlock as ParagraphBlock;
                for (const run of paraBlock.runs ?? []) {
                  if (run.pmStart != null) {
                    if (tableMinPos === null || run.pmStart < tableMinPos) tableMinPos = run.pmStart;
                    if (tableMaxPos === null || run.pmStart > tableMaxPos) tableMaxPos = run.pmStart;
                  }
                  if (run.pmEnd != null) {
                    if (tableMinPos === null || run.pmEnd < tableMinPos) tableMinPos = run.pmEnd;
                    if (tableMaxPos === null || run.pmEnd > tableMaxPos) tableMaxPos = run.pmEnd;
                  }
                }
              }
            }
          }
        }

        if (tableMinPos != null && tableMaxPos != null && pos >= tableMinPos && pos <= tableMaxPos) {
          return {
            fragment,
            block,
            measure,
            pageIndex,
            pageY: 0,
          };
        }
        continue;
      }

      if (isAtomicFragment(fragment)) {
        const { pmStart, pmEnd } = getAtomicPmRange(fragment, block);
        const start = pmStart ?? pmEnd;
        const end = pmEnd ?? pmStart;
        if (start == null || end == null) {
          continue;
        }
        const rangeStart = Math.min(start, end);
        const rangeEnd = Math.max(start, end);
        if (pos >= rangeStart && pos <= rangeEnd) {
          return {
            fragment,
            block,
            measure,
            pageIndex,
            pageY: 0,
          };
        }
      }
    }
  }
  return null;
}

export function findLinesIntersectingRange(
  block: FlowBlock,
  measure: Measure,
  from: number,
  to: number,
): { line: Line; index: number }[] {
  if (block.kind !== 'paragraph' || measure.kind !== 'paragraph') {
    return [];
  }
  const hits: { line: Line; index: number }[] = [];
  measure.lines.forEach((line, idx) => {
    const range = computeLinePmRange(block, line);
    if (range.pmStart == null || range.pmEnd == null) {
      return;
    }
    const intersects = range.pmEnd > from && range.pmStart < to;
    if (intersects) {
      hits.push({ line, index: idx });
    }
  });
  return hits;
}

export function computeLinePmRange(block: FlowBlock, line: Line): { pmStart?: number; pmEnd?: number } {
  if (block.kind !== 'paragraph') return {};

  let pmStart: number | undefined;
  let pmEnd: number | undefined;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    const text =
      'src' in run || run.kind === 'lineBreak' || run.kind === 'break' || run.kind === 'fieldAnnotation'
        ? ''
        : (run.text ?? '');
    const runLength = text.length;
    const runPmStart = run.pmStart ?? null;
    const runPmEnd = run.pmEnd ?? (runPmStart != null ? runPmStart + runLength : null);

    if (runPmStart == null || runPmEnd == null) continue;

    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;
    const startOffset = isFirstRun ? line.fromChar : 0;
    const endOffset = isLastRun ? line.toChar : runLength;

    const sliceStart = runPmStart + startOffset;
    const sliceEnd = Math.min(runPmStart + endOffset, runPmEnd);

    if (pmStart == null) {
      pmStart = sliceStart;
    }
    pmEnd = sliceEnd;
  }

  return { pmStart, pmEnd };
}

/**
 * Convert a ProseMirror position to a character offset within a line.
 *
 * This function performs ratio-based interpolation to handle cases where the PM position
 * range doesn't match the text length (e.g., when a run has formatting marks or when
 * there are position gaps between runs due to wrapper nodes).
 *
 * Algorithm:
 * 1. Iterate through runs in the line
 * 2. For each run, calculate its PM range and character count
 * 3. If pmPos falls within the run's PM range:
 *    - Use ratio interpolation: (pmPos - runStart) / runPmRange * runCharCount
 *    - This handles cases where PM positions don't align 1:1 with characters
 * 4. Return the accumulated character offset
 *
 * Edge Cases:
 * - Position before line start: Returns 0
 * - Position after line end: Returns total character count of the line
 * - Empty runs (images, breaks): Skipped, don't contribute to character count
 * - Runs with missing PM data: Skipped
 * - Zero-length PM range: Returns current accumulated offset without adding
 *
 * Performance:
 * - Time complexity: O(n) where n is the number of runs in the line
 * - Space complexity: O(1)
 *
 * @param block - The paragraph block containing the line
 * @param line - The line containing the position
 * @param pmPos - The ProseMirror position to convert
 * @returns Character offset from start of line (0-based), or 0 if position not found
 *
 * @example
 * ```typescript
 * // Run with PM range [10, 15] containing "Hello" (5 chars)
 * // pmPos = 12 should map to character offset 2 within the run
 * const offset = pmPosToCharOffset(block, line, 12);
 * // offset = 2 (ratio: (12-10)/(15-10) * 5 = 2/5 * 5 = 2)
 * ```
 */
export function pmPosToCharOffset(block: FlowBlock, line: Line, pmPos: number): number {
  if (block.kind !== 'paragraph') return 0;

  let charOffset = 0;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    const text =
      'src' in run || run.kind === 'lineBreak' || run.kind === 'break' || run.kind === 'fieldAnnotation'
        ? ''
        : (run.text ?? '');
    const runTextLength = text.length;
    const runPmStart = run.pmStart ?? null;
    const runPmEnd = run.pmEnd ?? (runPmStart != null ? runPmStart + runTextLength : null);

    if (runPmStart == null || runPmEnd == null || runTextLength === 0) continue;

    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;
    const lineStartChar = isFirstRun ? line.fromChar : 0;
    const lineEndChar = isLastRun ? line.toChar : runTextLength;
    const runSliceCharCount = lineEndChar - lineStartChar;

    // Calculate PM positions for this slice using ratio-based mapping
    // This handles cases where run's PM range doesn't equal its text length
    const runPmRange = runPmEnd - runPmStart;
    const runSlicePmStart = runPmStart + (lineStartChar / runTextLength) * runPmRange;
    const runSlicePmEnd = runPmStart + (lineEndChar / runTextLength) * runPmRange;

    // Check if pmPos falls within this run's PM range
    if (pmPos >= runSlicePmStart && pmPos <= runSlicePmEnd) {
      // Position is within this run - use ratio to calculate character offset
      const runSlicePmRange = runSlicePmEnd - runSlicePmStart;
      if (runSlicePmRange > 0) {
        const pmOffsetInSlice = pmPos - runSlicePmStart;
        const charOffsetInSlice = Math.round((pmOffsetInSlice / runSlicePmRange) * runSliceCharCount);
        const result = charOffset + Math.min(charOffsetInSlice, runSliceCharCount);
        const runText = text;
        const offsetInRun = result - charOffset - (isFirstRun ? 0 : 0);
        logSelectionMapDebug({
          kind: 'pmPosToCharOffset-hit',
          blockId: block.id,
          pmPos,
          runIndex,
          lineFromRun: line.fromRun,
          lineToRun: line.toRun,
          runPmStart,
          runPmEnd,
          runSlicePmStart,
          runSlicePmEnd,
          runSliceCharCount,
          pmOffsetInSlice,
          charOffsetInSlice,
          result,
          runTextPreview: runText.slice(Math.max(0, offsetInRun - 10), Math.min(runText.length, offsetInRun + 10)),
        });
        return result;
      }
      logSelectionMapDebug({
        kind: 'pmPosToCharOffset-zero-range',
        blockId: block.id,
        pmPos,
        runIndex,
      });
      return charOffset;
    }

    // Position is after this run - add this run's character count and continue
    if (pmPos > runSlicePmEnd) {
      charOffset += runSliceCharCount;
    }
  }

  // If we didn't find the position in any run, return the total character count
  // (position is at or past the end of the line)
  logSelectionMapDebug({
    kind: 'pmPosToCharOffset-fallback',
    blockId: block.id,
    pmPos,
    lineFromRun: line.fromRun,
    lineToRun: line.toRun,
    result: charOffset,
  });
  return charOffset;
}

const determineColumn = (layout: Layout, fragmentX: number): number => {
  const columns = layout.columns;
  if (!columns || columns.count <= 1) return 0;
  const usableWidth = layout.pageSize.w - columns.gap * (columns.count - 1);
  const columnWidth = usableWidth / columns.count;
  const span = columnWidth + columns.gap;
  const relative = fragmentX;
  const raw = Math.floor(relative / Math.max(span, 1));
  return Math.max(0, Math.min(columns.count - 1, raw));
};

/**
 * Finds the line index at a given Y offset within a paragraph measure.
 *
 * This function searches within a specified range of lines to determine which line
 * contains the given Y coordinate. It validates bounds to prevent out-of-bounds
 * access in case of corrupted layout data.
 *
 * @param measure - The paragraph measure containing line data
 * @param offsetY - The Y offset in pixels to search for
 * @param fromLine - The starting line index (inclusive)
 * @param toLine - The ending line index (exclusive)
 * @returns The line index containing the Y offset, or null if invalid
 *
 * @throws Never throws - returns null for invalid inputs
 */
const findLineIndexAtY = (measure: Measure, offsetY: number, fromLine: number, toLine: number): number | null => {
  if (measure.kind !== 'paragraph') return null;

  // Validate bounds to prevent out-of-bounds access
  const lineCount = measure.lines.length;
  if (fromLine < 0 || toLine > lineCount || fromLine >= toLine) {
    return null;
  }

  let cursor = 0;
  // Only search within the fragment's line range
  for (let i = fromLine; i < toLine; i += 1) {
    const line = measure.lines[i];
    // Guard against undefined lines (defensive check for corrupted data)
    if (!line) return null;

    const next = cursor + line.lineHeight;
    if (offsetY >= cursor && offsetY < next) {
      return i; // Return absolute line index within measure
    }
    cursor = next;
  }
  // If beyond all lines, return the last line in the fragment
  return toLine - 1;
};

const lineHeightBeforeIndex = (measure: Measure, absoluteLineIndex: number): number => {
  if (measure.kind !== 'paragraph') return 0;
  let height = 0;
  for (let i = 0; i < absoluteLineIndex; i += 1) {
    height += measure.lines[i]?.lineHeight ?? 0;
  }
  return height;
};

const mapPointToPm = (block: FlowBlock, line: Line, x: number, isRTL: boolean): number | null => {
  if (block.kind !== 'paragraph') return null;
  const range = computeLinePmRange(block, line);
  if (range.pmStart == null || range.pmEnd == null) return null;

  // Use shared text measurement utility for pixel-perfect accuracy
  const result = findCharacterAtX(block, line, x, range.pmStart);

  // Handle RTL text by reversing the position
  if (isRTL) {
    const charOffset = result.charOffset;
    const charsInLine = Math.max(1, line.toChar - line.fromChar);
    const reversedOffset = Math.max(0, Math.min(charsInLine, charsInLine - charOffset));
    return charOffsetToPm(block, line, reversedOffset, range.pmStart);
  }

  return result.pmPosition;
};

const mapPmToX = (block: FlowBlock, line: Line, offset: number, fragmentWidth: number): number => {
  if (fragmentWidth <= 0 || line.width <= 0) return 0;
  // Use shared text measurement utility for pixel-perfect accuracy
  return measureCharacterX(block, line, offset);
};

const _sliceRunsForLine = (block: FlowBlock, line: Line): Run[] => {
  const result: Run[] = [];

  if (block.kind !== 'paragraph') return result;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    if (run.kind === 'tab') {
      result.push(run);
      continue;
    }

    // FIXED: ImageRun handling - images are atomic units, no slicing needed
    if ('src' in run) {
      result.push(run);
      continue;
    }

    // LineBreakRun handling - line breaks are atomic units, no slicing needed
    if (run.kind === 'lineBreak') {
      result.push(run);
      continue;
    }

    // BreakRun handling - breaks are atomic units, no slicing needed
    if (run.kind === 'break') {
      result.push(run);
      continue;
    }

    // FieldAnnotationRun handling - field annotations are atomic units, no slicing needed
    if (run.kind === 'fieldAnnotation') {
      result.push(run);
      continue;
    }

    const text = run.text ?? '';
    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;

    if (isFirstRun || isLastRun) {
      const start = isFirstRun ? line.fromChar : 0;
      const end = isLastRun ? line.toChar : text.length;
      const slice = text.slice(start, end);
      const pmStart =
        run.pmStart != null ? run.pmStart + start : run.pmEnd != null ? run.pmEnd - (text.length - start) : undefined;
      const pmEnd =
        run.pmStart != null ? run.pmStart + end : run.pmEnd != null ? run.pmEnd - (text.length - end) : undefined;
      result.push({
        ...run,
        text: slice,
        pmStart,
        pmEnd,
      });
    } else {
      result.push(run);
    }
  }

  return result;
};

const isRtlBlock = (block: FlowBlock): boolean => {
  if (block.kind !== 'paragraph') return false;
  const attrs = block.attrs as Record<string, unknown> | undefined;
  if (!attrs) return false;
  const directionAttr = attrs.direction ?? attrs.dir ?? attrs.textDirection;
  if (typeof directionAttr === 'string' && directionAttr.toLowerCase() === 'rtl') {
    return true;
  }
  if (typeof attrs.rtl === 'boolean') {
    return attrs.rtl;
  }
  return false;
};
