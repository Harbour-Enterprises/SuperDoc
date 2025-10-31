import { DEFAULT_PAGE_HEIGHT_IN_PX, DEFAULT_PAGE_MARGINS_IN_PX } from '@measurement-engine';
import { getPageCountFromBreaks } from '../helpers/page-bands.js';

const HARD_BREAK_NODE_NAME = 'hardBreak';
const PAGE_BREAK_TYPE = 'page';

/**
 * Check if a position is valid for creating a page break.
 *
 * @param {number} pos Position to validate
 * @param {number} docSize Document size
 * @returns {boolean} True if position is valid
 * @private
 */
const isValidBreakPosition = (pos, docSize) => {
  return Number.isFinite(pos) && pos > 0 && pos < docSize;
};

/**
 * Build a map of page break positions to their corresponding entries.
 *
 * @param {Array} pageBreakEntries Array of page break entries
 * @returns {Map<number, object>} Map of positions to entries
 * @private
 */
const buildBreakMap = (pageBreakEntries) => {
  const breakMap = new Map();
  for (const entry of pageBreakEntries) {
    const key = resolveBreakPosition(entry);
    if (key != null) {
      breakMap.set(key, entry);
    }
  }
  return breakMap;
};

/**
 * Create a field segment object with safe defaults.
 *
 * @param {object} field Field entry
 * @param {object} segment Segment entry
 * @returns {object} Field segment with all properties
 * @private
 */
const createFieldSegment = (field, segment) => {
  const rect = field?.rect ?? {};
  return {
    pos: field?.pos ?? null,
    type: field?.attrs?.type ?? null,
    fieldId: field?.attrs?.fieldId ?? null,
    rectLeftPx: rect?.leftPx ?? 0,
    rectWidthPx: rect?.widthPx ?? 0,
    rectHeightPx: rect?.heightPx ?? 0,
    offsetWithinFieldPx: segment?.offsetWithinFieldPx ?? 0,
    topPx: segment?.topPx ?? 0,
    heightPx: segment?.heightPx ?? 0,
  };
};

/**
 * Group field segments by page index.
 *
 * @param {Array} rawFieldSegments Array of field segments
 * @returns {Map<number, Array>} Map of page indices to field segments
 * @private
 */
const groupFieldSegmentsByPage = (rawFieldSegments) => {
  const fieldSegmentsByPage = new Map();

  for (const field of rawFieldSegments) {
    const segments = Array.isArray(field?.segments) ? field.segments : [];

    for (const segment of segments) {
      if (!Number.isInteger(segment?.pageIndex)) continue;

      const pageIndex = segment.pageIndex;
      const bucket = fieldSegmentsByPage.get(pageIndex) ?? [];
      bucket.push(createFieldSegment(field, segment));
      fieldSegmentsByPage.set(pageIndex, bucket);
    }
  }

  return fieldSegmentsByPage;
};

/**
 * Merge measured breaks with forced page breaks.
 *
 * @param {Map} breakMap Map of measured break positions
 * @param {import('prosemirror-view').EditorView} view Editor view
 * @param {number} docSize Document size
 * @returns {Array<number>} Sorted array of unique break positions
 * @private
 */
const mergeBreakPositions = (breakMap, view, docSize) => {
  const mergedPositions = new Set();

  // Add measured breaks
  for (const pos of breakMap.keys()) {
    if (isValidBreakPosition(pos, docSize)) {
      mergedPositions.add(pos);
    }
  }

  // Add forced page breaks
  for (const pos of collectForcedAnchors(view)) {
    if (isValidBreakPosition(pos, docSize)) {
      mergedPositions.add(pos);
    }
  }

  return Array.from(mergedPositions).sort((a, b) => a - b);
};

/**
 * Build pages from sorted break positions.
 *
 * @param {Array<number>} sortedBreakPositions Sorted array of break positions
 * @param {Map} breakMap Map of positions to break entries
 * @param {Map} fieldSegmentsByPage Map of page indices to field segments
 * @param {import('prosemirror-view').EditorView} view Editor view
 * @param {object} metrics Normalized metrics
 * @param {number} docSize Document size
 * @returns {Array} Array of page objects
 * @private
 */
