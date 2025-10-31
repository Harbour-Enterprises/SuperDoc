import { ENGINE_PAGINATION_INTERNALS } from '../core/helpers/engine-pagination-helpers.js';
import {
  PIXELS_PER_INCH,
  DEFAULT_PAGE_HEIGHT_IN_PX,
  DEFAULT_PAGE_MARGINS_IN_PX,
  DEFAULT_PAGE_BREAK_GAP_PX,
} from '../core/constants.js';
import { computeHtmlFieldSegments } from '../core/field-annotations-measurements/index.js';

const {
  snapshotMeasurementDocument,
  createFallbackRect,
  resolvePageWidthPx,
  resolveContentWidthPx,
  normalizeLayout,
  resolvePageLayoutForIndex,
  createPageEntry,
  computeNextVisualTop,
  checkForHardBreak,
  getExactBreakPosition,
  recordBreak,
  finalizePages,
} = ENGINE_PAGINATION_INTERNALS;

/**
 * Normalize and merge page margins with defaults.
 */
const normalizePageMargins = (marginsPx) => ({
  top: Number.isFinite(marginsPx?.top) ? marginsPx.top : DEFAULT_PAGE_MARGINS_IN_PX.top,
  bottom: Number.isFinite(marginsPx?.bottom) ? marginsPx.bottom : DEFAULT_PAGE_MARGINS_IN_PX.bottom,
  left: Number.isFinite(marginsPx?.left) ? marginsPx.left : DEFAULT_PAGE_MARGINS_IN_PX.left,
  right: Number.isFinite(marginsPx?.right) ? marginsPx.right : DEFAULT_PAGE_MARGINS_IN_PX.right,
});

/**
 * Calculate page dimensions based on container and explicit settings.
 */
const calculatePageDimensions = ({ dom, explicitPageWidthPx, baseMarginsPx }) => {
  const containerRect =
    typeof dom.getBoundingClientRect === 'function' ? dom.getBoundingClientRect() : createFallbackRect(dom);

  const pageWidthPx = resolvePageWidthPx({
    explicitWidthPx: explicitPageWidthPx,
    containerRect,
    dom,
  });

  const contentWidthPx = resolveContentWidthPx({
    pageWidthPx,
    baseMarginsPx,
    containerRect,
  });

  return { containerRect, pageWidthPx, contentWidthPx };
};

/**
 * Create a layout resolver function for resolving page layouts by index.
 */
const createLayoutResolver = ({ resolveHeaderFooter, baseMarginsPx, pageHeightPx }) => {
  return (pageIndex, options) =>
    normalizeLayout({
      layout: resolvePageLayoutForIndex({
        pageIndex,
        options,
        resolveHeaderFooter,
        baseMarginsPx,
        pageHeightPx,
      }),
      baseMarginsPx,
      pageHeightPx,
    });
};

/**
 * Initialize pagination state object.
 */
const initializePaginationState = ({
  initialLayout,
  baseMarginsPx,
  pageHeightPx,
  pageWidthPx,
  contentWidthPx,
  docContentSize,
}) => ({
  pages: [],
  pageStart: 0,
  pageIndex: 0,
  blockIndex: 0,
  lastBreakPos: 0,
  pageLayout: initialLayout,
  baseMarginsPx,
  pageHeightPx: Number.isFinite(initialLayout?.pageHeightPx) ? initialLayout.pageHeightPx : pageHeightPx,
  pageWidthPx,
  contentWidthPx,
  pageGapPx: Number.isFinite(initialLayout?.pageGapPx) ? initialLayout.pageGapPx : DEFAULT_PAGE_BREAK_GAP_PX,
  visualStackTop: 0,
  currentFittedBottomPx: null,
  docEndPos: docContentSize,
});

/**
 * Create and add the first page entry to pagination.
 */
const addFirstPage = (pagination, initialLayout) => {
  const firstPageEntry = createPageEntry({
    pagination,
    pageIndex: 0,
    layout: initialLayout,
    pageStartPx: pagination.pageStart,
    breakPos: -1,
    breakTop: null,
    visualTopPx: pagination.visualStackTop,
  });

  if (firstPageEntry) {
    pagination.pages.push(firstPageEntry);
    pagination.visualStackTop = computeNextVisualTop(
      firstPageEntry.pageTopOffsetPx,
      firstPageEntry.metrics?.pageHeightPx,
      firstPageEntry.pageGapPx,
    );
  }
};

