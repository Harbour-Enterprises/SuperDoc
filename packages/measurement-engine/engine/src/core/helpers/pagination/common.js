import { DEFAULT_PAGE_WIDTH_IN_PX, DEFAULT_PAGE_MARGINS_IN_PX } from '../../constants.js';

/**
 * Compute the next vertical offset for stacking page previews in the measurement viewport.
 * @param {number} currentTop - Current visual top value in pixels.
 * @param {number} pageHeightPx - Height of the page in pixels.
 * @param {number} gapPx - Gap to apply between pages in pixels.
 * @returns {number} Next visual offset in pixels.
 */
export const computeNextVisualTop = (currentTop, pageHeightPx, gapPx) => {
  const safeTop = Number.isFinite(currentTop) ? currentTop : 0;
  const safeHeight = Number.isFinite(pageHeightPx) ? pageHeightPx : 0;
  const safeGap = Number.isFinite(gapPx) ? gapPx : 0;
  return safeTop + safeHeight + safeGap;
};

/**
 * Calculate the total spacing that should appear after a page break.
 * This includes: content-to-page-bottom spacing, footer reserved area,
 * next page's header reserved area, and inter-page gap.
 *
 * @param {Object} currentPage - Current page entry with metrics.
 * @param {Object|null} nextPage - Next page entry with metrics (null if last page).
 * @param {number} pageGapPx - Inter-page gap in pixels.
 * @returns {number} Total spacing in pixels to render after this page.
 */
export const calculateSpacingAfterPage = (currentPage, nextPage, pageGapPx) => {
  // Space from break position to bottom of usable content area
  // NOTE: pageBottomSpacing represents unused space WITHIN the page's content area.
  // This should NOT be added to the inter-page spacing, as it would cause cumulative
  // drift where each page gets pushed down by the unused space from previous pages.
  // The unused space should remain as part of the page's layout, not added as extra spacing.
  const pageBottomSpacing = Number.isFinite(currentPage?.pageBottomSpacingPx) ? currentPage.pageBottomSpacingPx : 0;

  // Footer reserved area (max of footer height and bottom margin)
  const footerHeight = Number.isFinite(currentPage?.metrics?.footerHeightPx) ? currentPage.metrics.footerHeightPx : 0;
  const footerMargin = Number.isFinite(currentPage?.metrics?.marginBottomPx)
    ? currentPage.metrics.marginBottomPx
    : footerHeight;
  const footerReserved = Math.max(footerHeight, footerMargin, 0);

  // Next page's header reserved area (max of header height and top margin)
  const nextHeaderHeight = Number.isFinite(nextPage?.metrics?.headerHeightPx) ? nextPage.metrics.headerHeightPx : 0;
  const nextHeaderMargin = Number.isFinite(nextPage?.metrics?.marginTopPx)
    ? nextPage.metrics.marginTopPx
    : nextHeaderHeight;
  const nextHeaderReserved = Math.max(nextHeaderHeight, nextHeaderMargin, 0);

  // Inter-page gap
  const nextPageGap = Number.isFinite(pageGapPx) ? pageGapPx : 0;

  // Include pageBottomSpacing to account for unused space on current page
  // The drift correction in recordBreak prevents cumulative errors from accumulating
  const totalSpacing = pageBottomSpacing + footerReserved + nextHeaderReserved + nextPageGap;

  return totalSpacing;
};

/**
 * Return the first finite numeric value from a list.
 * @param {...number} values - Candidate numeric values.
 * @returns {number} First finite value or 0.
 */
export const getSafeNumber = (...values) => {
  for (const value of values) {
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

/**
 * Snapshot the measurement editor document into JSON, when possible.
 * @param {import('@core/Editor.js').Editor} measurementEditor - Measurement editor instance.
 * @returns {Object} JSON representation (or empty object when unavailable).
 */
export const snapshotMeasurementDocument = (measurementEditor) => {
  const candidates = [measurementEditor?.state?.doc, measurementEditor?.view?.state?.doc];
  const doc = candidates.find((candidate) => candidate && typeof candidate.toJSON === 'function') ?? null;
  if (!doc) {
    return {};
  }

  try {
    return doc.toJSON();
  } catch {
    return {};
  }
};

/**
 * Create a fallback rectangle when DOM measurements are unavailable.
 * @param {HTMLElement|Object|null} element - Element providing offset information.
 * @returns {{top:number,bottom:number,left:number,right:number,width:number,height:number}} Synthetic rectangle.
 */
export const createFallbackRect = (element) => {
  if (!element) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
    };
  }

  const top = Number.isFinite(element.offsetTop) ? element.offsetTop : 0;
  const left = Number.isFinite(element.offsetLeft) ? element.offsetLeft : 0;
  const width = Number.isFinite(element.offsetWidth) ? element.offsetWidth : 0;
  const height = Number.isFinite(element.offsetHeight) ? element.offsetHeight : 0;

  return {
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
  };
};

/**
 * Resolve page width in pixels using explicit configuration or DOM measurements.
 * @param {Object} options - Resolution options.
 * @param {number|null} options.explicitWidthPx - Explicit width override.
 * @param {DOMRect|Object} options.containerRect - Measurement container rect.
 * @param {HTMLElement|Object} options.dom - Root DOM element.
 * @returns {number} Page width in pixels.
 */
export const resolvePageWidthPx = ({ explicitWidthPx, containerRect, dom }) => {
  if (Number.isFinite(explicitWidthPx) && explicitWidthPx > 0) {
    return explicitWidthPx;
  }

  const candidates = [containerRect?.width, dom?.offsetWidth, dom?.scrollWidth, dom?.clientWidth];

  for (const candidate of candidates) {
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return DEFAULT_PAGE_WIDTH_IN_PX;
};

/**
 * Resolve content width in pixels after subtracting margins.
 * @param {Object} options - Resolution options.
 * @param {number} options.pageWidthPx - Page width in pixels.
 * @param {Object} options.baseMarginsPx - Margins in pixels.
 * @param {DOMRect|Object} options.containerRect - Container rectangle.
 * @returns {number} Content width in pixels (never negative).
 */
export const resolveContentWidthPx = ({ pageWidthPx, baseMarginsPx, containerRect }) => {
  const widthSource =
    Number.isFinite(pageWidthPx) && pageWidthPx > 0
      ? pageWidthPx
      : Number.isFinite(containerRect?.width) && containerRect.width > 0
        ? containerRect.width
        : DEFAULT_PAGE_WIDTH_IN_PX;

  const marginLeft = getSafeNumber(baseMarginsPx?.left, DEFAULT_PAGE_MARGINS_IN_PX.left);
  const marginRight = getSafeNumber(baseMarginsPx?.right, DEFAULT_PAGE_MARGINS_IN_PX.right);
  const contentWidth = widthSource - marginLeft - marginRight;
  return contentWidth > 0 ? contentWidth : 0;
};
