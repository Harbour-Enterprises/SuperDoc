import { DEFAULT_PAGE_HEIGHT_IN_PX } from '../../constants.js';
import { getSafeNumber } from './common.js';

/**
 * Normalize layout data by resolving margins and usable height with sensible defaults.
 * @param {Object} options - Normalization options.
 * @param {Object|null} options.layout - Raw layout descriptor.
 * @param {Object} options.baseMarginsPx - Base margin values in pixels.
 * @param {number} options.pageHeightPx - Page height in pixels.
 * @returns {{sections:Object|null, margins:{top:number,bottom:number}, usableHeightPx:number, pageHeightPx:number, pageGapPx:number|null}} Normalized layout object.
 */
export const normalizeLayout = ({ layout, baseMarginsPx, pageHeightPx }) => {
  // IMPORTANT: Enforce minimum margins when falling back to base margins
  // This prevents content from extending to the very edges and reserves space for headers/footers
  // when documents provide no or very small margins
  const MINIMUM_TOP_MARGIN_PX = 48; // 0.5 inch minimum
  const MINIMUM_BOTTOM_MARGIN_PX = 48; // 0.5 inch minimum

  // If layout has explicit margins, use them; otherwise use base margins with minimum enforcement
  const rawTopMargin = Number.isFinite(layout?.margins?.top)
    ? layout.margins.top
    : Math.max(baseMarginsPx.top, MINIMUM_TOP_MARGIN_PX);

  const rawBottomMargin = Number.isFinite(layout?.margins?.bottom)
    ? layout.margins.bottom
    : Math.max(baseMarginsPx.bottom, MINIMUM_BOTTOM_MARGIN_PX);

  const layoutPageHeightPx = Number.isFinite(layout?.pageHeightPx) ? layout.pageHeightPx : null;
  const marginTopPx = getSafeNumber(rawTopMargin, baseMarginsPx.top);
  const marginBottomPx = getSafeNumber(rawBottomMargin, baseMarginsPx.bottom);
  const effectivePageHeight = getSafeNumber(layoutPageHeightPx, pageHeightPx, DEFAULT_PAGE_HEIGHT_IN_PX);
  const usableHeightPx = Number.isFinite(layout?.usableHeightPx)
    ? layout.usableHeightPx
    : Math.max(effectivePageHeight - marginTopPx - marginBottomPx, 0);

  return {
    sections: layout?.sections ?? null,
    margins: {
      top: marginTopPx,
      bottom: marginBottomPx,
    },
    usableHeightPx,
    pageHeightPx: effectivePageHeight,
    pageGapPx: Number.isFinite(layout?.pageGapPx) ? layout.pageGapPx : null,
  };
};

/**
 * Build header and footer area descriptors for a page.
 * @param {Object} options - Options describing sections and margins.
 * @param {Object|null} options.sections - Header/footer section summary.
 * @param {number} [options.marginTopPx=0] - Top margin in pixels.
 * @param {number} [options.marginBottomPx=0] - Bottom margin in pixels.
 * @param {number} [options.marginLeftPx=0] - Left margin in pixels.
 * @param {number} [options.marginRightPx=0] - Right margin in pixels.
 * @returns {{header:Object, footer:Object}} Header/footer area metadata.
 */
export const createHeaderFooterAreas = ({
  sections,
  marginTopPx = 0,
  marginBottomPx = 0,
  marginLeftPx = 0,
  marginRightPx = 0,
}) => ({
  header: formatHeaderFooterArea(sections?.header ?? null, marginTopPx, 'header', { marginLeftPx, marginRightPx }),
  footer: formatHeaderFooterArea(sections?.footer ?? null, marginBottomPx, 'footer', { marginLeftPx, marginRightPx }),
});

/**
 * Format a header or footer section into a normalized area descriptor.
 * @param {Object|null} section - Section summary data.
 * @param {number} fallbackMarginPx - Margin fallback in pixels.
 * @param {'header'|'footer'} role - Section role.
 * @param {{marginLeftPx?:number,marginRightPx?:number}} [options]
 * @returns {{heightPx:number, reservedHeightPx:number, metrics:{offsetPx:number,contentHeightPx:number,effectiveHeightPx:number}, id?:string, sectionId?:string, kind?:string, role?:string, slotTopPx:number, slotHeightPx:number, slotMaxHeightPx:number, slotLeftPx:number, slotRightPx:number}} Area information.
 */
