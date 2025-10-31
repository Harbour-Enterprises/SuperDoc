const CSS_PX_PER_INCH = 96;
const CSS_PX_PER_POINT = CSS_PX_PER_INCH / 72;
const DEFAULT_LINE_HEIGHT_RATIO = 1.2;
const DEFAULT_FONT_SIZE_PX = 16;

/**
 * Checks if a value is a valid positive number.
 *
 * @param {any} value - Value to validate.
 * @returns {boolean} True if value is a finite positive number.
 * @private
 */
function isValidPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Checks if a value is a valid finite number.
 *
 * @param {any} value - Value to validate.
 * @returns {boolean} True if value is a finite number.
 * @private
 */
function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Converts inches to CSS pixels.
 *
 * @param {number} inches - Value in inches.
 * @returns {number | null} Value in pixels, or null if input is invalid.
 * @private
 */
function inchesToPixels(inches) {
  return isValidNumber(inches) ? inches * CSS_PX_PER_INCH : null;
}

/**
 * Converts points to CSS pixels.
 *
 * @param {number} points - Value in points.
 * @returns {number} Value in pixels.
 * @private
 */
function pointsToPixels(points) {
  return points * CSS_PX_PER_POINT;
}

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

    if (isValidNumber(fontSizePt)) {
      const fontSizePx = pointsToPixels(fontSizePt);
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
    if (isValidNumber(fontSizePt)) {
      const fontSizePx = pointsToPixels(fontSizePt);
      return fontSizePx * DEFAULT_LINE_HEIGHT_RATIO;
    }
  } catch {}
  return DEFAULT_FONT_SIZE_PX * DEFAULT_LINE_HEIGHT_RATIO;
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
 * Resolves the height for a section entry, trying multiple sources.
 *
 * @param {object} entry - Section entry that may contain height or sectionContainer.
 * @param {number} fallback - Fallback height to use if no valid height is found.
 * @returns {number} Resolved height in pixels.
 * @private
 */
function resolveSectionHeight(entry, fallback) {
  // First, try the explicit height property
  const explicitHeight = entry?.height;
  if (isValidPositiveNumber(explicitHeight)) {
    return explicitHeight;
  }

  // Second, try measuring the container element
  try {
    const container = entry?.sectionContainer;
    if (container instanceof HTMLElement) {
      const measuredHeight = container.offsetHeight;
      if (isValidPositiveNumber(measuredHeight)) {
        return measuredHeight;
      }
    }
  } catch {}

  // Finally, fall back to default
  return fallback;
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
  const sectionsData = type === 'header' ? store.headers : store.footers;
  const fallbackHeight = getFallbackLineHeightPx(editor);
  const perSection = new Map();
  let maxHeightPx = 0;

  if (sectionsData) {
    Object.entries(sectionsData).forEach(([sectionId, entry]) => {
      const height = resolveSectionHeight(entry, fallbackHeight);
      perSection.set(sectionId, height);
      maxHeightPx = Math.max(maxHeightPx, height);
    });
  }

  // If no sections were found, use fallback for max height
  if (perSection.size === 0) {
    maxHeightPx = fallbackHeight;
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

  // Convert margins from inches to pixels
  const marginTopPx = inchesToPixels(margins.top) ?? CSS_PX_PER_INCH;
  const marginBottomPx = inchesToPixels(margins.bottom) ?? CSS_PX_PER_INCH;
  const headerOffsetPx = Math.max(0, inchesToPixels(margins.header) ?? 0);
  const footerOffsetPx = Math.max(0, inchesToPixels(margins.footer) ?? 0);

  // Collect section heights
  const headerHeights = collectSectionHeights(editor, 'header');
  const footerHeights = collectSectionHeights(editor, 'footer');

  // Calculate spacing (the larger of margin or offset + height)
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