/**
 * Handle a forced page break.
 */
const handleForcedBreak = ({ forcedBreak, pagination, resolveLayout }) => {
  const forcedBottom = Number.isFinite(forcedBreak.bottom) ? forcedBreak.bottom : forcedBreak.top;
  if (Number.isFinite(forcedBottom)) {
    pagination.currentFittedBottomPx = forcedBottom;
  }
  recordBreak({
    pagination,
    breakTop: forcedBottom,
    breakBottom: forcedBottom,
    lastFitTop: Number.isFinite(forcedBreak.top) ? forcedBreak.top : forcedBottom,
    breakPos: forcedBreak.pos,
    resolveLayout,
  });
  pagination.currentFittedBottomPx = null;
};

/**
 * Handle block overflow that exceeds page limit.
 */
const handleBlockOverflow = ({ view, block, containerRect, pageLimit, pagination, blockTop, resolveLayout }) => {
  const exactBreak = getExactBreakPosition({
    view,
    block,
    containerRect,
    pageLimit,
    pagination,
  });

  const fallbackBottom = blockTop > pagination.pageStart ? Math.min(blockTop, pageLimit) : pageLimit;
  const breakBottom = Number.isFinite(exactBreak?.fittedBottom) ? exactBreak.fittedBottom : fallbackBottom;
  const fittedTop = Number.isFinite(exactBreak?.fittedTop) ? exactBreak.fittedTop : breakBottom;
  const breakPos = Number.isFinite(exactBreak?.pos) ? exactBreak.pos : null;
  const breakY = Number.isFinite(exactBreak?.breakY) ? exactBreak.breakY : null;

  pagination.currentFittedBottomPx = breakBottom;
  recordBreak({
    pagination,
    breakTop: fittedTop, // FIX: Use fittedTop, not breakBottom!
    breakBottom,
    lastFitTop: fittedTop,
    breakPos,
    breakY,
    resolveLayout,
  });
  pagination.currentFittedBottomPx = null;
};

/**
 * Track that block fits within current page.
 */
const trackFittedBlock = ({ blockBottom, pageLimit, pagination }) => {
  const fittedBottom = Math.min(blockBottom, pageLimit);
  if (Number.isFinite(fittedBottom)) {
    const current = Number.isFinite(pagination.currentFittedBottomPx)
      ? pagination.currentFittedBottomPx
      : pagination.pageStart;
    pagination.currentFittedBottomPx = Math.max(current, fittedBottom);
  }
};

/**
 * Process a single block and determine if it needs pagination.
 */
const processBlock = ({ block, view, containerRect, pagination, resolveLayout }) => {
  const layout = pagination.pageLayout;
  if (!layout || !Number.isFinite(layout.usableHeightPx) || layout.usableHeightPx <= 0) {
    return false; // Stop processing
  }

  const blockRect = block.getBoundingClientRect();
  const blockTop = blockRect.top - containerRect.top;
  const blockBottom = blockRect.bottom - containerRect.top;
  const pageLimit = pagination.pageStart + layout.usableHeightPx;

  // Skip blocks that are completely above current page
  if (blockBottom <= pagination.pageStart) {
    return true; // Continue to next block
  }

  // Check for forced/hard breaks
  const forcedBreak = checkForHardBreak(view, block, containerRect, pagination.pageStart, pageLimit);
  if (forcedBreak) {
    handleForcedBreak({ forcedBreak, pagination, resolveLayout });
    return true;
  }

  // Handle block overflow
  if (blockBottom > pageLimit) {
    handleBlockOverflow({ view, block, containerRect, pageLimit, pagination, blockTop, resolveLayout });
    return true;
  }

  trackFittedBlock({ blockBottom, pageLimit, pagination });
  return true;
};

/**
 * Process all blocks in the document for pagination.
 */
const processDocumentBlocks = ({ dom, view, containerRect, pagination, resolveLayout }) => {
  const blocks = Array.from(dom.children || []);

  while (pagination.blockIndex < blocks.length) {
    const block = blocks[pagination.blockIndex];
    if (!block) {
      pagination.blockIndex += 1;
      continue;
    }

    const shouldContinue = processBlock({ block, view, containerRect, pagination, resolveLayout });
    if (!shouldContinue) {
      break;
    }

    pagination.blockIndex += 1;
  }
};

