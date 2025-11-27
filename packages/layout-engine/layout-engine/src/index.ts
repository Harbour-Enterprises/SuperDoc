import type {
  ColumnLayout,
  FlowBlock,
  Fragment,
  HeaderFooterLayout,
  ImageBlock,
  ImageMeasure,
  Layout,
  ListMeasure,
  Measure,
  Page,
  PageMargins,
  ParagraphBlock,
  ParagraphMeasure,
  SectionBreakBlock,
  TableBlock,
  TableMeasure,
  SectionMetadata,
  DrawingBlock,
  DrawingMeasure,
  SectionNumbering,
} from '@superdoc/contracts';
import { createFloatingObjectManager } from './floating-objects.js';
import { computeNextSectionPropsAtBreak } from './section-props';
import {
  scheduleSectionBreak as scheduleSectionBreakExport,
  type SectionState,
  applyPendingToActive,
} from './section-breaks.js';
import { layoutParagraphBlock } from './layout-paragraph.js';
import { layoutImageBlock } from './layout-image.js';
import { layoutDrawingBlock } from './layout-drawing.js';
import { layoutTableBlock } from './layout-table.js';
import { collectAnchoredDrawings } from './anchors.js';
import { createPaginator, type PageState, type ConstraintBoundary } from './paginator.js';

type PageSize = { w: number; h: number };
type Margins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  header?: number;
  footer?: number;
};

type NormalizedColumns = ColumnLayout & { width: number };

// ConstraintBoundary and PageState now come from paginator

export type LayoutOptions = {
  pageSize?: PageSize;
  margins?: Margins;
  columns?: ColumnLayout;
  remeasureParagraph?: (block: ParagraphBlock, maxWidth: number) => ParagraphMeasure;
  sectionMetadata?: SectionMetadata[];
};

export type HeaderFooterConstraints = {
  width: number;
  height: number;
  /** Actual page width for page-relative anchor positioning */
  pageWidth?: number;
  /** Page margins for page-relative anchor positioning */
  margins?: { left: number; right: number };
};

const DEFAULT_PAGE_SIZE: PageSize = { w: 612, h: 792 }; // Letter portrait in px (8.5in × 11in @ 72dpi)
const DEFAULT_MARGINS: Margins = { top: 72, right: 72, bottom: 72, left: 72 };

const COLUMN_EPSILON = 0.0001;
// List constants sourced from shared/common

// Context types moved to modular layouters

const layoutDebugEnabled =
  typeof process !== 'undefined' && typeof process.env !== 'undefined' && Boolean(process.env.SD_DEBUG_LAYOUT);

const layoutLog = (...args: unknown[]): void => {
  if (!layoutDebugEnabled) return;

  console.log(...args);
};

function formatPageNumber(
  num: number,
  format: 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman',
): string {
  switch (format) {
    case 'decimal':
      return String(num);
    case 'lowerLetter':
      return toLetter(num, false);
    case 'upperLetter':
      return toLetter(num, true);
    case 'lowerRoman':
      return toRoman(num).toLowerCase();
    case 'upperRoman':
      return toRoman(num);
    default:
      return String(num);
  }
}