const buildPagesFromBreaks = (sortedBreakPositions, breakMap, fieldSegmentsByPage, view, metrics, docSize) => {
  const pages = [];

  // If no breaks, create a single page for the entire document
  if (sortedBreakPositions.length === 0) {
    pages.push({
      pageIndex: 0,
      from: 0,
      to: docSize,
      boundary: deriveBoundaryFromContainer(view, metrics, 0),
      break: null,
      overflowBlock: null,
      fieldSegments: fieldSegmentsByPage.get(0) ?? [],
    });
    return pages;
  }

  // Build pages from break positions
  let from = 0;
  for (let i = 0; i < sortedBreakPositions.length; i += 1) {
    const to = sortedBreakPositions[i];
    const entry = breakMap.get(to) ?? null;

    pages.push({
      pageIndex: i,
      from,
      to,
      boundary: deriveBoundaryFromContainer(view, metrics, i),
      break: entry?.break ?? null,
      overflowBlock: entry?.overflowBlock ?? null,
      fieldSegments: fieldSegmentsByPage.get(i) ?? [],
    });
    from = to;
  }

  // Add final page from last break to end of document
  const lastPageIndex = sortedBreakPositions.length;
  pages.push({
    pageIndex: lastPageIndex,
    from,
    to: docSize,
    boundary: deriveBoundaryFromContainer(view, metrics, lastPageIndex),
    break: null,
    overflowBlock: null,
    fieldSegments: fieldSegmentsByPage.get(lastPageIndex) ?? [],
  });

  return pages;
};

/**
 * Pad pages array to match expected page count.
 * Mutates the pages array in place.
 *
 * @param {Array} pages Array of page objects to pad
 * @param {number} expectedPageCount Expected number of pages
 * @param {Map} fieldSegmentsByPage Map of page indices to field segments
 * @param {import('prosemirror-view').EditorView} view Editor view
 * @param {object} metrics Normalized metrics
 * @param {number} docSize Document size
 * @private
 */
const padPagesToExpectedCount = (pages, expectedPageCount, fieldSegmentsByPage, view, metrics, docSize) => {
  while (pages.length < expectedPageCount) {
    const pageIndex = pages.length;
    const lastPos = pages.length > 0 ? pages[pages.length - 1].to : docSize;

    pages.push({
      pageIndex,
      from: lastPos,
      to: lastPos,
      boundary: deriveBoundaryFromContainer(view, metrics, pageIndex),
      break: null,
      overflowBlock: null,
      fieldSegments: fieldSegmentsByPage.get(pageIndex) ?? [],
    });
  }
};

/**
 * Build a page layout model using measured break positions.
 * The model is consumed by the pagination overlay to draw page frames.
 *
 * @param {import('prosemirror-view').EditorView} view
 * @param {{ pageHeightPx?: number, marginsPx?: {top:number,bottom:number,left:number,right:number} }} metrics
 * @param {{ pageBreaks?: Array<{ break?: { pos?: number } }> }} [options]
 * @returns {{ pages: Array<{ pageIndex:number, from:number, to:number, boundary:{ pageTop:number, pageBottom:number, pageHeightPx:number, marginsPx:{top:number,bottom:number,left:number,right:number} }, break?:object|null, overflowBlock?:object|null }>, metrics: { pageHeightPx:number, marginsPx:{top:number,bottom:number,left:number,right:number} } }}
 */
export function buildLayoutModel(view, metrics = {}, options = {}) {
  const norm = normalizedMetrics(metrics);

  if (!view?.state) {
    return { pages: [], metrics: norm };
  }

  const docSize = view.state.doc?.content?.size ?? 0;
  const pageBreakEntries = Array.isArray(options.pageBreaks) ? options.pageBreaks : [];
  const rawFieldSegments = Array.isArray(options.fieldSegments) ? options.fieldSegments : [];

  // Build lookup maps
  const breakMap = buildBreakMap(pageBreakEntries);
  const fieldSegmentsByPage = groupFieldSegmentsByPage(rawFieldSegments);

  // Merge and sort break positions
  const sortedBreakPositions = mergeBreakPositions(breakMap, view, docSize);

  // Build pages from break positions
  const pages = buildPagesFromBreaks(sortedBreakPositions, breakMap, fieldSegmentsByPage, view, norm, docSize);

  // Ensure page count matches expected count
  const expectedPageCount = getPageCountFromBreaks(pageBreakEntries);
  padPagesToExpectedCount(pages, expectedPageCount, fieldSegmentsByPage, view, norm, docSize);

  return { pages, metrics: norm };
}

