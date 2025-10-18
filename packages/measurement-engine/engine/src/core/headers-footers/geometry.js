import { applyHiddenContainerStyles } from '../helpers/hidden-container.js';

const PIXELS_PER_INCH = 96;

/**
 * Determine the page content width in pixels based on editor page styles.
 * @param {import('@core/Editor.js').Editor} editor
 * @returns {number|null}
 */
export const getPageContentWidthPx = (editor) => {
  const pageStyles = editor?.converter?.pageStyles ?? {};
  const pageSizePx = normalizeInchesToPx(pageStyles.pageSize);
  const pageMarginsPx = normalizeInchesToPx(pageStyles.pageMargins);

  const pageWidthPx = Number.isFinite(pageSizePx?.width) ? pageSizePx.width : null;
  const marginLeftPx = Number.isFinite(pageMarginsPx?.left) ? pageMarginsPx.left : 0;
  const marginRightPx = Number.isFinite(pageMarginsPx?.right) ? pageMarginsPx.right : 0;

  if (pageWidthPx != null) {
    const contentWidth = pageWidthPx - marginLeftPx - marginRightPx;
    if (contentWidth > 0) {
      return contentWidth;
    }
  }

  const viewWidth = editor?.view?.dom?.clientWidth;
  if (Number.isFinite(viewWidth) && viewWidth > 0) {
    return viewWidth;
  }

  return null;
};

/**
 * Convert default styles into typography information for measurement.
 * @param {import('@core/Editor.js').Editor} editor
 * @returns {{ fontFamily: string|null, fontSizePx: number, lineHeightPx: number }}
 */
export const getDocumentTypography = (editor) => {
  const defaults = editor?.converter?.getDocumentDefaultStyles?.() ?? {};
  const fontFamily = defaults.fontFamilyCss || defaults.typeface || null;
  const fontSizePt = Number.isFinite(defaults.fontSizePt) ? defaults.fontSizePt : 12;
  const fontSizePxFromInches = inchesToPixels(fontSizePt / 72);
  const fallbackFontSizePx = fontSizePt * 1.3333;
  const resolvedFontSizePx = Number.isFinite(fontSizePxFromInches) ? fontSizePxFromInches : fallbackFontSizePx;
  const lineHeightPx = Number.isFinite(defaults.lineHeightPx) ? defaults.lineHeightPx : resolvedFontSizePx * 1.2;

  return {
    fontFamily,
    fontSizePx: resolvedFontSizePx,
    lineHeightPx,
  };
};

/**
 * Create a hidden DOM container configured for measurement.
 * @param {Object} params
 * @param {Document} params.doc DOM document.
 * @param {number|null} params.widthPx Target width in pixels.
 * @param {Object} params.typography Typography styles.
 * @returns {HTMLDivElement}
 */
export const createHiddenMeasurementContainer = ({ doc, widthPx, typography }) => {
  const container = doc.createElement('div');
  container.className = 'measurement-engine-section-surface';

  applyHiddenContainerStyles(container, {
    top: '0',
  });

  const fallbackWidthPx = 816; // 8.5" * 96px — keeps headers/measures stable when page data is unavailable
  const effectiveWidth = Number.isFinite(widthPx) && widthPx > 0 ? widthPx : fallbackWidthPx;

  applyStyles(container, {
    width: `${effectiveWidth}px`,
    maxWidth: `${effectiveWidth}px`,
    minWidth: `${effectiveWidth}px`,
  });

  applyStyles(container, typographyToStyles(typography));
  return container;
};

/**
 * Normalize inch measurements to pixel values.
 * @param {Object} sizes
 * @returns {Object}
 */
export const normalizeInchesToPx = (sizes = {}) => {
  if (!sizes || typeof sizes !== 'object') return {};
  const result = {};
  Object.entries(sizes).forEach(([key, value]) => {
    const px = inchesToPixels(value);
    if (px != null) {
      result[key] = px;
    }
  });
  return result;
};

/**
 * Convert inches to pixels.
 * @param {number} value
 * @returns {number|null}
 */
export const inchesToPixels = (value) => {
  if (!Number.isFinite(value)) return null;
  return value * PIXELS_PER_INCH;
};

const typographyToStyles = (typography = {}) => {
  const styles = {};
  if (typography?.fontFamily) styles.fontFamily = typography.fontFamily;
  if (Number.isFinite(typography?.fontSizePx)) styles.fontSize = `${typography.fontSizePx}px`;
  if (Number.isFinite(typography?.lineHeightPx)) styles.lineHeight = `${typography.lineHeightPx}px`;
  return styles;
};

const applyStyles = (element, styles = {}) => {
  Object.entries(styles).forEach(([property, value]) => {
    if (value != null) {
      element.style[property] = value;
    }
  });
};