export const formatHeaderFooterArea = (
  section,
  fallbackMarginPx,
  role,
  { marginLeftPx = 0, marginRightPx = 0 } = {},
) => {
  const metrics = section?.metrics ?? null;
  const offsetPx = Math.max(getSafeNumber(metrics?.offsetPx, metrics?.distancePx, fallbackMarginPx), 0);
  const contentHeightPx = Math.max(getSafeNumber(metrics?.contentHeightPx, section?.contentHeightPx, 0), 0);
  const effectiveHeightPx = getSafeNumber(
    metrics?.effectiveHeightPx,
    section?.heightPx,
    contentHeightPx + offsetPx,
    fallbackMarginPx,
  );
  const heightPx = getSafeNumber(section?.heightPx, effectiveHeightPx, fallbackMarginPx);
  const reservedHeightPx = Math.max(heightPx, effectiveHeightPx, fallbackMarginPx, 0);

  const sectionIdCandidates = [section?.id, section?.sectionId, section?.areaId];
  const sectionId =
    sectionIdCandidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) ?? null;

  const slotLeftPx = Math.max(getSafeNumber(marginLeftPx), 0);
  const slotRightPx = Math.max(getSafeNumber(marginRightPx), 0);
  const slotMaxHeightPx = Math.max(reservedHeightPx - offsetPx, 0);
  const slotHeightCandidate = contentHeightPx > 0 ? contentHeightPx : slotMaxHeightPx;
  const slotHeightPx = Math.max(Math.min(slotHeightCandidate, reservedHeightPx), 0);
  const slotTopPx =
    role === 'footer' ? Math.max(reservedHeightPx - offsetPx - slotHeightPx, 0) : Math.min(offsetPx, reservedHeightPx);

  const area = {
    heightPx,
    reservedHeightPx,
    metrics: {
      offsetPx,
      contentHeightPx,
      effectiveHeightPx,
    },
    slotTopPx,
    slotHeightPx,
    slotMaxHeightPx,
    slotLeftPx,
    slotRightPx,
  };

  if (typeof section?.id === 'string' && section.id.length > 0) {
    area.id = section.id;
  }
  if (section?.kind) {
    area.kind = section.kind;
  }
  if (role) {
    area.role = role;
  }
  if (sectionId) {
    area.sectionId = sectionId;
  }

  return area;
};

/**
 * Resolve header/footer layout data for a given page index.
 * @param {Object} options - Resolution options.
 * @param {number} options.pageIndex - Target page index.
 * @param {Object} options.options - Additional resolution flags.
 * @param {Function} options.resolveHeaderFooter - Resolver for header/footer measurements.
 * @param {Object} options.baseMarginsPx - Base margin values.
 * @param {number} options.pageHeightPx - Page height in pixels.
 * @returns {{sections:Object|null, margins:{top:number,bottom:number}, usableHeightPx:number}} Layout summary.
 */
export const resolvePageLayoutForIndex = ({ pageIndex, options, resolveHeaderFooter, baseMarginsPx, pageHeightPx }) => {
  const { isLastPage = false } = options ?? {};
  const sections = typeof resolveHeaderFooter === 'function' ? resolveHeaderFooter(pageIndex, { isLastPage }) : null;

  const headerEffectiveHeightPx = Number.isFinite(sections?.header?.metrics?.effectiveHeightPx)
    ? sections.header.metrics.effectiveHeightPx
    : 0;
  const footerEffectiveHeightPx = Number.isFinite(sections?.footer?.metrics?.effectiveHeightPx)
    ? sections.footer.metrics.effectiveHeightPx
    : 0;

  // Use reservedHeightPx (which includes offset spacing) instead of just effectiveHeightPx
  // This matches the actual space reserved for header/footer in the UI (e.g., 76px vs 48px)
  // Must check > 0 because Number.isFinite(0) returns true but we need to fall back for 0 values
  const headerReservedHeightPx =
    Number.isFinite(sections?.header?.reservedHeightPx) && sections.header.reservedHeightPx > 0
      ? sections.header.reservedHeightPx
      : Math.max(headerEffectiveHeightPx, baseMarginsPx.top);
  const footerReservedHeightPx =
    Number.isFinite(sections?.footer?.reservedHeightPx) && sections.footer.reservedHeightPx > 0
      ? sections.footer.reservedHeightPx
      : Math.max(footerEffectiveHeightPx, baseMarginsPx.bottom);

  // IMPORTANT: Always enforce minimum margins even when there's no header/footer content
  // This prevents content from extending to the very edges and reserves space for potential
  // headers/footers that might be added later
  const MINIMUM_TOP_MARGIN_PX = 48; // 0.5 inch minimum
  const MINIMUM_BOTTOM_MARGIN_PX = 48; // 0.5 inch minimum

  const resolvedTopMarginPx = Math.max(baseMarginsPx.top, headerReservedHeightPx, MINIMUM_TOP_MARGIN_PX);
  const resolvedBottomMarginPx = Math.max(baseMarginsPx.bottom, footerReservedHeightPx, MINIMUM_BOTTOM_MARGIN_PX);
  const usableHeightPx = Math.max(pageHeightPx - resolvedTopMarginPx - resolvedBottomMarginPx, 0);

  return {
    sections,
    margins: {
      top: resolvedTopMarginPx,
      bottom: resolvedBottomMarginPx,
    },
    usableHeightPx,
  };
};