/**
 * Resolve a break position from various possible entry formats.
 *
 * @param {object} entry Page break entry
 * @returns {number|null} Resolved position or null
 * @private
 */
const resolveBreakPosition = (entry) => {
  if (!entry) return null;
  if (Number.isFinite(entry?.pos)) return entry.pos;
  if (Number.isFinite(entry?.break?.pos)) return entry.break.pos;
  if (Number.isFinite(entry?.boundary?.to)) return entry.boundary.to;
  if (Number.isFinite(entry?.to)) return entry.to;
  return null;
};

/**
 * Normalize metrics with default fallbacks.
 *
 * @param {object} metrics Raw metrics object
 * @returns {object} Normalized metrics
 * @private
 */
const normalizedMetrics = (metrics = {}) => {
  return {
    pageHeightPx: Number.isFinite(metrics.pageHeightPx) ? metrics.pageHeightPx : DEFAULT_PAGE_HEIGHT_IN_PX,
    marginsPx: {
      top: resolveMargin(metrics.marginsPx?.top, DEFAULT_PAGE_MARGINS_IN_PX.top),
      bottom: resolveMargin(metrics.marginsPx?.bottom, DEFAULT_PAGE_MARGINS_IN_PX.bottom),
      left: resolveMargin(metrics.marginsPx?.left, DEFAULT_PAGE_MARGINS_IN_PX.left),
      right: resolveMargin(metrics.marginsPx?.right, DEFAULT_PAGE_MARGINS_IN_PX.right),
    },
  };
};

/**
 * Resolve a margin value with fallback.
 *
 * @param {number} value Margin value
 * @param {number} fallback Fallback value
 * @returns {number} Resolved margin
 * @private
 */
const resolveMargin = (value, fallback) => {
  return Number.isFinite(value) ? value : fallback;
};

/**
 * Create a boundary object for a page.
 *
 * @param {number} pageHeightPx Page height in pixels
 * @param {object} marginsPx Margins object
 * @param {number} pageIndex Page index
 * @param {number} offsetTop Top offset (default 0)
 * @returns {object} Boundary object
 * @private
 */
const createBoundary = (pageHeightPx, marginsPx, pageIndex, offsetTop = 0) => {
  return {
    pageTop: offsetTop + pageIndex * pageHeightPx + marginsPx.top,
    pageBottom: offsetTop + (pageIndex + 1) * pageHeightPx - marginsPx.bottom,
    pageHeightPx,
    marginsPx,
  };
};

/**
 * Derive page boundary from container element.
 *
 * @param {import('prosemirror-view').EditorView} view Editor view
 * @param {object} metrics Normalized metrics
 * @param {number} pageIndex Page index
 * @returns {object} Boundary object
 * @private
 */
const deriveBoundaryFromContainer = (view, metrics, pageIndex) => {
  const { pageHeightPx, marginsPx } = metrics;

  try {
    const rect = view.dom?.getBoundingClientRect?.();
    if (rect) {
      return createBoundary(pageHeightPx, marginsPx, pageIndex, rect.top);
    }
  } catch {}

  return createBoundary(pageHeightPx, marginsPx, pageIndex);
};

/**
 * Collect forced page break positions from hard break nodes.
 *
 * @param {import('prosemirror-view').EditorView} view Editor view
 * @returns {Array<number>} Sorted, unique array of forced break positions
 * @private
 */
const collectForcedAnchors = (view) => {
  const positions = new Set();

  try {
    view.state.doc.descendants((node, pos) => {
      const nodeName = node?.type?.name ?? '';
      if (nodeName === HARD_BREAK_NODE_NAME) {
        const breakType = node?.attrs?.pageBreakType ?? node?.attrs?.lineBreakType ?? null;
        if (breakType === PAGE_BREAK_TYPE) {
          positions.add(pos);
        }
      }
      return true;
    });
  } catch {}

  return Array.from(positions).sort((a, b) => a - b);
};
