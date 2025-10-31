import {
  DEFAULT_PAGE_HEIGHT_IN_PX,
  DEFAULT_PAGE_WIDTH_IN_PX,
  DEFAULT_PAGE_MARGINS_IN_PX,
  DEFAULT_PAGE_BREAK_GAP_PX,
} from '../../constants.js';
import { computeNextVisualTop, calculateSpacingAfterPage, getSafeNumber } from './common.js';
import { normalizeLayout, createHeaderFooterAreas } from './layout.js';
import { deriveSpacingSegments } from './table-overflow.js';
import { clampToDoc } from './utils.js';

/**
 * Finalize the current page and open the next entry in the pagination state.
 * @param {Object} options - Break configuration.
 * @param {Object} options.pagination - Mutable pagination accumulator.
 * @param {number|null} options.breakTop - Calculated top value for the break.
 * @param {number|null} [options.breakBottom=null] - Calculated bottom value for the break.
 * @param {number|null} [options.breakPos=null] - Document position representing the break.
 * @param {number|null} [options.breakY=null] - Absolute Y coordinate of the break for table spacing.
 * @param {Function} options.resolveLayout - Layout resolver function.
 * @param {number|null} [options.lastFitTop=null] - Last fitted top used for spacing calculations.
 * @returns {void}
 */
export const recordBreak = ({
  pagination,
  breakTop,
  breakBottom = null,
  breakPos = null,
  breakY = null,
  resolveLayout,
  lastFitTop = null,
}) => {
  const safePageStart = pagination.pageStart;
  const rawBottom = Number.isFinite(breakBottom) ? breakBottom : Number.isFinite(breakTop) ? breakTop : safePageStart;
  let resolvedBreakBottom = Math.max(rawBottom, safePageStart);
  let safeBreakTop = Number.isFinite(lastFitTop) ? Math.min(lastFitTop, resolvedBreakBottom) : resolvedBreakBottom;
  const resolvedPos = Number.isFinite(breakPos) && breakPos >= 0 ? breakPos : (pagination.lastBreakPos ?? 0);
  const currentPage = pagination.pages[pagination.pageIndex];
  const currentLayout = pagination.pageLayout;
  const usableHeightPx = Number.isFinite(currentLayout?.usableHeightPx) ? currentLayout.usableHeightPx : null;
  const contentBottomBoundary = Number.isFinite(usableHeightPx) ? safePageStart + usableHeightPx : null;

  if (Number.isFinite(contentBottomBoundary)) {
    resolvedBreakBottom = Math.min(resolvedBreakBottom, contentBottomBoundary);
    safeBreakTop = Math.min(safeBreakTop, resolvedBreakBottom);
  }

  if (currentPage) {
    currentPage.break = {
      ...currentPage.break,
      startOffsetPx: safePageStart,
      pos: resolvedPos,
    };
    currentPage.break.top = safeBreakTop;
    currentPage.break.bottom = resolvedBreakBottom;
    currentPage.break.fittedTop = safeBreakTop;
    currentPage.break.fittedBottom = resolvedBreakBottom;
    if (Number.isFinite(breakY)) {
      currentPage.break.breakY = breakY; // Absolute Y coordinate for table spacing
    }
    if (Number.isFinite(contentBottomBoundary)) {
      currentPage.pageBottomSpacingPx = Math.max(contentBottomBoundary - safeBreakTop, 0);
    }
  }

  if (Number.isFinite(breakPos)) {
    pagination.lastBreakPos = breakPos;
  }

  // Get next page layout to calculate spacing
  const nextPageIndex = pagination.pageIndex + 1;
  const nextLayoutCandidate =
    typeof resolveLayout === 'function'
      ? resolveLayout(nextPageIndex, { isLastPage: false })
      : normalizeLayout({
          layout: null,
          baseMarginsPx: pagination.baseMarginsPx,
          pageHeightPx: pagination.pageHeightPx,
        });

  // Set next page start to breakTop (NOT breakTop + spacing!)
  // The spacing widget will visually push content down based on accumulated footer/header spacing and page gaps tracked on pagination.
  // pageStart is the internal coordinate where page 2 content begins (in pagination coordinate system).
  pagination.pageStart = safeBreakTop;

  pagination.pageIndex += 1;
  pagination.blockIndex -= 1;

  pagination.pageLayout = nextLayoutCandidate;
  if (Number.isFinite(nextLayoutCandidate?.pageHeightPx)) {
    pagination.pageHeightPx = nextLayoutCandidate.pageHeightPx;
  }
  if (Number.isFinite(nextLayoutCandidate?.pageGapPx)) {
    pagination.pageGapPx = nextLayoutCandidate.pageGapPx;
  }

  const nextPageEntry = createPageEntry({
    pagination,
    pageIndex: pagination.pageIndex,
    layout: nextLayoutCandidate,
    pageStartPx: pagination.pageStart,
    breakPos: -1,
    breakTop: null,
    visualTopPx: pagination.visualStackTop,
  });

  if (nextPageEntry) {
    pagination.pages.push(nextPageEntry);
    pagination.visualStackTop = computeNextVisualTop(
      nextPageEntry.pageTopOffsetPx,
      nextPageEntry.metrics?.pageHeightPx,
      nextPageEntry.pageGapPx,
    );
  }
  pagination.currentFittedBottomPx = null;
};

