import type {
  ColumnLayout,
  FlowBlock,
  Fragment,
  HeaderFooterLayout,
  ImageBlock,
  ImageMeasure,
  ImageFragment,
  ImageFragmentMetadata,
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
  TableFragment,
  SectionMetadata,
  DrawingBlock,
  DrawingMeasure,
  DrawingFragment,
  SectionNumbering,
} from '@superdoc/contracts';
import { createFloatingObjectManager, computeAnchorX } from './floating-objects.js';
import { computeNextSectionPropsAtBreak } from './section-props';
import {
  scheduleSectionBreak as scheduleSectionBreakExport,
  type SectionState,
  applyPendingToActive,
} from './section-breaks.js';
import { layoutParagraphBlock } from './layout-paragraph.js';
import { layoutImageBlock } from './layout-image.js';
import { layoutDrawingBlock } from './layout-drawing.js';
import { layoutTableBlock, createAnchoredTableFragment } from './layout-table.js';
import { collectAnchoredDrawings, collectAnchoredTables, collectPreRegisteredAnchors } from './anchors.js';
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

/**
 * Default paragraph line height in pixels used for vertical alignment calculations
 * when actual height is not available in the measure data.
 * This is a fallback estimate for paragraph and list-item fragments.
 */
const DEFAULT_PARAGRAPH_LINE_HEIGHT_PX = 20;

/**
 * Type guard to check if a fragment has a height property.
 * Image, Drawing, and Table fragments all have a required height property.
 *
 * @param fragment - The fragment to check
 * @returns True if the fragment is ImageFragment, DrawingFragment, or TableFragment
 */
function hasHeight(fragment: Fragment): fragment is ImageFragment | DrawingFragment | TableFragment {
  return fragment.kind === 'image' || fragment.kind === 'drawing' || fragment.kind === 'table';
}

// ConstraintBoundary and PageState now come from paginator

