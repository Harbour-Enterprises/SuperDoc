import {
  CONTENT_HEIGHT_ALLOWANCE_IN_PX,
  DEFAULT_PAGE_HEIGHT_IN_PX,
  DEFAULT_PAGE_MARGINS_IN_PX,
} from '../../core/constants.js';

/**
 * Derive the printable window metrics for the current page configuration.
 *
 * @param {Object} params
 * @param {number} params.pageHeightPx Raw page height in pixels.
 * @param {number} params.topMarginPx Top margin in pixels.
 * @param {number} params.bottomMarginPx Bottom margin in pixels.
 * @returns {{safeTopMargin:number,safeBottomMargin:number,printableHeightPx:number,contentHeightPx:number,allowancePx:number}}
 */
export function computePageWindow({ pageHeightPx, topMarginPx, bottomMarginPx }) {
  const safePageHeight = Math.max(0, pageHeightPx ?? DEFAULT_PAGE_HEIGHT_IN_PX);
  const safeTopMargin = Math.max(0, topMarginPx ?? DEFAULT_PAGE_MARGINS_IN_PX.top);
  const safeBottomMargin = Math.max(0, bottomMarginPx ?? DEFAULT_PAGE_MARGINS_IN_PX.bottom);

  const heightBelowTopMargin = Math.max(0, safePageHeight - safeTopMargin);
  const printableHeightPx = Math.max(0, heightBelowTopMargin - safeBottomMargin);
  const contentHeightPx = printableHeightPx;
  const allowanceCapPx = contentHeightPx > 0 ? contentHeightPx : printableHeightPx;
  const allowancePx = Math.max(0, Math.min(CONTENT_HEIGHT_ALLOWANCE_IN_PX, allowanceCapPx));

  return {
    safeTopMargin,
    safeBottomMargin,
    printableHeightPx,
    contentHeightPx,
    allowancePx,
  };
}