/**
 * Prepare the finalized list of page entries after pagination completes.
 * @param {Object} options - Finalization configuration.
 * @param {Object} options.pagination - Current pagination accumulator.
 * @param {Function} options.resolveLayout - Layout resolver function.
 * @param {import('prosemirror-view').EditorView} options.view - Editor view for spacing calculations.
 * @returns {Array} Array of normalized page entries.
 */
export const finalizePages = ({ pagination, resolveLayout, view }) => {
  const pages = pagination.pages.filter(Boolean);
  if (!pages.length) {
    return pages;
  }

  const lastEntryIndex = pages.length - 1;
  const lastEntry = pages[lastEntryIndex] ?? null;
  const lastPageIndex = Number.isInteger(lastEntry?.pageIndex) ? lastEntry.pageIndex : lastEntryIndex;
  const lastLayoutCandidate =
    typeof resolveLayout === 'function'
      ? resolveLayout(lastPageIndex, { isLastPage: true })
      : normalizeLayout({
          layout: pagination.pageLayout,
          baseMarginsPx: pagination.baseMarginsPx,
          pageHeightPx: pagination.pageHeightPx,
        });

  const previousPageHeightPx = pagination.pageHeightPx;
  const previousPageGapPx = pagination.pageGapPx;
  if (Number.isFinite(lastLayoutCandidate?.pageHeightPx)) {
    pagination.pageHeightPx = lastLayoutCandidate.pageHeightPx;
  }
  if (Number.isFinite(lastLayoutCandidate?.pageGapPx)) {
    pagination.pageGapPx = lastLayoutCandidate.pageGapPx;
  }

  const lastPageStartPx = getSafeNumber(
    lastEntry?.break?.startOffsetPx,
    lastPageIndex === 0 ? 0 : pagination.pageStart,
  );
  const fallbackDocEndPos = Number.isFinite(pagination.docEndPos) ? pagination.docEndPos : -1;
  const lastBreakPos =
    Number.isFinite(lastEntry?.break?.pos) && lastEntry.break.pos >= 0 ? lastEntry.break.pos : fallbackDocEndPos;
  const lastBreakTop = Number.isFinite(lastEntry?.break?.top) ? lastEntry.break.top : null;
  const lastBreakBottom = Number.isFinite(lastEntry?.break?.bottom) ? lastEntry.break.bottom : lastBreakTop;
  const lastBreakFittedTop = Number.isFinite(lastEntry?.break?.fittedTop) ? lastEntry.break.fittedTop : null;

  const refreshedLastEntry = createPageEntry({
    pagination,
    pageIndex: lastPageIndex,
    layout: lastLayoutCandidate,
    pageStartPx: lastPageStartPx,
    breakPos: lastBreakPos,
    breakTop: lastBreakTop,
    breakBottom: lastBreakBottom,
    breakFittedTop: lastBreakFittedTop,
    visualTopPx: Number.isFinite(lastEntry?.pageTopOffsetPx) ? lastEntry.pageTopOffsetPx : 0,
  });

  pages[lastEntryIndex] = refreshedLastEntry;
  pagination.pages = pages;

  pagination.pageHeightPx = previousPageHeightPx;
  pagination.pageGapPx = previousPageGapPx;

  const doc = view?.state?.doc ?? null;
  const docSize = doc?.content?.size ?? null;

  // Calculate spacing after each page (except the last one)
  pages.forEach((page, index) => {
    if (index === pages.length - 1) {
      // Last page has no spacing after it
      page.spacingAfterPx = 0;
      page.spacingSegments = [];
      return;
    }

    const nextPage = pages[index + 1];
    page.spacingAfterPx = calculateSpacingAfterPage(page, nextPage, page.pageGapPx);

    const basePos = Number.isFinite(page?.break?.pos) ? clampToDoc(page.break.pos, docSize) : null;
    const breakY = Number.isFinite(page?.break?.breakY) ? page.break.breakY : null;

    if (Number.isFinite(page.spacingAfterPx) && page.spacingAfterPx > 0 && basePos != null) {
      const spacingPageHeightPx = Number.isFinite(page?.metrics?.pageHeightPx)
        ? page.metrics.pageHeightPx
        : pagination.pageHeightPx;
      const segments = deriveSpacingSegments({
        view,
        doc,
        basePos,
        breakY,
        docSize,
        pageHeightPx: spacingPageHeightPx,
      });
      page.spacingSegments = segments;
    } else {
      page.spacingSegments = basePos != null ? [basePos] : [];
    }
  });

  return pages;
};