function toLetter(num: number, uppercase: boolean): string {
  let result = '';
  let n = Math.max(1, Math.floor(num));
  while (n > 0) {
    const remainder = (n - 1) % 26;
    const char = String.fromCharCode((uppercase ? 65 : 97) + remainder);
    result = char + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function toRoman(num: number): string {
  const lookup: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let result = '';
  let n = Math.max(1, Math.floor(num));
  for (const [value, numeral] of lookup) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }
  return result;
}

/**
 * Layout FlowBlocks into paginated fragments using measured line data.
 *
 * The function is intentionally deterministic: it walks the provided
 * FlowBlocks in order, consumes their Measure objects (same index),
 * and greedily stacks fragments inside the content box of each page/column.
 */
export function layoutDocument(blocks: FlowBlock[], measures: Measure[], options: LayoutOptions = {}): Layout {
  if (blocks.length !== measures.length) {
    throw new Error(
      `layoutDocument expected measures for every block (blocks=${blocks.length}, measures=${measures.length})`,
    );
  }

  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const margins = {
    top: options.margins?.top ?? DEFAULT_MARGINS.top,
    right: options.margins?.right ?? DEFAULT_MARGINS.right,
    bottom: options.margins?.bottom ?? DEFAULT_MARGINS.bottom,
    left: options.margins?.left ?? DEFAULT_MARGINS.left,
    header: options.margins?.header ?? options.margins?.top ?? DEFAULT_MARGINS.top,
    footer: options.margins?.footer ?? options.margins?.bottom ?? DEFAULT_MARGINS.bottom,
  };

  const contentWidth = pageSize.w - (margins.left + margins.right);
  if (contentWidth <= 0) {
    throw new Error('layoutDocument: pageSize and margins yield non-positive content area');
  }

  let activeTopMargin = margins.top;
  let activeBottomMargin = margins.bottom;
  let pendingTopMargin: number | null = null;
  let pendingBottomMargin: number | null = null;
  let activeHeaderDistance = margins.header ?? margins.top;
  let pendingHeaderDistance: number | null = null;
  let activeFooterDistance = margins.footer ?? margins.bottom;
  let pendingFooterDistance: number | null = null;

  // Track active and pending page size
  let activePageSize = { w: pageSize.w, h: pageSize.h };
  let pendingPageSize: { w: number; h: number } | null = null;

  // Track active and pending columns
  let activeColumns = options.columns ?? { count: 1, gap: 0 };
  let pendingColumns: { count: number; gap: number } | null = null;

  // Track active and pending orientation
  let activeOrientation: 'portrait' | 'landscape' | null = null;
  let pendingOrientation: 'portrait' | 'landscape' | null = null;

  // Create floating-object manager for anchored image tracking
  const floatManager = createFloatingObjectManager(
    normalizeColumns(activeColumns, contentWidth),
    { left: margins.left, right: margins.right },
    pageSize.w,
  );

  // Will be aliased to paginator.pages/states after paginator is created

  // Pre-scan sectionBreak blocks to map each boundary to the NEXT section's properties.
  // DOCX uses end-tagged sectPr: the properties that should apply to the section starting
  // AFTER a boundary live on the NEXT section's sectPr (or the body sectPr for the final range).
  // By looking ahead here, we can ensure the page that starts after a break uses the upcoming
  // section's pageSize/margins/columns instead of the section that just ended.
  const nextSectionPropsAtBreak = computeNextSectionPropsAtBreak(blocks);

  // Compatibility wrapper in case module resolution for section-breaks fails in certain runners
  const scheduleSectionBreakCompat = (
    block: SectionBreakBlock,
    state: SectionState,
    baseMargins: { top: number; bottom: number; left: number; right: number },
  ): {
    decision: { forcePageBreak: boolean; forceMidPageRegion: boolean; requiredParity?: 'even' | 'odd' };
    state: SectionState;
  } => {
    if (typeof scheduleSectionBreakExport === 'function') {
      return scheduleSectionBreakExport(block, state, baseMargins);
    }
    // Fallback inline logic (mirrors section-breaks.ts)
    const next = { ...state };
    if (block.attrs?.isFirstSection && !next.hasAnyPages) {
      if (block.pageSize) {
        next.activePageSize = { w: block.pageSize.w, h: block.pageSize.h };
        next.pendingPageSize = null;
      }
      if (block.orientation) {
        next.activeOrientation = block.orientation;
        next.pendingOrientation = null;
      }
      if (block.margins?.header !== undefined) {
        const headerDistance = Math.max(0, block.margins.header);
        next.activeHeaderDistance = headerDistance;
        next.pendingHeaderDistance = headerDistance;
        next.activeTopMargin = Math.max(baseMargins.top, headerDistance);
        next.pendingTopMargin = next.activeTopMargin;
      }
      if (block.margins?.footer !== undefined) {
        const footerDistance = Math.max(0, block.margins.footer);
        next.activeFooterDistance = footerDistance;
        next.pendingFooterDistance = footerDistance;
        next.activeBottomMargin = Math.max(baseMargins.bottom, footerDistance);
        next.pendingBottomMargin = next.activeBottomMargin;
      }
      if (block.columns) {
        next.activeColumns = { count: block.columns.count, gap: block.columns.gap };
        next.pendingColumns = null;
      }
      // Schedule section refs for first section (will be applied on first page creation)
      if (block.headerRefs || block.footerRefs) {
        pendingSectionRefs = {
          ...(block.headerRefs && { headerRefs: block.headerRefs }),
          ...(block.footerRefs && { footerRefs: block.footerRefs }),
        };
        layoutLog(`[Layout] First section: Scheduled pendingSectionRefs:`, pendingSectionRefs);
      }
      return { decision: { forcePageBreak: false, forceMidPageRegion: false }, state: next };
    }
    const headerPx = block.margins?.header;
    const footerPx = block.margins?.footer;
    const nextTop = next.pendingTopMargin ?? next.activeTopMargin;
    const nextBottom = next.pendingBottomMargin ?? next.activeBottomMargin;
    const nextHeader = next.pendingHeaderDistance ?? next.activeHeaderDistance;
    const nextFooter = next.pendingFooterDistance ?? next.activeFooterDistance;
    next.pendingTopMargin = typeof headerPx === 'number' ? Math.max(baseMargins.top, headerPx) : nextTop;
    next.pendingBottomMargin = typeof footerPx === 'number' ? Math.max(baseMargins.bottom, footerPx) : nextBottom;
    next.pendingHeaderDistance = typeof headerPx === 'number' ? Math.max(0, headerPx) : nextHeader;
    next.pendingFooterDistance = typeof footerPx === 'number' ? Math.max(0, footerPx) : nextFooter;
    if (block.pageSize) next.pendingPageSize = { w: block.pageSize.w, h: block.pageSize.h };
    if (block.orientation) next.pendingOrientation = block.orientation;
    const sectionType = block.type ?? 'continuous';
    const isColumnsChanging =
      !!block.columns &&
      (block.columns.count !== next.activeColumns.count || block.columns.gap !== next.activeColumns.gap);
    // Schedule numbering change for next page
    if (block.numbering) {
      pendingNumbering = { ...block.numbering };
    }
    // Schedule section refs changes (apply at next page boundary)
    if (block.headerRefs || block.footerRefs) {
      pendingSectionRefs = {
        ...(block.headerRefs && { headerRefs: block.headerRefs }),
        ...(block.footerRefs && { footerRefs: block.footerRefs }),
      };
      layoutLog(`[Layout] Compat fallback: Scheduled pendingSectionRefs:`, pendingSectionRefs);
    }
    if (block.attrs?.requirePageBoundary) {
      if (block.columns) next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      return { decision: { forcePageBreak: true, forceMidPageRegion: false }, state: next };
    }
    if (sectionType === 'nextPage') {
      if (block.columns) next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      return { decision: { forcePageBreak: true, forceMidPageRegion: false }, state: next };
    }
    if (sectionType === 'evenPage') {
      if (block.columns) next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      return { decision: { forcePageBreak: true, forceMidPageRegion: false, requiredParity: 'even' }, state: next };
    }
    if (sectionType === 'oddPage') {
      if (block.columns) next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      return { decision: { forcePageBreak: true, forceMidPageRegion: false, requiredParity: 'odd' }, state: next };
    }
    if (isColumnsChanging) {
      return { decision: { forcePageBreak: false, forceMidPageRegion: true }, state: next };
    }
    if (block.columns) next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
    return { decision: { forcePageBreak: false, forceMidPageRegion: false }, state: next };
  };

  const createPage = (number: number, pageMargins: PageMargins, pageSizeOverride?: { w: number; h: number }): Page => {
    const page: Page = {
      number,
      fragments: [],
      margins: pageMargins,
    };
    if (pageSizeOverride) {
      page.size = pageSizeOverride;
    }
    // Set orientation from active section state
    if (activeOrientation) {
      page.orientation = activeOrientation;
    }
    return page;
  };

  // Pending-to-active application moved to section-breaks.applyPendingToActive

  // Paginator encapsulation for page/column helpers
  let pageCount = 0;
  // Page numbering state
  let activeNumberFormat: 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman' = 'decimal';
  let activePageCounter = 1;
  let pendingNumbering: SectionNumbering | null = null;
  // Section header/footer ref tracking state
  type SectionRefs = {
    headerRefs?: Partial<Record<'default' | 'first' | 'even' | 'odd', string>>;
    footerRefs?: Partial<Record<'default' | 'first' | 'even' | 'odd', string>>;
  };
  const sectionMetadataList = options.sectionMetadata ?? [];
  const initialSectionMetadata = sectionMetadataList[0];
  if (initialSectionMetadata?.numbering?.format) {
    activeNumberFormat = initialSectionMetadata.numbering.format;
  }
  if (typeof initialSectionMetadata?.numbering?.start === 'number') {
    activePageCounter = initialSectionMetadata.numbering.start;
  }
  let activeSectionRefs: SectionRefs | null = null;
  let pendingSectionRefs: SectionRefs | null = null;
  if (initialSectionMetadata?.headerRefs || initialSectionMetadata?.footerRefs) {
    activeSectionRefs = {
      ...(initialSectionMetadata.headerRefs && { headerRefs: initialSectionMetadata.headerRefs }),
      ...(initialSectionMetadata.footerRefs && { footerRefs: initialSectionMetadata.footerRefs }),
    };
  }

  const paginator = createPaginator({
    margins: { left: margins.left, right: margins.right },
    getActiveTopMargin: () => activeTopMargin,
    getActiveBottomMargin: () => activeBottomMargin,
    getActiveHeaderDistance: () => activeHeaderDistance,
    getActiveFooterDistance: () => activeFooterDistance,
    getActivePageSize: () => activePageSize,
    getDefaultPageSize: () => pageSize,
    getActiveColumns: () => activeColumns,
    getCurrentColumns: () => getCurrentColumns(),
    createPage,
    onNewPage: (state?: PageState) => {
      // apply pending->active and invalidate columns cache (first callback)
      if (!state) {
        const applied = applyPendingToActive({
          activeTopMargin,
          activeBottomMargin,
          pendingTopMargin,
          pendingBottomMargin,
          activeHeaderDistance,
          activeFooterDistance,
          pendingHeaderDistance,
          pendingFooterDistance,
          activePageSize,
          pendingPageSize,
          activeColumns,
          pendingColumns,
          activeOrientation,
          pendingOrientation,
          hasAnyPages: pageCount > 0,
        });
        activeTopMargin = applied.activeTopMargin;
        activeBottomMargin = applied.activeBottomMargin;
        pendingTopMargin = applied.pendingTopMargin;
        pendingBottomMargin = applied.pendingBottomMargin;
        activeHeaderDistance = applied.activeHeaderDistance;
        activeFooterDistance = applied.activeFooterDistance;
        pendingHeaderDistance = applied.pendingHeaderDistance;
        pendingFooterDistance = applied.pendingFooterDistance;
        activePageSize = applied.activePageSize;
        pendingPageSize = applied.pendingPageSize;
        activeColumns = applied.activeColumns;
        pendingColumns = applied.pendingColumns;
        activeOrientation = applied.activeOrientation;
        pendingOrientation = applied.pendingOrientation;
        cachedColumnsState.state = null;
        // Apply pending numbering
        if (pendingNumbering) {
          if (pendingNumbering.format) activeNumberFormat = pendingNumbering.format;
          if (typeof pendingNumbering.start === 'number' && Number.isFinite(pendingNumbering.start)) {
            activePageCounter = pendingNumbering.start as number;
          }
          pendingNumbering = null;
        }
        // Apply pending section refs
        if (pendingSectionRefs) {
          activeSectionRefs = pendingSectionRefs;
          pendingSectionRefs = null;
        }
        pageCount += 1;
        return;
      }

      // second callback: after page creation -> stamp display number, section refs, and advance counter
      if (state?.page) {
        state.page.numberText = formatPageNumber(activePageCounter, activeNumberFormat);
        // Stamp section refs on the page for per-section header/footer selection
        if (activeSectionRefs) {
          state.page.sectionRefs = {
            ...(activeSectionRefs.headerRefs && { headerRefs: activeSectionRefs.headerRefs }),
            ...(activeSectionRefs.footerRefs && { footerRefs: activeSectionRefs.footerRefs }),
          };
          layoutLog(`[Layout] Page ${state.page.number}: Stamped sectionRefs:`, state.page.sectionRefs);
        } else {
          layoutLog(`[Layout] Page ${state.page.number}: No activeSectionRefs to stamp`);
        }
        activePageCounter += 1;
      }
    },
  });
  // Alias local references to paginator-managed arrays
  const pages = paginator.pages;
  const states = paginator.states;

  // Helper to get current column configuration (respects constraint boundaries)
  const getActiveColumnsForState = paginator.getActiveColumnsForState;

  // Helper to get normalized columns for current page size
  let cachedColumnsState: {
    state: PageState | null;
    constraintIndex: number;
    contentWidth: number;
    colsConfig: { count: number; gap: number } | null;
    normalized: NormalizedColumns | null;
  } = { state: null, constraintIndex: -2, contentWidth: -1, colsConfig: null, normalized: null };

  const getCurrentColumns = (): NormalizedColumns => {
    const currentContentWidth = activePageSize.w - (margins.left + margins.right);
    const state = states[states.length - 1] ?? null;
    const colsConfig = state ? getActiveColumnsForState(state) : activeColumns;
    const constraintIndex = state ? state.activeConstraintIndex : -1;

    if (
      cachedColumnsState.state === state &&
      cachedColumnsState.constraintIndex === constraintIndex &&
      cachedColumnsState.contentWidth === currentContentWidth &&
      cachedColumnsState.colsConfig?.count === colsConfig.count &&
      cachedColumnsState.colsConfig?.gap === colsConfig.gap &&
      cachedColumnsState.normalized
    ) {
      return cachedColumnsState.normalized;
    }

    const normalized = normalizeColumns(colsConfig, currentContentWidth);
    cachedColumnsState = {
      state,
      constraintIndex,
      contentWidth: currentContentWidth,
      colsConfig: { count: colsConfig.count, gap: colsConfig.gap },
      normalized,
    };
    return normalized;
  };

  // Helper to get column X position
  const columnX = paginator.columnX;

  const advanceColumn = paginator.advanceColumn;

  // Start a new mid-page region with different column configuration
  const startMidPageRegion = (state: PageState, newColumns: { count: number; gap: number }): void => {
    // Record the boundary at current Y position
    const boundary: ConstraintBoundary = {
      y: state.cursorY,
      columns: newColumns,
    };
    state.constraintBoundaries.push(boundary);
    state.activeConstraintIndex = state.constraintBoundaries.length - 1;

    // Reset to first column with new configuration
    state.columnIndex = 0;

    layoutLog(`[Layout] *** COLUMNS CHANGED MID-PAGE ***`);
    layoutLog(`  OLD activeColumns: ${JSON.stringify(activeColumns)}`);
    layoutLog(`  NEW activeColumns: ${JSON.stringify(newColumns)}`);
    layoutLog(`  Current page: ${state.page.number}, cursorY: ${state.cursorY}`);

    // Update activeColumns so subsequent pages use this column configuration
    activeColumns = newColumns;

    // Invalidate columns cache to ensure recalculation with new region
    cachedColumnsState.state = null;

    // Note: We do NOT reset cursorY - content continues from current position
    // This creates the mid-page region effect
  };

  const _scheduleSectionBreak = (
    block: SectionBreakBlock,
  ): {
    forcePageBreak: boolean;
    forceMidPageRegion: boolean;
    requiredParity?: 'even' | 'odd';
  } => {
    layoutLog('[Layout] scheduleSectionBreak block:', {
      id: block.id,
      type: block.type,
      columns: block.columns,
      sectionIndex: block.attrs?.sectionIndex,
    });
    const sectionIndexRaw = block.attrs?.sectionIndex;
    const metadataIndex = typeof sectionIndexRaw === 'number' ? sectionIndexRaw : Number(sectionIndexRaw ?? NaN);
    const sectionMetadata = Number.isFinite(metadataIndex) ? sectionMetadataList[metadataIndex] : undefined;
    layoutLog(`[Layout] scheduleSectionBreak called:`, {
      id: block.id,
      type: block.type,
      isFirstSection: block.attrs?.isFirstSection,
      statesLength: states.length,
      hasHeaderRefs: !!block.headerRefs,
      hasFooterRefs: !!block.footerRefs,
      headerRefs: block.headerRefs,
      footerRefs: block.footerRefs,
    });

    // Special handling for first section break (appears before any content)
    // Apply properties immediately to activePageSize before first page is created
    if (block.attrs?.isFirstSection && states.length === 0) {
      layoutLog(`[Layout] Processing FIRST section break:`, {
        id: block.id,
        hasHeaderRefs: !!block.headerRefs,
        hasFooterRefs: !!block.footerRefs,
        headerRefs: block.headerRefs,
        footerRefs: block.footerRefs,
      });

      if (block.pageSize) {
        activePageSize = { w: block.pageSize.w, h: block.pageSize.h };
        pendingPageSize = null; // Clear pending since we applied directly
      }
      if (block.orientation) {
        activeOrientation = block.orientation;
        pendingOrientation = null; // Clear pending since we applied directly
      }
      if (block.margins?.header !== undefined) {
        const headerDistance = Math.max(0, block.margins.header);
        activeHeaderDistance = headerDistance;
        pendingHeaderDistance = headerDistance;
        activeTopMargin = Math.max(margins.top, headerDistance);
        pendingTopMargin = activeTopMargin;
      }
      if (block.margins?.footer !== undefined) {
        const footerDistance = Math.max(0, block.margins.footer);
        activeFooterDistance = footerDistance;
        pendingFooterDistance = footerDistance;
        activeBottomMargin = Math.max(margins.bottom, footerDistance);
        pendingBottomMargin = activeBottomMargin;
      }
      if (block.columns) {
        activeColumns = { count: block.columns.count, gap: block.columns.gap };
        pendingColumns = null; // Clear pending since we applied directly
      }
      // Initial numbering for very first page
      if (sectionMetadata?.numbering) {
        if (sectionMetadata.numbering.format) activeNumberFormat = sectionMetadata.numbering.format;
        if (typeof sectionMetadata.numbering.start === 'number') {
          activePageCounter = sectionMetadata.numbering.start;
        }
      }
      if (sectionMetadata?.headerRefs || sectionMetadata?.footerRefs) {
        activeSectionRefs = {
          ...(sectionMetadata.headerRefs && { headerRefs: sectionMetadata.headerRefs }),
          ...(sectionMetadata.footerRefs && { footerRefs: sectionMetadata.footerRefs }),
        };
        layoutLog(`[Layout] First section break: Set activeSectionRefs:`, activeSectionRefs);
      } else if (block.headerRefs || block.footerRefs) {
        activeSectionRefs = {
          ...(block.headerRefs && { headerRefs: block.headerRefs }),
          ...(block.footerRefs && { footerRefs: block.footerRefs }),
        };
        layoutLog(`[Layout] First section break: Set activeSectionRefs from block:`, activeSectionRefs);
      } else {
        layoutLog(`[Layout] First section break: NO headerRefs/footerRefs in block or metadata!`);
      }
      return { forcePageBreak: false, forceMidPageRegion: false };
    }

    // First, schedule all pending properties to apply at the next page boundary.
    // We process all properties before deciding whether to force a page break.
    const headerPx = block.margins?.header;
    const footerPx = block.margins?.footer;
    const nextTop = pendingTopMargin ?? activeTopMargin;
    const nextBottom = pendingBottomMargin ?? activeBottomMargin;
    const nextHeader = pendingHeaderDistance ?? activeHeaderDistance;
    const nextFooter = pendingFooterDistance ?? activeFooterDistance;

    // Update pending margins (take max to ensure space for header/footer)
    pendingTopMargin = typeof headerPx === 'number' ? Math.max(margins.top, headerPx) : nextTop;
    pendingBottomMargin = typeof footerPx === 'number' ? Math.max(margins.bottom, footerPx) : nextBottom;
    pendingHeaderDistance = typeof headerPx === 'number' ? Math.max(0, headerPx) : nextHeader;
    pendingFooterDistance = typeof footerPx === 'number' ? Math.max(0, footerPx) : nextFooter;

    // Schedule page size change if present
    if (block.pageSize) {
      pendingPageSize = { w: block.pageSize.w, h: block.pageSize.h };
    }

    // Schedule orientation change if present
    if (block.orientation) {
      pendingOrientation = block.orientation;
    }

    // Schedule numbering changes (apply at next page boundary)
    if (sectionMetadata?.numbering) {
      pendingNumbering = { ...sectionMetadata.numbering };
    } else if (block.numbering) {
      pendingNumbering = { ...block.numbering };
    }

    // Schedule section refs changes (apply at next page boundary)
    const refsFromMetadata =
      sectionMetadata?.headerRefs || sectionMetadata?.footerRefs
        ? {
            ...(sectionMetadata.headerRefs && { headerRefs: sectionMetadata.headerRefs }),
            ...(sectionMetadata.footerRefs && { footerRefs: sectionMetadata.footerRefs }),
          }
        : null;
    const refsFromBlock =
      block.headerRefs || block.footerRefs
        ? {
            ...(block.headerRefs && { headerRefs: block.headerRefs }),
            ...(block.footerRefs && { footerRefs: block.footerRefs }),
          }
        : null;
    const refsToSchedule = refsFromMetadata ?? refsFromBlock;
    if (refsToSchedule) {
      pendingSectionRefs = refsToSchedule;
      layoutLog(`[Layout] Section break: Scheduled pendingSectionRefs:`, pendingSectionRefs);
    }

    // Determine if this section break should force a page break
    const sectionType = block.type ?? 'continuous'; // Default to continuous if not specified

    // Phase 3B: Detect mid-page column changes for continuous section breaks
    const isColumnsChanging =
      block.columns != null && (block.columns.count !== activeColumns.count || block.columns.gap !== activeColumns.gap);

    // Word behavior parity: If a paragraph-level sectPr introduces header/footer semantics
    // that cannot apply mid-page (e.g., titlePg, changed header/footer refs/distances,
    // page size/orientation), treat a 'continuous' break as an effective next-page break.
    // The requirePageBoundary flag is set by the pm-adapter when it detects these conditions.
    if (block.attrs?.requirePageBoundary) {
      // Schedule column change for next page if columns are specified
      if (block.columns) {
        pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      }
      return { forcePageBreak: true, forceMidPageRegion: false };
    }

    switch (sectionType) {
      case 'nextPage':
        // Schedule column change for next page
        if (block.columns) {
          pendingColumns = { count: block.columns.count, gap: block.columns.gap };
        }
        return { forcePageBreak: true, forceMidPageRegion: false };
      case 'evenPage':
        if (block.columns) {
          pendingColumns = { count: block.columns.count, gap: block.columns.gap };
        }
        return { forcePageBreak: true, forceMidPageRegion: false, requiredParity: 'even' };
      case 'oddPage':
        if (block.columns) {
          pendingColumns = { count: block.columns.count, gap: block.columns.gap };
        }
        return { forcePageBreak: true, forceMidPageRegion: false, requiredParity: 'odd' };
      case 'continuous':
      default:
        // Phase 3B: If continuous and columns are changing, force mid-page region
        if (isColumnsChanging) {
          return { forcePageBreak: false, forceMidPageRegion: true };
        }
        // For continuous without column changes, schedule for next page
        if (block.columns) {
          pendingColumns = { count: block.columns.count, gap: block.columns.gap };
        }
        return { forcePageBreak: false, forceMidPageRegion: false };
    }
  };

  // PASS 1B: collect anchored drawings mapped to their anchor paragraphs
  const anchoredByParagraph = collectAnchoredDrawings(blocks, measures);
  const placedAnchoredIds = new Set<string>();

  // PASS 2: Layout all blocks, consulting float manager for affected paragraphs
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const measure = measures[index];
    if (!measure) {
      throw new Error(`layoutDocument: missing measure for block ${block.id}`);
    }

    layoutLog(`[Layout] Block ${index} (${block.kind}) - ID: ${block.id}`);
    layoutLog(`  activeColumns: ${JSON.stringify(activeColumns)}`);
    layoutLog(`  pendingColumns: ${JSON.stringify(pendingColumns)}`);
    if (block.kind === 'sectionBreak') {
      const sectionBlock = block as SectionBreakBlock;
      layoutLog(`  sectionBreak.columns: ${JSON.stringify(sectionBlock.columns)}`);
      layoutLog(`  sectionBreak.type: ${sectionBlock.type}`);
    }

    if (block.kind === 'sectionBreak') {
      if (measure.kind !== 'sectionBreak') {
        throw new Error(`layoutDocument: expected sectionBreak measure for block ${block.id}`);
      }
      // Use next-section properties at this boundary when available, so the page started
      // after this break uses the upcoming section's layout (page size, margins, columns).
      let effectiveBlock: SectionBreakBlock = block as SectionBreakBlock;
      const ahead = nextSectionPropsAtBreak.get(index);
      // Only adjust properties for breaks originating from DOCX sectPr (end-tagged semantics).
      // Skip the lookahead for PM-adapter blocks that already embed upcoming section metadata
      // via sectionIndex; those blocks have pre-resolved properties and don't need the map.
      const hasSectionIndex = typeof effectiveBlock.attrs?.sectionIndex === 'number';
      if (ahead && effectiveBlock.attrs?.source === 'sectPr' && !hasSectionIndex) {
        effectiveBlock = {
          ...effectiveBlock,
          margins: ahead.margins
            ? { ...(effectiveBlock.margins ?? {}), ...ahead.margins }
            : (effectiveBlock.margins ?? {}),
          pageSize: ahead.pageSize ?? effectiveBlock.pageSize,
          columns: ahead.columns ?? effectiveBlock.columns,
          orientation: ahead.orientation ?? effectiveBlock.orientation,
        };
      }

      const sectionState: SectionState = {
        activeTopMargin,
        activeBottomMargin,
        pendingTopMargin,
        pendingBottomMargin,
        activeHeaderDistance,
        activeFooterDistance,
        pendingHeaderDistance,
        pendingFooterDistance,
        activePageSize,
        pendingPageSize,
        activeColumns,
        pendingColumns,
        activeOrientation,
        pendingOrientation,
        hasAnyPages: states.length > 0,
      };
      const _sched = scheduleSectionBreakCompat(effectiveBlock, sectionState, {
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right,
      });
      const breakInfo = _sched.decision;
      const updatedState = _sched.state ?? sectionState;

      layoutLog(`[Layout] ========== SECTION BREAK SCHEDULED ==========`);
      layoutLog(`  Block index: ${index}`);
      layoutLog(`  effectiveBlock.columns: ${JSON.stringify(effectiveBlock.columns)}`);
      layoutLog(`  effectiveBlock.type: ${effectiveBlock.type}`);
      layoutLog(`  breakInfo.forcePageBreak: ${breakInfo.forcePageBreak}`);
      layoutLog(`  breakInfo.forceMidPageRegion: ${breakInfo.forceMidPageRegion}`);
      layoutLog(
        `  BEFORE: activeColumns = ${JSON.stringify(sectionState.activeColumns)}, pendingColumns = ${JSON.stringify(sectionState.pendingColumns)}`,
      );
      layoutLog(
        `  AFTER: activeColumns = ${JSON.stringify(updatedState.activeColumns)}, pendingColumns = ${JSON.stringify(updatedState.pendingColumns)}`,
      );
      layoutLog(`[Layout] ========== END SECTION BREAK ==========`);

      // Sync updated section state
      activeTopMargin = updatedState.activeTopMargin;
      activeBottomMargin = updatedState.activeBottomMargin;
      pendingTopMargin = updatedState.pendingTopMargin;
      pendingBottomMargin = updatedState.pendingBottomMargin;
      activeHeaderDistance = updatedState.activeHeaderDistance;
      activeFooterDistance = updatedState.activeFooterDistance;
      pendingHeaderDistance = updatedState.pendingHeaderDistance;
      pendingFooterDistance = updatedState.pendingFooterDistance;
      activePageSize = updatedState.activePageSize;
      pendingPageSize = updatedState.pendingPageSize;
      activeColumns = updatedState.activeColumns;
      pendingColumns = updatedState.pendingColumns;
      activeOrientation = updatedState.activeOrientation;
      pendingOrientation = updatedState.pendingOrientation;

      // Schedule section refs (handled outside of SectionState since they're module-level vars)
      if (effectiveBlock.headerRefs || effectiveBlock.footerRefs) {
        pendingSectionRefs = {
          ...(effectiveBlock.headerRefs && { headerRefs: effectiveBlock.headerRefs }),
          ...(effectiveBlock.footerRefs && { footerRefs: effectiveBlock.footerRefs }),
        };
        layoutLog(`[Layout] After scheduleSectionBreakCompat: Scheduled pendingSectionRefs:`, pendingSectionRefs);
      }

      // Phase 3B: Handle mid-page region changes
      if (breakInfo.forceMidPageRegion && block.columns) {
        const state = paginator.ensurePage();
        // Start a new mid-page region with the new column configuration
        startMidPageRegion(state, { count: block.columns.count, gap: block.columns.gap });
      }

      // Handle forced page breaks
      if (breakInfo.forcePageBreak) {
        let state = paginator.ensurePage();

        // If current page has content, start a new page
        if (state.page.fragments.length > 0) {
          layoutLog(`[Layout] Starting new page due to section break (forcePageBreak=true)`);
          layoutLog(
            `  Before: activeColumns = ${JSON.stringify(activeColumns)}, pendingColumns = ${JSON.stringify(pendingColumns)}`,
          );
          state = paginator.startNewPage();
          layoutLog(
            `  After page ${state.page.number} created: activeColumns = ${JSON.stringify(activeColumns)}, pendingColumns = ${JSON.stringify(pendingColumns)}`,
          );
        }

        // Handle parity requirements (evenPage/oddPage)
        if (breakInfo.requiredParity) {
          const currentPageNumber = state.page.number;
          const isCurrentEven = currentPageNumber % 2 === 0;
          const needsEven = breakInfo.requiredParity === 'even';

          // If parity doesn't match, insert a blank page
          if ((needsEven && !isCurrentEven) || (!needsEven && isCurrentEven)) {
            // Start another page to satisfy parity requirement
            layoutLog(`[Layout] Inserting blank page for parity (need ${breakInfo.requiredParity})`);
            state = paginator.startNewPage();
          }
        }
      }

      continue;
    }

    if (block.kind === 'paragraph') {
      if (measure.kind !== 'paragraph') {
        throw new Error(`layoutDocument: expected paragraph measure for block ${block.id}`);
      }

      // Skip empty paragraphs that appear between a pageBreak and a sectionBreak
      // (Word sectPr marker paragraphs should not create visible content)
      const paraBlock = block as ParagraphBlock;
      const isEmpty =
        !paraBlock.runs ||
        paraBlock.runs.length === 0 ||
        (paraBlock.runs.length === 1 && (!paraBlock.runs[0].text || paraBlock.runs[0].text === ''));

      if (isEmpty) {
        // Check if previous block was pageBreak and next block is sectionBreak
        const prevBlock = index > 0 ? blocks[index - 1] : null;
        const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;

        if (prevBlock?.kind === 'pageBreak' && nextBlock?.kind === 'sectionBreak') {
          continue;
        }
      }

      const anchorsForPara = anchoredByParagraph.get(index);
      layoutParagraphBlock(
        {
          block,
          measure,
          columnWidth: getCurrentColumns().width,
          ensurePage: paginator.ensurePage,
          advanceColumn: paginator.advanceColumn,
          columnX,
          floatManager,
          remeasureParagraph: options.remeasureParagraph,
        },
        anchorsForPara
          ? {
              anchoredDrawings: anchorsForPara,
              pageWidth: activePageSize.w,
              pageMargins: {
                top: activeTopMargin,
                bottom: activeBottomMargin,
                left: margins.left,
                right: margins.right,
              },
              columns: getCurrentColumns(),
              placedAnchoredIds,
            }
          : undefined,
      );
      continue;
    }
    if (block.kind === 'image') {
      if (measure.kind !== 'image') {
        throw new Error(`layoutDocument: expected image measure for block ${block.id}`);
      }
      layoutImageBlock({
        block: block as ImageBlock,
        measure: measure as ImageMeasure,
        columns: getCurrentColumns(),
        ensurePage: paginator.ensurePage,
        advanceColumn: paginator.advanceColumn,
        columnX,
      });
      continue;
    }
    if (block.kind === 'drawing') {
      if (measure.kind !== 'drawing') {
        throw new Error(`layoutDocument: expected drawing measure for block ${block.id}`);
      }
      layoutDrawingBlock({
        block: block as DrawingBlock,
        measure: measure as DrawingMeasure,
        columns: getCurrentColumns(),
        ensurePage: paginator.ensurePage,
        advanceColumn: paginator.advanceColumn,
        columnX,
      });
      continue;
    }
    if (block.kind === 'table') {
      if (measure.kind !== 'table') {
        throw new Error(`layoutDocument: expected table measure for block ${block.id}`);
      }
      layoutTableBlock({
        block: block as TableBlock,
        measure: measure as TableMeasure,
        columnWidth: getCurrentColumns().width,
        ensurePage: paginator.ensurePage,
        advanceColumn: paginator.advanceColumn,
        columnX,
      });
      continue;
    }

    // (handled earlier) list and image

    // Page break: force start of new page
    // Corresponds to DOCX <w:br w:type="page"/> or manual page breaks
    if (block.kind === 'pageBreak') {
      if (measure.kind !== 'pageBreak') {
        throw new Error(`layoutDocument: expected pageBreak measure for block ${block.id}`);
      }
      paginator.startNewPage();
      continue;
    }

    // Column break: advance to next column or start new page if in last column
    // Corresponds to DOCX <w:br w:type="column"/>
    if (block.kind === 'columnBreak') {
      if (measure.kind !== 'columnBreak') {
        throw new Error(`layoutDocument: expected columnBreak measure for block ${block.id}`);
      }
      const state = paginator.ensurePage();
      const activeCols = getActiveColumnsForState(state);

      if (state.columnIndex < activeCols.count - 1) {
        // Not in last column: advance to next column
        advanceColumn(state);
      } else {
        // In last column: start new page
        paginator.startNewPage();
      }
      continue;
    }

    throw new Error(`layoutDocument: unsupported block kind for ${(block as FlowBlock).id}`);
  }

  // Prune trailing empty page(s) that can be created by page-boundary rules
  // (e.g., parity requirements) when no content follows. Word does not render
  // a final blank page for continuous final sections.
  while (pages.length > 0 && pages[pages.length - 1].fragments.length === 0) {
    pages.pop();
  }

  return {
    pageSize,
    pages,
    // Note: columns here reflects the effective default for subsequent pages
    // after processing sections. Page/region-specific column changes are encoded
    // implicitly via fragment positions. Consumers should not assume this is
    // a static document-wide value.
    columns: activeColumns.count > 1 ? { count: activeColumns.count, gap: activeColumns.gap } : undefined,
  };
}

