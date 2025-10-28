const CSS_PX_PER_INCH = 96;
const CSS_PX_PER_POINT = CSS_PX_PER_INCH / 72;
const DEFAULT_LINE_HEIGHT_RATIO = 1.2;

/**
 * Applies the editor's default font styling to a header or footer container element.
 *
 * @param {object} editor - Editor instance exposing converter defaults.
 * @param {HTMLElement} element - Section container element whose inline styles should be updated.
 */
export function applyDefaultSectionStyles(editor, element) {
  if (!editor || !element) return;

  try {
    const defaults = editor.converter?.getDocumentDefaultStyles?.();
    if (!defaults) return;

    const { typeface, fontSizePt } = defaults;
    if (typeface) {
      element.style.fontFamily = typeface;
    }

    if (typeof fontSizePt === 'number' && Number.isFinite(fontSizePt)) {
      const fontSizePx = fontSizePt * CSS_PX_PER_POINT;
      element.style.fontSize = `${fontSizePx}px`;
      element.style.lineHeight = `${Math.round(fontSizePx * DEFAULT_LINE_HEIGHT_RATIO)}px`;
    }
  } catch {}
}

/**
 * Determines the fallback line height in pixels when explicit heights are unavailable.
 *
 * @param {object} editor - Editor instance that may expose default font size in points.
 * @returns {number} Fallback line height in pixels.
 * @private
 */
function getFallbackLineHeightPx(editor) {
  try {
    const defaults = editor.converter?.getDocumentDefaultStyles?.();
    const fontSizePt = defaults?.fontSizePt;
    if (typeof fontSizePt === 'number' && Number.isFinite(fontSizePt)) {
      const fontSizePx = fontSizePt * CSS_PX_PER_POINT;
      return fontSizePx * DEFAULT_LINE_HEIGHT_RATIO;
    }
  } catch {}
  return 16 * DEFAULT_LINE_HEIGHT_RATIO;
}

/**
 * Ensures pagination section data is available on the editor instance.
 *
 * @param {object} editor - Editor instance with pagination storage.
 * @returns {{ headers: Record<string, any>, footers: Record<string, any> }} Section data store.
 * @private
 */
function ensureSectionData(editor) {
  const sectionData = editor?.storage?.pagination?.sectionData;
  return sectionData || { headers: {}, footers: {} };
}

/**
 * Collects measured heights for header or footer sections.
 *
 * @param {object} editor - Editor instance containing pagination measurement data.
 * @param {'header' | 'footer'} type - Section type to collect metrics for.
 * @returns {{ perSection: Map<string, number>, maxHeightPx: number }} Heights by section and the maximum height.
 * @private
 */
function collectSectionHeights(editor, type) {
  const store = ensureSectionData(editor);
  const bucket = type === 'header' ? store.headers : store.footers;
  const fallback = getFallbackLineHeightPx(editor);
  const perSection = new Map();
  let maxHeightPx = 0;

  if (bucket) {
    Object.entries(bucket).forEach(([sectionId, entry]) => {
      let height = entry?.height;
      if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
        try {
          const container = entry?.sectionContainer;
          if (container instanceof HTMLElement) height = container.offsetHeight;
        } catch {}
      }
      if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
        height = fallback;
      }
      perSection.set(sectionId, height);
      if (height > maxHeightPx) maxHeightPx = height;
    });
  }

  if (perSection.size === 0) {
    maxHeightPx = fallback;
  }

  return { perSection, maxHeightPx };
}

/**
 * Computes margin and spacing metrics for header and footer sections.
 *
 * @param {object} editor - Editor instance exposing converter page styles and measurements.
 * @returns {{
 *   marginTopPx: number,
 *   marginBottomPx: number,
 *   headerOffsetPx: number,
 *   footerOffsetPx: number,
 *   headerSpacingPx: number,
 *   footerSpacingPx: number,
 *   headerHeights: Map<string, number>,
 *   footerHeights: Map<string, number>
 * }} Aggregated section metrics in pixels.
 */
export function computeSectionMetrics(editor) {
  const styles = editor?.converter?.pageStyles || {};
  const margins = styles.pageMargins || {};
  const inToPx = (val) => (typeof val === 'number' && Number.isFinite(val) ? val * CSS_PX_PER_INCH : null);

  const marginTopPx = inToPx(margins.top) ?? CSS_PX_PER_INCH;
  const marginBottomPx = inToPx(margins.bottom) ?? CSS_PX_PER_INCH;
  const headerOffsetPx = Math.max(0, inToPx(margins.header) ?? 0);
  const footerOffsetPx = Math.max(0, inToPx(margins.footer) ?? 0);

  const headerHeights = collectSectionHeights(editor, 'header');
  const footerHeights = collectSectionHeights(editor, 'footer');

  const headerSpacingPx = Math.max(marginTopPx, headerOffsetPx + headerHeights.maxHeightPx);
  const footerSpacingPx = Math.max(marginBottomPx, footerOffsetPx + footerHeights.maxHeightPx);

  return {
    marginTopPx,
    marginBottomPx,
    headerOffsetPx,
    footerOffsetPx,
    headerSpacingPx,
    footerSpacingPx,
    headerHeights: headerHeights.perSection,
    footerHeights: footerHeights.perSection,
  };
}

/**
 * Looks up the computed height for a specific header or footer section.
 *
 * @param {{
 *   headerHeights?: Map<string, number> | Record<string, number>,
 *   footerHeights?: Map<string, number> | Record<string, number>
 * }} metrics - Computed section metrics collection.
 * @param {'header' | 'footer'} type - Section type to read from metrics.
 * @param {string} sectionId - Identifier of the section to look up.
 * @returns {number | null} Height in pixels if available; otherwise null.
 */
export function getSectionHeight(metrics, type, sectionId) {
  if (!metrics) return null;
  const map = type === 'header' ? metrics.headerHeights : metrics.footerHeights;
  if (!map) return null;
  if (map instanceof Map) return map.get(sectionId) ?? null;
  return map[sectionId] ?? null;
}