/**
 * Create a normalized page entry record containing metrics and header/footer regions.
 * @param {Object} options - Creation options.
 * @param {Object} options.pagination - Pagination accumulator.
 * @param {number} options.pageIndex - Index of the page being created.
 * @param {Object|null} options.layout - Layout information for the page.
 * @param {number} options.pageStartPx - Page start offset in pixels.
 * @param {number} options.breakPos - Document position at which the page breaks.
 * @param {number|null} options.breakTop - Break top coordinate.
 * @param {number|null} options.breakBottom - Break bottom coordinate.
 * @param {number|null} options.breakFittedTop - Fitted top coordinate.
 * @param {number|null} options.visualTopPx - Visual stacking offset in pixels.
 * @returns {Object} Page entry with metrics and layout metadata.
 */
export const createPageEntry = ({
  pagination,
  pageIndex,
  layout,
  pageStartPx,
  breakPos,
  breakTop,
  breakBottom,
  breakFittedTop,
  visualTopPx,
}) => {
  const normalizedLayout = normalizeLayout({
    layout,
    baseMarginsPx: pagination.baseMarginsPx,
    pageHeightPx: pagination.pageHeightPx,
  });

  const marginTopPx = getSafeNumber(normalizedLayout.margins.top, pagination.baseMarginsPx.top);
  const marginBottomPx = getSafeNumber(normalizedLayout.margins.bottom, pagination.baseMarginsPx.bottom);
  const marginLeftPx = getSafeNumber(pagination.baseMarginsPx.left, DEFAULT_PAGE_MARGINS_IN_PX.left);
  const marginRightPx = getSafeNumber(pagination.baseMarginsPx.right, DEFAULT_PAGE_MARGINS_IN_PX.right);
  const layoutPageGapPx = Number.isFinite(normalizedLayout.pageGapPx) ? normalizedLayout.pageGapPx : null;
  const pageGapPx = Number.isFinite(layoutPageGapPx)
    ? layoutPageGapPx
    : Number.isFinite(pagination.pageGapPx)
      ? pagination.pageGapPx
      : DEFAULT_PAGE_BREAK_GAP_PX;
  const pageTopOffsetPx = Number.isFinite(visualTopPx) ? visualTopPx : 0;

  const breakInfo = {
    startOffsetPx: getSafeNumber(pageStartPx, 0),
    pos: Number.isFinite(breakPos) ? breakPos : -1,
  };
  if (Number.isFinite(breakTop)) {
    breakInfo.top = breakTop;
  }
  if (Number.isFinite(breakBottom)) {
    breakInfo.bottom = breakBottom;
    breakInfo.fittedBottom = breakBottom;
  }
  if (Number.isFinite(breakFittedTop)) {
    breakInfo.fittedTop = breakFittedTop;
  }

  const contentStartPx = Number.isFinite(breakInfo.startOffsetPx) ? breakInfo.startOffsetPx : null;
  const usableHeightPx = Number.isFinite(normalizedLayout.usableHeightPx) ? normalizedLayout.usableHeightPx : null;
  const contentBottomBoundaryPx =
    Number.isFinite(contentStartPx) && Number.isFinite(usableHeightPx) ? contentStartPx + usableHeightPx : null;
  const fittedBottomPx = Number.isFinite(breakInfo.fittedBottom)
    ? breakInfo.fittedBottom
    : Number.isFinite(breakInfo.top)
      ? breakInfo.top
      : null;
  const resolvedFittedBottomPx =
    Number.isFinite(contentBottomBoundaryPx) && Number.isFinite(fittedBottomPx)
      ? Math.min(fittedBottomPx, contentBottomBoundaryPx)
      : fittedBottomPx;
  if (Number.isFinite(resolvedFittedBottomPx)) {
    breakInfo.fittedBottom = resolvedFittedBottomPx;
    if (Number.isFinite(breakInfo.bottom)) {
      breakInfo.bottom = Math.min(breakInfo.bottom, resolvedFittedBottomPx);
    }
  }
  const bottomCandidatePx = Number.isFinite(breakInfo.fittedBottom)
    ? breakInfo.fittedBottom
    : Number.isFinite(fittedBottomPx)
      ? fittedBottomPx
      : null;

  let pageBottomSpacingPx =
    Number.isFinite(contentBottomBoundaryPx) && Number.isFinite(bottomCandidatePx)
      ? Math.max(contentBottomBoundaryPx - bottomCandidatePx, 0)
      : null;

  if (Number.isFinite(pageBottomSpacingPx)) {
    if (pageBottomSpacingPx < 0.5) {
      pageBottomSpacingPx = 0;
    } else {
      pageBottomSpacingPx = Math.round(pageBottomSpacingPx * 100) / 100;
    }
  }

  const headerFooterAreas = createHeaderFooterAreas({
    sections: normalizedLayout.sections,
    marginTopPx,
    marginBottomPx,
    marginLeftPx,
    marginRightPx,
  });

  const headerHeightPx = getSafeNumber(
    headerFooterAreas.header?.heightPx,
    headerFooterAreas.header?.metrics?.effectiveHeightPx,
    marginTopPx,
  );
  const footerHeightPx = getSafeNumber(
    headerFooterAreas.footer?.heightPx,
    headerFooterAreas.footer?.metrics?.effectiveHeightPx,
    marginBottomPx,
  );

  const contentArea = {
    startPx: Number.isFinite(contentStartPx) ? contentStartPx : null,
    endPx: Number.isFinite(contentBottomBoundaryPx) ? contentBottomBoundaryPx : null,
    usableHeightPx: Number.isFinite(usableHeightPx) ? usableHeightPx : null,
  };

  const resolvedPageHeightPx = getSafeNumber(
    normalizedLayout.pageHeightPx,
    pagination.pageHeightPx,
    DEFAULT_PAGE_HEIGHT_IN_PX,
  );

  const pageEntry = {
    pageIndex,
    break: breakInfo,
    metrics: {
      pageHeightPx: resolvedPageHeightPx,
      pageWidthPx: getSafeNumber(pagination.pageWidthPx, DEFAULT_PAGE_WIDTH_IN_PX),
      marginTopPx,
      marginBottomPx,
      marginLeftPx,
      marginRightPx,
      contentHeightPx: getSafeNumber(normalizedLayout.usableHeightPx, 0),
      contentWidthPx: getSafeNumber(pagination.contentWidthPx, 0),
      headerHeightPx,
      footerHeightPx,
      pageGapPx,
    },
    pageTopOffsetPx,
    pageGapPx,
    pageBottomSpacingPx,
    headerFooterAreas,
    contentArea,
  };

  return pageEntry;
};