export function layoutHeaderFooter(
  blocks: FlowBlock[],
  measures: Measure[],
  constraints: HeaderFooterConstraints,
): HeaderFooterLayout {
  if (blocks.length !== measures.length) {
    throw new Error(
      `layoutHeaderFooter expected measures for every block (blocks=${blocks.length}, measures=${measures.length})`,
    );
  }
  const width = Number(constraints?.width);
  const height = Number(constraints?.height);
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('layoutHeaderFooter: width must be positive');
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error('layoutHeaderFooter: height must be positive');
  }

  // Transform page-relative anchor offsets to content-relative for correct positioning
  // Headers/footers are rendered within the content box, but page-relative anchors
  // specify offsets from the physical page edge. We need to adjust by subtracting
  // the left margin so the image appears at the correct position within the header/footer.
  const marginLeft = constraints.margins?.left ?? 0;
  const transformedBlocks =
    marginLeft > 0
      ? blocks.map((block) => {
          // Handle both image blocks and drawing blocks (vectorShape, shapeGroup)
          const hasPageRelativeAnchor =
            (block.kind === 'image' || block.kind === 'drawing') &&
            block.anchor?.hRelativeFrom === 'page' &&
            block.anchor.offsetH != null;
          if (hasPageRelativeAnchor) {
            return {
              ...block,
              anchor: {
                ...block.anchor,
                offsetH: block.anchor!.offsetH! - marginLeft,
              },
            };
          }
          return block;
        })
      : blocks;

  const layout = layoutDocument(transformedBlocks, measures, {
    pageSize: { w: width, h: height },
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  // Compute bounds using an index map to avoid building multiple Maps
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < blocks.length; i += 1) {
    idToIndex.set(blocks[i].id, i);
  }

  let minY = 0;
  let maxY = 0;

  for (const page of layout.pages) {
    for (const fragment of page.fragments) {
      const idx = idToIndex.get(fragment.blockId);
      if (idx == null) continue;
      const block = blocks[idx];
      const measure = measures[idx];

      if (fragment.y < minY) minY = fragment.y;
      let bottom = fragment.y;

      if (fragment.kind === 'para' && measure?.kind === 'paragraph') {
        let sum = 0;
        for (let li = fragment.fromLine; li < fragment.toLine; li += 1) {
          sum += measure.lines[li]?.lineHeight ?? 0;
        }
        bottom += sum;
        const spacingAfter = (block as ParagraphBlock)?.attrs?.spacing?.after;
        if (spacingAfter && fragment.toLine === measure.lines.length) {
          bottom += Math.max(0, Number(spacingAfter));
        }
      } else if (fragment.kind === 'image') {
        const h =
          typeof fragment.height === 'number' ? fragment.height : ((measure as ImageMeasure | undefined)?.height ?? 0);
        bottom += h;
      } else if (fragment.kind === 'drawing') {
        const drawingHeight =
          typeof fragment.height === 'number'
            ? fragment.height
            : ((measure as DrawingMeasure | undefined)?.height ?? 0);
        bottom += drawingHeight;
      } else if (fragment.kind === 'list-item') {
        const listMeasure = measure as ListMeasure | undefined;
        if (listMeasure) {
          const item = listMeasure.items.find((it) => it.itemId === fragment.itemId);
          if (item?.paragraph) {
            let sum = 0;
            for (let li = fragment.fromLine; li < fragment.toLine; li += 1) {
              sum += item.paragraph.lines[li]?.lineHeight ?? 0;
            }
            bottom += sum;
          }
        }
      }

      if (bottom > maxY) maxY = bottom;
    }
  }

  return {
    height: maxY - minY,
    minY,
    maxY,
    pages: layout.pages.map((page) => ({ number: page.number, fragments: page.fragments })),
  };
}