export type LayoutOptions = {
  pageSize?: PageSize;
  margins?: Margins;
  columns?: ColumnLayout;
  remeasureParagraph?: (block: ParagraphBlock, maxWidth: number, firstLineIndent?: number) => ParagraphMeasure;
  sectionMetadata?: SectionMetadata[];
  /**
   * Actual measured header content heights per variant type.
   * When provided, the layout engine will ensure body content starts below
   * the header content, preventing overlap when headers exceed their allocated margin space.
   *
   * Keys correspond to header variant types: 'default', 'first', 'even', 'odd'
   * Values are the actual content heights in pixels.
   */
  headerContentHeights?: Partial<Record<'default' | 'first' | 'even' | 'odd', number>>;
  /**
   * Actual measured footer content heights per variant type.
   * When provided, the layout engine will ensure body content ends above
   * the footer content, preventing overlap when footers exceed their allocated margin space.
   *
   * Keys correspond to footer variant types: 'default', 'first', 'even', 'odd'
   * Values are the actual content heights in pixels.
   */
  footerContentHeights?: Partial<Record<'default' | 'first' | 'even' | 'odd', number>>;
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

/**
 * Format a page number according to the specified numbering style.
 *
 * Converts a numeric page number into the requested format for display in headers/footers
 * and page navigation. Supports multiple numbering styles commonly found in word processing
 * documents.
 *
 * @param num - The numeric page number to format (1-based, positive integer)
 * @param format - The numbering format style to apply
 *   - 'decimal': Standard numeric format (1, 2, 3, ...)
 *   - 'lowerLetter': Lowercase alphabetic (a, b, c, ..., z, aa, ab, ...)
 *   - 'upperLetter': Uppercase alphabetic (A, B, C, ..., Z, AA, AB, ...)
 *   - 'lowerRoman': Lowercase Roman numerals (i, ii, iii, iv, v, ...)
 *   - 'upperRoman': Uppercase Roman numerals (I, II, III, IV, V, ...)
 * @returns The formatted page number as a string
 */
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

/**
 * Convert a numeric value to alphabetic representation (Excel-style column naming).
 *
 * Converts positive integers to alphabetic sequences using base-26 representation
 * where A=1, B=2, ..., Z=26, AA=27, AB=28, etc. This mimics the column naming
 * convention used in spreadsheet applications.
 *
 * Algorithm: Uses division by 26 with adjustment for 1-based indexing (no zero digit).
 * Each iteration computes the rightmost letter and shifts the remaining value.
 *
 * Edge cases:
 * - Values less than 1 are treated as 1 (returns 'a' or 'A')
 * - Non-integer values are floored before conversion
 *
 * @param num - The numeric value to convert (positive integer expected)
 * @param uppercase - If true, returns uppercase letters (A, B, C); if false, lowercase (a, b, c)
 * @returns The alphabetic representation as a string
 * @example
 * toLetter(1, true)   // Returns 'A'
 * toLetter(26, true)  // Returns 'Z'
 * toLetter(27, true)  // Returns 'AA'
 * toLetter(52, true)  // Returns 'AZ'
 * toLetter(702, true) // Returns 'ZZ'
 */
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

/**
 * Convert a numeric value to Roman numeral representation.
 *
 * Converts positive integers to uppercase Roman numerals using standard Roman numeral
 * notation with subtractive notation (e.g., IV for 4, IX for 9, XL for 40, etc.).
 *
 * Algorithm: Uses a greedy approach with a lookup table of value-numeral pairs ordered
 * from largest to smallest. Repeatedly subtracts the largest possible value and appends
 * the corresponding numeral until the number is reduced to zero.
 *
 * Supported range: 1 to 3999 (standard Roman numeral range)
 * - Values less than 1 are treated as 1 (returns 'I')
 * - Values greater than 3999 will produce non-standard extended Roman numerals
 * - Non-integer values are floored before conversion
 *
 * @param num - The numeric value to convert (positive integer expected, typically 1-3999)
 * @returns The Roman numeral representation as an uppercase string
 * @example
 * toRoman(1)    // Returns 'I'
 * toRoman(4)    // Returns 'IV'
 * toRoman(9)    // Returns 'IX'
 * toRoman(58)   // Returns 'LVIII'
 * toRoman(1994) // Returns 'MCMXCIV'
 */
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

  const baseContentWidth = pageSize.w - (margins.left + margins.right);
  if (baseContentWidth <= 0) {
    throw new Error('layoutDocument: pageSize and margins yield non-positive content area');
  }

  /**
   * Validates and normalizes a header or footer content height value to ensure it is a non-negative finite number.
   * Used to validate both header and footer heights before using them in layout calculations.
   *
   * @param height - The content height value to validate (may be undefined)
   * @returns A valid non-negative number, or 0 if the input is invalid
   */
  const validateContentHeight = (height: number | undefined): number => {
    if (height === undefined) return 0;
    if (!Number.isFinite(height) || height < 0) return 0;
    return height;
  };

  // Calculate the maximum header content height across all variants.
  // This ensures body content always starts below header content, regardless of which variant is used.
  const headerContentHeights = options.headerContentHeights;
  const maxHeaderContentHeight = headerContentHeights
    ? Math.max(
        0,
        validateContentHeight(headerContentHeights.default),
        validateContentHeight(headerContentHeights.first),
        validateContentHeight(headerContentHeights.even),
        validateContentHeight(headerContentHeights.odd),
      )
    : 0;

  // Calculate effective top margin: ensure body content starts below header content.
  // The header starts at headerDistance (margins.header) from the page top.
  // Body content must start at headerDistance + actualHeaderHeight (at minimum).
  // We take the max of the document's top margin and the header-required space.
  const headerDistance = margins.header ?? margins.top;
  const effectiveTopMargin =
    maxHeaderContentHeight > 0 ? Math.max(margins.top, headerDistance + maxHeaderContentHeight) : margins.top;

  // Calculate the maximum footer content height across all variants.
  // This ensures body content always ends above footer content, regardless of which variant is used.
  const footerContentHeights = options.footerContentHeights;
  const maxFooterContentHeight = footerContentHeights
    ? Math.max(
        0,
        validateContentHeight(footerContentHeights.default),
        validateContentHeight(footerContentHeights.first),
        validateContentHeight(footerContentHeights.even),
        validateContentHeight(footerContentHeights.odd),
      )
    : 0;

  // Calculate effective bottom margin: ensure body content ends above footer content.
  // The footer starts at footerDistance (margins.footer) from the page bottom.
  // Body content must end at footerDistance + actualFooterHeight (at minimum) from page bottom.
  // We take the max of the document's bottom margin and the footer-required space.
  const footerDistance = margins.footer ?? margins.bottom;
  const effectiveBottomMargin =
    maxFooterContentHeight > 0 ? Math.max(margins.bottom, footerDistance + maxFooterContentHeight) : margins.bottom;

  let activeTopMargin = effectiveTopMargin;
  let activeBottomMargin = effectiveBottomMargin;
  let activeLeftMargin = margins.left;
  let activeRightMargin = margins.right;
  let pendingTopMargin: number | null = null;
  let pendingBottomMargin: number | null = null;
  let pendingLeftMargin: number | null = null;
  let pendingRightMargin: number | null = null;
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

  // Track active and pending vertical alignment for sections
  type VerticalAlign = 'top' | 'center' | 'bottom' | 'both';
  let activeVAlign: VerticalAlign | null = null;
  let pendingVAlign: VerticalAlign | null = null;

  // Create floating-object manager for anchored image tracking
  const paginatorMargins = { left: activeLeftMargin, right: activeRightMargin };
  const floatManager = createFloatingObjectManager(
    normalizeColumns(activeColumns, activePageSize.w - (activeLeftMargin + activeRightMargin)),
    { left: activeLeftMargin, right: activeRightMargin },
    activePageSize.w,
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
      return scheduleSectionBreakExport(block, state, baseMargins, maxHeaderContentHeight, maxFooterContentHeight);
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
      const headerDistance =
        typeof block.margins?.header === 'number' ? Math.max(0, block.margins.header) : next.activeHeaderDistance;
      const footerDistance =
        typeof block.margins?.footer === 'number' ? Math.max(0, block.margins.footer) : next.activeFooterDistance;
      const sectionTop = typeof block.margins?.top === 'number' ? Math.max(0, block.margins.top) : baseMargins.top;
      const sectionBottom =
        typeof block.margins?.bottom === 'number' ? Math.max(0, block.margins.bottom) : baseMargins.bottom;
      if (block.margins?.header !== undefined) {
        next.activeHeaderDistance = headerDistance;
        next.pendingHeaderDistance = headerDistance;
      }
      if (block.margins?.footer !== undefined) {
        next.activeFooterDistance = footerDistance;
        next.pendingFooterDistance = footerDistance;
      }
      if (block.margins?.top !== undefined || block.margins?.header !== undefined) {
        const requiredTop = maxHeaderContentHeight > 0 ? headerDistance + maxHeaderContentHeight : headerDistance;
        next.activeTopMargin = Math.max(sectionTop, requiredTop);
        next.pendingTopMargin = next.activeTopMargin;
      }
      if (block.margins?.bottom !== undefined || block.margins?.footer !== undefined) {
        const requiredBottom = maxFooterContentHeight > 0 ? footerDistance + maxFooterContentHeight : footerDistance;
        next.activeBottomMargin = Math.max(sectionBottom, requiredBottom);
        next.pendingBottomMargin = next.activeBottomMargin;
      }
      if (block.margins?.left !== undefined) {
        const leftMargin = Math.max(0, block.margins.left);
        next.activeLeftMargin = leftMargin;
        next.pendingLeftMargin = leftMargin;
      }
      if (block.margins?.right !== undefined) {
        const rightMargin = Math.max(0, block.margins.right);
        next.activeRightMargin = rightMargin;
        next.pendingRightMargin = rightMargin;
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
      // Set section index for first section
      const firstSectionIndexRaw = block.attrs?.sectionIndex;
      const firstMetadataIndex =
        typeof firstSectionIndexRaw === 'number' ? firstSectionIndexRaw : Number(firstSectionIndexRaw ?? NaN);
      if (Number.isFinite(firstMetadataIndex)) {
        activeSectionIndex = firstMetadataIndex;
      }
      // Set numbering for first section from metadata
      const firstSectionMetadata = Number.isFinite(firstMetadataIndex)
        ? sectionMetadataList[firstMetadataIndex]
        : undefined;
      if (firstSectionMetadata?.numbering) {
        if (firstSectionMetadata.numbering.format) activeNumberFormat = firstSectionMetadata.numbering.format;
        if (typeof firstSectionMetadata.numbering.start === 'number') {
          activePageCounter = firstSectionMetadata.numbering.start;
        }
      }
      return { decision: { forcePageBreak: false, forceMidPageRegion: false }, state: next };
    }
    const headerPx = block.margins?.header;
    const footerPx = block.margins?.footer;
    const topPx = block.margins?.top;
    const bottomPx = block.margins?.bottom;
    const leftPx = block.margins?.left;
    const rightPx = block.margins?.right;
    const nextTop = next.pendingTopMargin ?? next.activeTopMargin;
    const nextBottom = next.pendingBottomMargin ?? next.activeBottomMargin;
    const nextLeft = next.pendingLeftMargin ?? next.activeLeftMargin;
    const nextRight = next.pendingRightMargin ?? next.activeRightMargin;
    const nextHeader = next.pendingHeaderDistance ?? next.activeHeaderDistance;
    const nextFooter = next.pendingFooterDistance ?? next.activeFooterDistance;

    // Update header/footer distances first
    next.pendingHeaderDistance = typeof headerPx === 'number' ? Math.max(0, headerPx) : nextHeader;
    next.pendingFooterDistance = typeof footerPx === 'number' ? Math.max(0, footerPx) : nextFooter;

    // Account for actual header content height when calculating top margin
    // Recalculate if either top or header margin changes
    if (typeof headerPx === 'number' || typeof topPx === 'number') {
      const sectionTop = typeof topPx === 'number' ? Math.max(0, topPx) : baseMargins.top;
      const sectionHeader = next.pendingHeaderDistance;
      const requiredTop = maxHeaderContentHeight > 0 ? sectionHeader + maxHeaderContentHeight : sectionHeader;
      next.pendingTopMargin = Math.max(sectionTop, requiredTop);
    } else {
      next.pendingTopMargin = nextTop;
    }

    // Account for actual footer content height when calculating bottom margin
    if (typeof footerPx === 'number' || typeof bottomPx === 'number') {
      const sectionFooter = next.pendingFooterDistance;
      const sectionBottom = typeof bottomPx === 'number' ? Math.max(0, bottomPx) : baseMargins.bottom;
      const requiredBottom = maxFooterContentHeight > 0 ? sectionFooter + maxFooterContentHeight : sectionFooter;
      next.pendingBottomMargin = Math.max(sectionBottom, requiredBottom);
    } else {
      next.pendingBottomMargin = nextBottom;
    }
    next.pendingLeftMargin = typeof leftPx === 'number' ? Math.max(0, leftPx) : nextLeft;
    next.pendingRightMargin = typeof rightPx === 'number' ? Math.max(0, rightPx) : nextRight;
    if (block.pageSize) next.pendingPageSize = { w: block.pageSize.w, h: block.pageSize.h };
    if (block.orientation) next.pendingOrientation = block.orientation;
    const sectionType = block.type ?? 'continuous';
    const isColumnsChanging =
      !!block.columns &&
      (block.columns.count !== next.activeColumns.count || block.columns.gap !== next.activeColumns.gap);
    // Schedule section index change for next page (enables section-aware page numbering)
    const sectionIndexRaw = block.attrs?.sectionIndex;
    const metadataIndex = typeof sectionIndexRaw === 'number' ? sectionIndexRaw : Number(sectionIndexRaw ?? NaN);
    if (Number.isFinite(metadataIndex)) {
      pendingSectionIndex = metadataIndex;
    }
    // Get section metadata for numbering if available
    const sectionMetadata = Number.isFinite(metadataIndex) ? sectionMetadataList[metadataIndex] : undefined;
    // Schedule numbering change for next page - prefer metadata over block
    if (sectionMetadata?.numbering) {
      pendingNumbering = { ...sectionMetadata.numbering };
    } else if (block.numbering) {
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
    // Set vertical alignment from active section state
    if (activeVAlign && activeVAlign !== 'top') {
      page.vAlign = activeVAlign;
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
  // Section index tracking for multi-section page numbering and header/footer selection
  let activeSectionIndex: number = initialSectionMetadata?.sectionIndex ?? 0;
  let pendingSectionIndex: number | null = null;

  const paginator = createPaginator({
    margins: paginatorMargins,
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
          activeLeftMargin,
          activeRightMargin,
          pendingTopMargin,
          pendingBottomMargin,
          pendingLeftMargin,
          pendingRightMargin,
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
        activeLeftMargin = applied.activeLeftMargin;
        activeRightMargin = applied.activeRightMargin;
        pendingTopMargin = applied.pendingTopMargin;
        pendingBottomMargin = applied.pendingBottomMargin;
        pendingLeftMargin = applied.pendingLeftMargin;
        pendingRightMargin = applied.pendingRightMargin;
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
        paginatorMargins.left = activeLeftMargin;
        paginatorMargins.right = activeRightMargin;
        const contentWidth = activePageSize.w - (activeLeftMargin + activeRightMargin);
        floatManager.setLayoutContext(
          normalizeColumns(activeColumns, contentWidth),
          { left: activeLeftMargin, right: activeRightMargin },
          activePageSize.w,
        );
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
        // Apply pending section index
        if (pendingSectionIndex !== null) {
          activeSectionIndex = pendingSectionIndex;
          pendingSectionIndex = null;
        }
        // Apply pending vertical alignment
        if (pendingVAlign !== null) {
          activeVAlign = pendingVAlign;
          pendingVAlign = null;
        }
        pageCount += 1;
        return;
      }

      // second callback: after page creation -> stamp display number, section refs, section index, and advance counter
      if (state?.page) {
        state.page.numberText = formatPageNumber(activePageCounter, activeNumberFormat);
        // Stamp section index on the page for section-aware page numbering and header/footer selection
        state.page.sectionIndex = activeSectionIndex;
        layoutLog(`[Layout] Page ${state.page.number}: Stamped sectionIndex:`, activeSectionIndex);
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
    const currentContentWidth = activePageSize.w - (activeLeftMargin + activeRightMargin);
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

    const contentWidth = activePageSize.w - (activeLeftMargin + activeRightMargin);
    floatManager.setLayoutContext(
      normalizeColumns(activeColumns, contentWidth),
      { left: activeLeftMargin, right: activeRightMargin },
      activePageSize.w,
    );

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
        const headerDist = Math.max(0, block.margins.header);
        activeHeaderDistance = headerDist;
        pendingHeaderDistance = headerDist;
      }
      // Handle top margin - always recalculate with header content height if applicable
      if (block.margins?.top !== undefined || block.margins?.header !== undefined) {
        const sectionTop = block.margins?.top ?? margins.top;
        const sectionHeader = block.margins?.header ?? activeHeaderDistance;
        // Account for actual header content height when calculating top margin
        const requiredTopMargin = maxHeaderContentHeight > 0 ? sectionHeader + maxHeaderContentHeight : sectionHeader;
        activeTopMargin = Math.max(sectionTop, requiredTopMargin);
        pendingTopMargin = activeTopMargin;
      }
      if (block.margins?.footer !== undefined) {
        const footerDistance = Math.max(0, block.margins.footer);
        activeFooterDistance = footerDistance;
        pendingFooterDistance = footerDistance;
        // Account for actual footer content height
        const requiredBottomMargin =
          maxFooterContentHeight > 0 ? footerDistance + maxFooterContentHeight : footerDistance;
        activeBottomMargin = Math.max(margins.bottom, requiredBottomMargin);
        pendingBottomMargin = activeBottomMargin;
      }
      if (block.margins?.left !== undefined) {
        const leftMargin = Math.max(0, block.margins.left);
        activeLeftMargin = leftMargin;
        pendingLeftMargin = leftMargin;
      }
      if (block.margins?.right !== undefined) {
        const rightMargin = Math.max(0, block.margins.right);
        activeRightMargin = rightMargin;
        pendingRightMargin = rightMargin;
      }
      if (block.columns) {
        activeColumns = { count: block.columns.count, gap: block.columns.gap };
        pendingColumns = null; // Clear pending since we applied directly
      }
      if (block.vAlign) {
        activeVAlign = block.vAlign;
        pendingVAlign = null; // Clear pending since we applied directly
      }
      // Initial numbering for very first page
      if (sectionMetadata?.numbering) {
        if (sectionMetadata.numbering.format) activeNumberFormat = sectionMetadata.numbering.format;
        if (typeof sectionMetadata.numbering.start === 'number') {
          activePageCounter = sectionMetadata.numbering.start;
        }
      }
      // Set section index for first section
      if (Number.isFinite(metadataIndex)) {
        activeSectionIndex = metadataIndex;
        layoutLog(`[Layout] First section break: Set activeSectionIndex:`, activeSectionIndex);
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
    const topPx = block.margins?.top;
    const nextTop = pendingTopMargin ?? activeTopMargin;
    const nextBottom = pendingBottomMargin ?? activeBottomMargin;
    const nextHeader = pendingHeaderDistance ?? activeHeaderDistance;
    const nextFooter = pendingFooterDistance ?? activeFooterDistance;

    // Update header/footer distances first
    pendingHeaderDistance = typeof headerPx === 'number' ? Math.max(0, headerPx) : nextHeader;
    pendingFooterDistance = typeof footerPx === 'number' ? Math.max(0, footerPx) : nextFooter;

    // Update pending margins (take max to ensure space for header/footer and header content)
    // Recalculate if either top or header margin changes
    if (typeof headerPx === 'number' || typeof topPx === 'number') {
      const sectionTop = topPx ?? margins.top;
      const sectionHeader = pendingHeaderDistance;
      const requiredForHeader = maxHeaderContentHeight > 0 ? sectionHeader + maxHeaderContentHeight : sectionHeader;
      pendingTopMargin = Math.max(sectionTop, requiredForHeader);
    } else {
      pendingTopMargin = nextTop;
    }

    // Account for actual footer content height when calculating bottom margin
    if (typeof footerPx === 'number') {
      const sectionFooter = pendingFooterDistance;
      const requiredForFooter = maxFooterContentHeight > 0 ? sectionFooter + maxFooterContentHeight : sectionFooter;
      pendingBottomMargin = Math.max(margins.bottom, requiredForFooter);
    } else {
      pendingBottomMargin = nextBottom;
    }

    // Schedule page size change if present
    if (block.pageSize) {
      pendingPageSize = { w: block.pageSize.w, h: block.pageSize.h };
    }

    // Schedule orientation change if present
    if (block.orientation) {
      pendingOrientation = block.orientation;
    }

    // Schedule vertical alignment change if present
    if (block.vAlign) {
      pendingVAlign = block.vAlign;
    }

    // Schedule numbering changes (apply at next page boundary)
    if (sectionMetadata?.numbering) {
      pendingNumbering = { ...sectionMetadata.numbering };
    } else if (block.numbering) {
      pendingNumbering = { ...block.numbering };
    }

    // Schedule section index change (apply at next page boundary)
    if (Number.isFinite(metadataIndex)) {
      pendingSectionIndex = metadataIndex;
      layoutLog(`[Layout] Section break: Scheduled pendingSectionIndex:`, pendingSectionIndex);
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

    // Detect mid-page column changes for continuous section breaks
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
        // If continuous and columns are changing, force mid-page region
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

  // Collect anchored drawings mapped to their anchor paragraphs
  const anchoredByParagraph = collectAnchoredDrawings(blocks, measures);
  // PASS 1C: collect anchored/floating tables mapped to their anchor paragraphs
  const anchoredTablesByParagraph = collectAnchoredTables(blocks, measures);
  const placedAnchoredIds = new Set<string>();
  const placedAnchoredTableIds = new Set<string>();

  // Pre-register page/margin-relative anchored images before the layout loop.
  // These images position themselves relative to the page, not a paragraph, so they
  // must be registered first so all paragraphs can wrap around them.
  const preRegisteredAnchors = collectPreRegisteredAnchors(blocks, measures);

  // Map to store pre-computed positions for page-relative anchors (for fragment creation later)
  const preRegisteredPositions = new Map<string, { anchorX: number; anchorY: number; pageNumber: number }>();

  for (const entry of preRegisteredAnchors) {
    // Ensure first page exists
    const state = paginator.ensurePage();

    // Calculate anchor Y position based on vRelativeFrom and alignV
    const vRelativeFrom = entry.block.anchor?.vRelativeFrom ?? 'paragraph';
    const alignV = entry.block.anchor?.alignV ?? 'top';
    const offsetV = entry.block.anchor?.offsetV ?? 0;
    const imageHeight = entry.measure.height ?? 0;

    // Calculate the content area boundaries
    const contentTop = state.topMargin;
    const contentBottom = state.contentBottom;
    const contentHeight = Math.max(0, contentBottom - contentTop);

    let anchorY: number;

    if (vRelativeFrom === 'margin') {
      // Position relative to the content area (margin box)
      if (alignV === 'top') {
        anchorY = contentTop + offsetV;
      } else if (alignV === 'bottom') {
        anchorY = contentBottom - imageHeight + offsetV;
      } else if (alignV === 'center') {
        anchorY = contentTop + (contentHeight - imageHeight) / 2 + offsetV;
      } else {
        anchorY = contentTop + offsetV;
      }
    } else if (vRelativeFrom === 'page') {
      // Position relative to the physical page (0 = top edge)
      if (alignV === 'top') {
        anchorY = offsetV;
      } else if (alignV === 'bottom') {
        const pageHeight = contentBottom + (state.page.margins?.bottom ?? activeBottomMargin);
        anchorY = pageHeight - imageHeight + offsetV;
      } else if (alignV === 'center') {
        const pageHeight = contentBottom + (state.page.margins?.bottom ?? activeBottomMargin);
        anchorY = (pageHeight - imageHeight) / 2 + offsetV;
      } else {
        anchorY = offsetV;
      }
    } else {
      // Shouldn't happen for pre-registered anchors, but fallback
      anchorY = contentTop + offsetV;
    }

    // Compute anchor X position
    const anchorX = entry.block.anchor
      ? computeAnchorX(
          entry.block.anchor,
          state.columnIndex,
          normalizeColumns(activeColumns, activePageSize.w - (activeLeftMargin + activeRightMargin)),
          entry.measure.width,
          { left: activeLeftMargin, right: activeRightMargin },
          activePageSize.w,
        )
      : activeLeftMargin;

    // Register with float manager so all paragraphs see this exclusion
    // NOTE: We only register exclusion zones here, NOT fragments.
    // Fragments will be created when the image block is encountered in the layout loop.
    // This prevents the section break logic from seeing "content" on the page and creating a new page.
    floatManager.registerDrawing(entry.block, entry.measure, anchorY, state.columnIndex, state.page.number);

    // Store pre-computed position for later use when creating the fragment
    preRegisteredPositions.set(entry.block.id, { anchorX, anchorY, pageNumber: state.page.number });
  }

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
      const hasSectionIndex = typeof effectiveBlock.attrs?.sectionIndex === 'number';
      // Only adjust properties for breaks originating from DOCX sectPr (end-tagged semantics).
      // Skip the lookahead for PM-adapter blocks that already embed upcoming section metadata
      // via sectionIndex; those blocks have pre-resolved properties and don't need the map.
      if (ahead && effectiveBlock.attrs?.source === 'sectPr' && !hasSectionIndex && ahead) {
        effectiveBlock = {
          ...effectiveBlock,
          margins: ahead.margins
            ? { ...(effectiveBlock.margins ?? {}), ...ahead.margins }
            : (effectiveBlock.margins ?? {}),
          pageSize: ahead.pageSize ?? effectiveBlock.pageSize,
          columns: ahead.columns ?? effectiveBlock.columns,
          orientation: ahead.orientation ?? effectiveBlock.orientation,
          vAlign: ahead.vAlign ?? effectiveBlock.vAlign,
        };
      }

      const sectionState: SectionState = {
        activeTopMargin,
        activeBottomMargin,
        activeLeftMargin,
        activeRightMargin,
        pendingTopMargin,
        pendingBottomMargin,
        pendingLeftMargin,
        pendingRightMargin,
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
      activeLeftMargin = updatedState.activeLeftMargin;
      activeRightMargin = updatedState.activeRightMargin;
      pendingTopMargin = updatedState.pendingTopMargin;
      pendingBottomMargin = updatedState.pendingBottomMargin;
      pendingLeftMargin = updatedState.pendingLeftMargin;
      pendingRightMargin = updatedState.pendingRightMargin;
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

      // Handle vAlign from section break (not part of SectionState, handled separately)
      if (effectiveBlock.vAlign) {
        const isFirstSection = effectiveBlock.attrs?.isFirstSection && states.length === 0;
        if (isFirstSection) {
          // First section: apply immediately
          activeVAlign = effectiveBlock.vAlign;
          pendingVAlign = null;
        } else {
          // Non-first section: schedule for next page
          pendingVAlign = effectiveBlock.vAlign;
        }
      }

      // Schedule section refs (handled outside of SectionState since they're module-level vars)
      if (effectiveBlock.headerRefs || effectiveBlock.footerRefs) {
        pendingSectionRefs = {
          ...(effectiveBlock.headerRefs && { headerRefs: effectiveBlock.headerRefs }),
          ...(effectiveBlock.footerRefs && { footerRefs: effectiveBlock.footerRefs }),
        };
        layoutLog(`[Layout] After scheduleSectionBreakCompat: Scheduled pendingSectionRefs:`, pendingSectionRefs);
      }

      // Schedule section index and numbering (handled outside of SectionState since they're module-level vars)
      const sectionIndexRaw = effectiveBlock.attrs?.sectionIndex;
      const metadataIndex = typeof sectionIndexRaw === 'number' ? sectionIndexRaw : Number(sectionIndexRaw ?? NaN);
      const isFirstSection = effectiveBlock.attrs?.isFirstSection && states.length === 0;
      if (Number.isFinite(metadataIndex)) {
        if (isFirstSection) {
          // First section: apply immediately
          activeSectionIndex = metadataIndex;
        } else {
          // Non-first section: schedule for next page
          pendingSectionIndex = metadataIndex;
        }
      }
      // Get section metadata for numbering if available
      const sectionMetadata = Number.isFinite(metadataIndex) ? sectionMetadataList[metadataIndex] : undefined;
      if (sectionMetadata?.numbering) {
        if (isFirstSection) {
          // First section: apply immediately
          if (sectionMetadata.numbering.format) activeNumberFormat = sectionMetadata.numbering.format;
          if (typeof sectionMetadata.numbering.start === 'number') {
            activePageCounter = sectionMetadata.numbering.start;
          }
        } else {
          // Non-first section: schedule for next page
          pendingNumbering = { ...sectionMetadata.numbering };
        }
      } else if (effectiveBlock.numbering) {
        if (isFirstSection) {
          if (effectiveBlock.numbering.format) activeNumberFormat = effectiveBlock.numbering.format;
          if (typeof effectiveBlock.numbering.start === 'number') {
            activePageCounter = effectiveBlock.numbering.start;
          }
        } else {
          pendingNumbering = { ...effectiveBlock.numbering };
        }
      }

      // Handle mid-page region changes
      if (breakInfo.forceMidPageRegion && block.columns) {
        let state = paginator.ensurePage();
        const columnIndexBefore = state.columnIndex;

        // Validate and normalize column count to ensure it's a positive integer
        const rawCount = block.columns.count;
        const validatedCount =
          typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount > 0
            ? Math.max(1, Math.floor(rawCount))
            : 1;

        // Validate and normalize gap to ensure it's non-negative
        const rawGap = block.columns.gap;
        const validatedGap =
          typeof rawGap === 'number' && Number.isFinite(rawGap) && rawGap >= 0 ? Math.max(0, rawGap) : 0;

        const newColumns = { count: validatedCount, gap: validatedGap };

        // If we reduce column count and are currently in a column that won't exist
        // in the new layout, start a fresh page to avoid overwriting earlier columns.
        if (columnIndexBefore >= newColumns.count) {
          state = paginator.startNewPage();
        }

        // Start a new mid-page region with the new column configuration
        startMidPageRegion(state, newColumns);
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
        (paraBlock.runs.length === 1 &&
          (!paraBlock.runs[0].kind || paraBlock.runs[0].kind === 'text') &&
          (!paraBlock.runs[0].text || paraBlock.runs[0].text === ''));

      if (isEmpty) {
        // Check if previous block was pageBreak and next block is sectionBreak
        const prevBlock = index > 0 ? blocks[index - 1] : null;
        const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;

        if (prevBlock?.kind === 'pageBreak' && nextBlock?.kind === 'sectionBreak') {
          continue;
        }
      }

      const anchorsForPara = anchoredByParagraph.get(index);

      // Register anchored tables for this paragraph before layout
      // so the float manager knows about them when laying out text
      const tablesForPara = anchoredTablesByParagraph.get(index);
      if (tablesForPara) {
        const state = paginator.ensurePage();
        for (const { block: tableBlock, measure: tableMeasure } of tablesForPara) {
          if (placedAnchoredTableIds.has(tableBlock.id)) continue;

          // Register the table with the float manager for text wrapping
          floatManager.registerTable(tableBlock, tableMeasure, state.cursorY, state.columnIndex, state.page.number);

          // Create and place the table fragment at its anchored position
          const anchorX = tableBlock.anchor?.offsetH ?? columnX(state.columnIndex);
          const anchorY = state.cursorY + (tableBlock.anchor?.offsetV ?? 0);

          const tableFragment = createAnchoredTableFragment(tableBlock, tableMeasure, anchorX, anchorY);
          state.page.fragments.push(tableFragment);
          placedAnchoredTableIds.add(tableBlock.id);
        }
      }

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
                left: activeLeftMargin,
                right: activeRightMargin,
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

      // Check if this is a pre-registered page-relative anchor
      const preRegPos = preRegisteredPositions.get(block.id);
      if (
        preRegPos &&
        Number.isFinite(preRegPos.anchorX) &&
        Number.isFinite(preRegPos.anchorY) &&
        Number.isFinite(preRegPos.pageNumber)
      ) {
        // Use pre-computed position for page-relative anchors
        const state = paginator.ensurePage();
        const imgBlock = block as ImageBlock;
        const imgMeasure = measure as ImageMeasure;

        const pageContentHeight = Math.max(0, state.contentBottom - state.topMargin);
        const relativeFrom = imgBlock.anchor?.hRelativeFrom ?? 'column';
        const cols = getCurrentColumns();
        let maxWidth: number;
        if (relativeFrom === 'page') {
          maxWidth = cols.count === 1 ? activePageSize.w - (activeLeftMargin + activeRightMargin) : activePageSize.w;
        } else if (relativeFrom === 'margin') {
          maxWidth = activePageSize.w - (activeLeftMargin + activeRightMargin);
        } else {
          maxWidth = cols.width;
        }

        const aspectRatio = imgMeasure.width > 0 && imgMeasure.height > 0 ? imgMeasure.width / imgMeasure.height : 1.0;
        const minWidth = 20;
        const minHeight = minWidth / aspectRatio;

        const metadata: ImageFragmentMetadata = {
          originalWidth: imgMeasure.width,
          originalHeight: imgMeasure.height,
          maxWidth,
          maxHeight: pageContentHeight,
          aspectRatio,
          minWidth,
          minHeight,
        };

        const fragment: ImageFragment = {
          kind: 'image',
          blockId: imgBlock.id,
          x: preRegPos.anchorX,
          y: preRegPos.anchorY,
          width: imgMeasure.width,
          height: imgMeasure.height,
          isAnchored: true,
          zIndex: imgBlock.anchor?.behindDoc ? 0 : 1,
          metadata,
        };

        const attrs = imgBlock.attrs as Record<string, unknown> | undefined;
        if (attrs?.pmStart != null) fragment.pmStart = attrs.pmStart as number;
        if (attrs?.pmEnd != null) fragment.pmEnd = attrs.pmEnd as number;

        state.page.fragments.push(fragment);
        placedAnchoredIds.add(imgBlock.id);
        continue;
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

  // Post-process pages with vertical alignment (center, bottom, both)
  // For each page, calculate content bounds and apply Y offset to all fragments
  for (const page of pages) {
    if (!page.vAlign || page.vAlign === 'top') continue;
    if (page.fragments.length === 0) continue;

    // Get page dimensions
    const pageSizeForPage = page.size ?? pageSize;
    const contentTop = page.margins?.top ?? margins.top;
    const contentBottom = pageSizeForPage.h - (page.margins?.bottom ?? margins.bottom);
    const contentHeight = contentBottom - contentTop;

    // Calculate the actual content bounds (min and max Y of all fragments)
    let minY = Infinity;
    let maxY = -Infinity;

    for (const fragment of page.fragments) {
      if (fragment.y < minY) minY = fragment.y;

      // Calculate fragment bottom based on type
      // Image, Drawing, and Table fragments have a height property
      // Para and ListItem fragments do not have height in their contract
      let fragmentBottom = fragment.y;
      if (hasHeight(fragment)) {
        // Type guard ensures fragment.height exists
        fragmentBottom += fragment.height;
      } else {
        // Para and list-item fragments don't have a height property
        // Calculate height based on number of lines spanned by the fragment
        const lineCount = fragment.toLine - fragment.fromLine;
        fragmentBottom += lineCount * DEFAULT_PARAGRAPH_LINE_HEIGHT_PX;
      }

      if (fragmentBottom > maxY) maxY = fragmentBottom;
    }

    // Content takes space from minY to maxY
    const actualContentHeight = maxY - minY;
    const availableSpace = contentHeight - actualContentHeight;

    if (availableSpace <= 0) {
      continue; // Content fills or exceeds page, no adjustment needed
    }

    // Calculate Y offset based on vAlign
    let yOffset = 0;
    if (page.vAlign === 'center') {
      yOffset = availableSpace / 2;
    } else if (page.vAlign === 'bottom') {
      yOffset = availableSpace;
    } else if (page.vAlign === 'both') {
      // LIMITATION: 'both' (vertical justification) is currently treated as 'center'
      //
      // The 'both' value in OOXML means content should be vertically justified:
      // space should be distributed evenly between paragraphs/blocks throughout
      // the page (similar to text-align: justify but in the vertical direction).
      //
      // Full implementation would require:
      // 1. Identifying gaps between content blocks (paragraphs, tables, images)
      // 2. Calculating total inter-block spacing
      // 3. Distributing available space proportionally across all gaps
      // 4. Adjusting Y positions of each fragment based on cumulative spacing
      //
      // This would need significant refactoring of the layout flow to track
      // block boundaries and inter-block relationships during pagination.
      // For now, center alignment provides a reasonable approximation.
      yOffset = availableSpace / 2;
    }

    // Apply Y offset to all fragments on this page
    if (yOffset > 0) {
      for (const fragment of page.fragments) {
        fragment.y += yOffset;
      }
    }
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

/**
 * Lays out header or footer content within specified dimensional constraints.
 *
 * This function positions blocks (paragraphs, images, drawings) within a header or footer region,
 * handling page-relative anchor transformations and computing the actual height required by
 * visible content. Headers and footers are rendered within the content box but may contain
 * page-relative anchored objects that need coordinate transformation.
 *
 * @param blocks - The flow blocks to layout (paragraphs, images, drawings, etc.)
 * @param measures - Corresponding measurements for each block (must match blocks.length)
 * @param constraints - Dimensional constraints including width, height, and optional margins
 *
 * @returns A HeaderFooterLayout containing:
 *   - pages: Array of laid-out pages with positioned fragments
 *   - height: The actual height consumed by visible content
 *
 * @throws {Error} If blocks and measures arrays have different lengths
 * @throws {Error} If width or height constraints are not positive finite numbers
 *
 * Special handling for behindDoc anchored fragments:
 * - Anchored images/drawings with behindDoc=true are decorative background elements
 * - These fragments are excluded from height calculations if they fall outside a reasonable
 *   overflow range (4x the header/footer height or 192pt, whichever is larger)
 * - This prevents decorative elements with extreme offsets from inflating header/footer margins
 * - behindDoc fragments within the overflow range are still included to handle modest positioning
 * - All behindDoc fragments are still rendered in the layout; they're only excluded from height
 */
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

  // Allow modest behindDoc overflow but ignore extreme offsets that shouldn't drive margins.
  const maxBehindDocOverflow = Math.max(192, height * 4);
  const minBehindDocY = -maxBehindDocOverflow;
  const maxBehindDocY = height + maxBehindDocOverflow;

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

      // Exclude behindDoc anchored fragments with extreme offsets from height calculations.
      // Decorative background images/drawings in headers/footers should not inflate margins.
      // Fragments are still rendered in the layout; we only skip them when computing total height.
      // We allow modest overflow (within maxBehindDocOverflow) to handle reasonable positioning.
      const isAnchoredFragment =
        (fragment.kind === 'image' || fragment.kind === 'drawing') && fragment.isAnchored === true;
      if (isAnchoredFragment) {
        // Runtime validation: ensure block.kind matches fragment.kind before type assertion
        if (block.kind !== 'image' && block.kind !== 'drawing') {
          throw new Error(
            `Type mismatch: fragment kind is ${fragment.kind} but block kind is ${block.kind} for block ${block.id}`,
          );
        }
        const anchoredBlock = block as ImageBlock | DrawingBlock;
        if (anchoredBlock.anchor?.behindDoc && (fragment.y < minBehindDocY || fragment.y > maxBehindDocY)) {
          continue;
        }
      }

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

/**
 * Normalize and validate column layout configuration, computing individual column widths.
 *
 * Takes raw column layout parameters and the available content width, then calculates
 * the actual width each column should have after accounting for gaps. Handles edge cases
 * like invalid column counts, excessive gaps, and degenerate layouts.
 *
 * Algorithm:
 * 1. Validate and normalize column count (floor to integer, ensure >= 1)
 * 2. Validate and normalize gap width (ensure >= 0)
 * 3. Calculate total gap space: gap * (count - 1)
 * 4. Calculate per-column width: (contentWidth - totalGap) / count
 * 5. If resulting width is too small (≤ epsilon), fallback to single-column layout
 *
 * Edge cases handled:
 * - Undefined or missing input: Defaults to single column, no gap
 * - Invalid count (NaN, negative, zero): Defaults to 1
 * - Negative gap: Clamps to 0
 * - Column width too small (gaps consume all space): Falls back to single column
 * - Non-integer count: Floors to nearest integer
 *
 * @param input - The column layout configuration (count and gap) or undefined
 * @param contentWidth - The total available width for content in pixels (must be positive)
 * @returns Normalized column configuration with computed width per column
 * @example
 * // Two columns with 48px gap in 612px content area
 * normalizeColumns({ count: 2, gap: 48 }, 612)
 * // Returns { count: 2, gap: 48, width: 282 }
 *
 * @example
 * // Excessive gap causes fallback to single column
 * normalizeColumns({ count: 3, gap: 500 }, 600)
 * // Returns { count: 1, gap: 0, width: 600 }
 */
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

// Export page numbering utilities
export { formatPageNumber, computeDisplayPageNumber } from './pageNumbering.js';
export type { PageNumberFormat, DisplayPageInfo } from './pageNumbering.js';

// Export page token resolution utilities
export { resolvePageNumberTokens } from './resolvePageTokens.js';
export type { NumberingContext, ResolvePageTokensResult } from './resolvePageTokens.js';