/**
 * Finalize the last page's break information.
 */
const finalizeTrailingPage = (pagination) => {
  const trailingPage = pagination.pages[pagination.pages.length - 1] ?? null;
  if (!trailingPage || !Number.isFinite(pagination.currentFittedBottomPx)) {
    return;
  }

  const fittedBottom = pagination.currentFittedBottomPx;
  trailingPage.break = {
    ...(trailingPage.break ?? {}),
    fittedBottom,
    bottom: Number.isFinite(trailingPage.break?.bottom) ? trailingPage.break.bottom : fittedBottom,
    top: Number.isFinite(trailingPage.break?.top) ? trailingPage.break.top : fittedBottom,
  };

  if (!Number.isFinite(trailingPage.break?.fittedTop)) {
    trailingPage.break.fittedTop = fittedBottom;
  }
};

/**
 * Create the final layout package with pages and field segments.
 */
const createLayoutPackage = ({ documentSnapshot, units, finalizedPages, fieldSegments }) => ({
  document: documentSnapshot,
  units,
  pages: finalizedPages,
  fieldSegments: Array.isArray(fieldSegments) ? fieldSegments : [],
});

/**
 * Generate pagination metadata for the provided measurement editor.
 * @param {import('@core/Editor.js').Editor} measurementEditor - Active measurement editor instance.
 * @param {Object} [params={}] - Pagination configuration.
 * @param {number} [params.pageHeightPx] - Target page height in pixels.
 * @param {number|null} [params.pageWidthPx] - Target page width in pixels.
 * @param {Object} [params.marginsPx] - Page margins in pixels.
 * @param {Function} [params.resolveHeaderFooter] - Resolver for header/footer measurements per page.
 * @returns {{document:Object, units:{unit:string,dpi:number}, pages:Array, fieldSegments?:Array}} Pagination package.
 */
export const generatePageBreaks = (measurementEditor, params = {}) => {
  // Extract and validate editor state
  const { view } = measurementEditor ?? {};
  const { dom } = view ?? {};
  const documentSnapshot = snapshotMeasurementDocument(measurementEditor);
  const docNode = view?.state?.doc ?? null;
  const docContentSize = Number.isFinite(docNode?.content?.size) ? docNode.content.size : null;

  const units = {
    unit: 'px',
    dpi: PIXELS_PER_INCH,
  };

  // Early return if no DOM available
  if (!dom) {
    return {
      document: documentSnapshot,
      units,
      pages: [],
    };
  }

  // Extract and normalize parameters
  const {
    pageHeightPx = DEFAULT_PAGE_HEIGHT_IN_PX,
    pageWidthPx: explicitPageWidthPx,
    marginsPx = DEFAULT_PAGE_MARGINS_IN_PX,
    resolveHeaderFooter,
  } = params;

  const baseMarginsPx = normalizePageMargins(marginsPx);
  const { containerRect, pageWidthPx, contentWidthPx } = calculatePageDimensions({
    dom,
    explicitPageWidthPx,
    baseMarginsPx,
  });

  // Setup layout resolver and initial state
  const resolveLayout = createLayoutResolver({ resolveHeaderFooter, baseMarginsPx, pageHeightPx });
  const initialLayout = resolveLayout(0, { isLastPage: false });
  const pagination = initializePaginationState({
    initialLayout,
    baseMarginsPx,
    pageHeightPx,
    pageWidthPx,
    contentWidthPx,
    docContentSize,
  });

  // Create first page
  addFirstPage(pagination, initialLayout);

  // Process document blocks for pagination
  const hasUsableHeight = Number.isFinite(initialLayout?.usableHeightPx) && initialLayout.usableHeightPx > 0;
  if (hasUsableHeight) {
    processDocumentBlocks({ dom, view, containerRect, pagination, resolveLayout });
  }

  // Finalize trailing page and all pages
  finalizeTrailingPage(pagination);
  const finalizedPages = finalizePages({
    pagination,
    resolveLayout,
    view,
  });

  const fieldSegments = computeHtmlFieldSegments({
    view,
    containerRect,
    pages: finalizedPages,
  });

  // Create and return layout package
  return createLayoutPackage({
    documentSnapshot,
    units,
    finalizedPages,
    fieldSegments,
  });
};