// moved layouters and PM helpers to dedicated modules

function normalizeColumns(input: ColumnLayout | undefined, contentWidth: number): NormalizedColumns {
  const rawCount = Number.isFinite(input?.count) ? Math.floor(input!.count) : 1;
  const count = Math.max(1, rawCount || 1);
  const gap = Math.max(0, input?.gap ?? 0);
  const totalGap = gap * (count - 1);
  const width = (contentWidth - totalGap) / count;

  if (width <= COLUMN_EPSILON) {
    return {
      count: 1,
      gap: 0,
      width: contentWidth,
    };
  }

  return {
    count,
    gap,
    width,
  };
}

const _buildMeasureMap = (blocks: FlowBlock[], measures: Measure[]): Map<string, Measure> => {
  const map = new Map<string, Measure>();
  blocks.forEach((block, index) => {
    const measure = measures[index];
    if (measure) {
      map.set(block.id, measure);
    }
  });
  return map;
};

/**
 * Compute the full bounding box of content across all pages.
 * Returns minY, maxY, and the total height including negative Y offsets.
 * This properly handles anchored images with negative Y positions.
 */
const _computeContentBounds = (
  pages: Page[],
  blocks: FlowBlock[],
  measureMap: Map<string, Measure>,
): { minY: number; maxY: number; height: number } => {
  let minY = 0;
  let maxY = 0;

  // Build a block map for O(1) lookup
  const blockMap = new Map<string, FlowBlock>();
  blocks.forEach((block) => {
    blockMap.set(block.id, block);
  });

  pages.forEach((page) => {
    page.fragments.forEach((fragment) => {
      const block = blockMap.get(fragment.blockId);
      const measure = measureMap.get(fragment.blockId);

      // Track minimum Y (for anchored images with negative offsets)
      if (fragment.y < minY) {
        minY = fragment.y;
      }

      // Compute fragment height and bottom position
      let fragmentBottom = fragment.y;

      if (fragment.kind === 'para') {
        const paraBlock = block as ParagraphBlock | undefined;
        const paraMeasure = measure as ParagraphMeasure | undefined;

        if (paraMeasure) {
          // Add line heights
          const linesHeight = sumLineHeights(paraMeasure, fragment.fromLine, fragment.toLine);
          fragmentBottom += linesHeight;

          // Add paragraph spacing if this is the last fragment of the paragraph
          if (paraBlock?.attrs?.spacing && fragment.toLine === paraMeasure.lines.length) {
            const spacingAfter = Math.max(0, Number(paraBlock.attrs.spacing.after ?? 0));
            fragmentBottom += spacingAfter;
          }
        }
      } else if (fragment.kind === 'image') {
        const imgHeight =
          typeof fragment.height === 'number' ? fragment.height : ((measure as ImageMeasure | undefined)?.height ?? 0);
        fragmentBottom += imgHeight;
      } else if (fragment.kind === 'drawing') {
        const drawingHeight =
          typeof fragment.height === 'number'
            ? fragment.height
            : ((measure as DrawingMeasure | undefined)?.height ?? 0);
        fragmentBottom += drawingHeight;
      } else if (fragment.kind === 'list-item') {
        const listMeasure = measure as ListMeasure | undefined;
        if (listMeasure) {
          const item = listMeasure.items.find((it) => it.itemId === fragment.itemId);
          if (item?.paragraph) {
            fragmentBottom += sumLineHeights(item.paragraph, fragment.fromLine, fragment.toLine);
          }
        }
      }

      if (fragmentBottom > maxY) {
        maxY = fragmentBottom;
      }
    });
  });

  return {
    minY,
    maxY,
    height: maxY - minY,
  };
};

const _computeUsedHeight = (pages: Page[], measureMap: Map<string, Measure>): number => {
  let maxHeight = 0;
  pages.forEach((page) => {
    page.fragments.forEach((fragment) => {
      const height = fragmentHeight(fragment, measureMap);
      const bottom = fragment.y + height;
      if (bottom > maxHeight) {
        maxHeight = bottom;
      }
    });
  });
  return maxHeight;
};

const fragmentHeight = (fragment: Fragment, measureMap: Map<string, Measure>): number => {
  if (fragment.kind === 'para') {
    const measure = measureMap.get(fragment.blockId);
    if (!measure || measure.kind !== 'paragraph') {
      return 0;
    }
    return sumLineHeights(measure, fragment.fromLine, fragment.toLine);
  }
  if (fragment.kind === 'image') {
    if (typeof fragment.height === 'number') {
      return fragment.height;
    }
    const measure = measureMap.get(fragment.blockId);
    if (measure && measure.kind === 'image') {
      return measure.height;
    }
    return 0;
  }
  if (fragment.kind === 'drawing') {
    if (typeof fragment.height === 'number') {
      return fragment.height;
    }
    const measure = measureMap.get(fragment.blockId);
    if (measure && measure.kind === 'drawing') {
      return measure.height;
    }
    return 0;
  }
  return 0;
};

const sumLineHeights = (measure: ParagraphMeasure, fromLine: number, toLine: number): number => {
  let sum = 0;
  for (let index = fromLine; index < toLine; index += 1) {
    sum += measure.lines[index]?.lineHeight ?? 0;
  }
  return sum;
};

// Export page reference resolution utilities
export { buildAnchorMap, resolvePageRefTokens, getTocBlocksForRemeasurement } from './resolvePageRefs.js';
