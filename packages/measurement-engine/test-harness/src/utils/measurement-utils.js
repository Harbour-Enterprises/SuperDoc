// ============================================================================
// UTILITY FUNCTIONS FOR MEASUREMENT EDITOR
// ============================================================================

/**
 * Coerces a value to a finite number or returns null
 * @param {*} value - Value to coerce
 * @returns {number|null} Finite number or null
 */
export const coerceFinite = (value) => (Number.isFinite(value) ? value : null);

/**
 * Deep clones a value using structuredClone or JSON methods
 * @param {*} value - Value to clone
 * @param {*} fallback - Fallback value if cloning fails
 * @returns {*} Cloned value or fallback
 */
export const cloneDeep = (value, fallback = null) => {
  if (value == null) return fallback;

  const structuredCloneFn =
    typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'function'
      ? globalThis.structuredClone
      : null;
  if (structuredCloneFn) {
    try {
      return structuredCloneFn(value);
    } catch {
      // fall through to JSON clone
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    if (Array.isArray(value)) return value.slice();
    if (typeof value === 'object') return { ...value };
    return fallback;
  }
};

/**
 * Clones a layout page object
 * @param {Object} page - Page object to clone
 * @returns {Object} Cloned page
 */
export const cloneLayoutPage = (page) => cloneDeep(page, { ...(page ?? {}) });

/**
 * Generic object sanitizer that extracts finite numbers and specified keys
 * @param {Object} source - Source object to sanitize
 * @param {Array<string>} numericKeys - Keys that should be coerced to finite numbers
 * @param {Array<string>} stringKeys - Keys that should be preserved as strings
 * @returns {Object|null} Sanitized object or null if empty
 */
export const sanitizeObject = (source, numericKeys = [], stringKeys = []) => {
  if (!source || typeof source !== 'object') return null;

  const result = {};

  numericKeys.forEach((key) => {
    const value = coerceFinite(source[key]);
    if (value !== null) result[key] = value;
  });

  stringKeys.forEach((key) => {
    if (typeof source[key] === 'string' && source[key]) {
      result[key] = source[key];
    }
  });

  return Object.keys(result).length > 0 ? result : null;
};

/**
 * Sanitizes margin object
 * @param {Object} margins - Margins object
 * @returns {Object|null} Sanitized margins or null
 */
export const sanitizeMargins = (margins) => sanitizeObject(margins, ['top', 'bottom', 'left', 'right']);

/**
 * Sanitizes break object
 * @param {Object} pageBreak - Break object
 * @returns {Object|null} Sanitized break or null
 */
export const sanitizeBreak = (pageBreak) =>
  sanitizeObject(pageBreak, ['startOffsetPx', 'pos', 'top', 'bottom', 'fittedTop', 'fittedBottom']);

/**
 * Sanitizes metrics object
 * @param {Object} metrics - Metrics object
 * @returns {Object|null} Sanitized metrics or null
 */
export const sanitizeMetrics = (metrics = {}) =>
  sanitizeObject(metrics, [
    'pageHeightPx',
    'pageWidthPx',
    'marginTopPx',
    'marginBottomPx',
    'marginLeftPx',
    'marginRightPx',
    'contentHeightPx',
    'contentWidthPx',
    'headerHeightPx',
    'footerHeightPx',
    'pageGapPx',
  ]);

/**
 * Sanitizes header/footer area object
 * @param {Object} area - Area object
 * @returns {Object|null} Sanitized area or null
 */
export const sanitizeHeaderFooterArea = (area) => {
  if (!area) return null;
  const sanitized = {};
  const heightPx = coerceFinite(area.heightPx);
  if (heightPx !== null) sanitized.heightPx = heightPx;

  if (area.metrics) {
    const metrics = {};
    const offsetPx = coerceFinite(area.metrics.offsetPx);
    const contentHeightPx = coerceFinite(area.metrics.contentHeightPx);
    const effectiveHeightPx = coerceFinite(area.metrics.effectiveHeightPx);
    if (offsetPx !== null) metrics.offsetPx = offsetPx;
    if (contentHeightPx !== null) metrics.contentHeightPx = contentHeightPx;
    if (effectiveHeightPx !== null) metrics.effectiveHeightPx = effectiveHeightPx;
    if (Object.keys(metrics).length) {
      sanitized.metrics = metrics;
    }
  }

  return Object.keys(sanitized).length ? sanitized : null;
};

/**
 * Sanitizes header/footer areas object
 * @param {Object} areas - Areas object
 * @returns {Object|null} Sanitized areas or null
 */
export const sanitizeHeaderFooterAreas = (areas) => {
  if (!areas) return null;
  const header = sanitizeHeaderFooterArea(areas.header);
  const footer = sanitizeHeaderFooterArea(areas.footer);
  if (!header && !footer) return null;
  return {
    header,
    footer,
  };
};

/**
 * Sanitizes row breaks array
 * @param {Array} rowBreaks - Row breaks array
 * @returns {Array|null} Sanitized row breaks or null
 */
export const sanitizeRowBreaks = (rowBreaks) => {
  if (!Array.isArray(rowBreaks) || !rowBreaks.length) return null;
  const sanitized = rowBreaks
    .map((entry) => {
      const pos = coerceFinite(entry?.pos);
      const top = coerceFinite(entry?.top);
      const bottom = coerceFinite(entry?.bottom);
      const payload = {};
      if (pos !== null) payload.pos = pos;
      if (top !== null) payload.top = top;
      if (bottom !== null) payload.bottom = bottom;
      return Object.keys(payload).length ? payload : null;
    })
    .filter(Boolean);
  return sanitized.length ? sanitized : null;
};

/**
 * Sanitizes overflow object
 * @param {Object} overflow - Overflow object
 * @returns {Object|null} Sanitized overflow or null
 */
export const sanitizeOverflow = (overflow) => sanitizeObject(overflow, ['pos'], ['nodeType']);

/**
 * Sanitizes boundary object
 * @param {Object} boundary - Boundary object
 * @returns {Object|null} Sanitized boundary or null
 */
export const sanitizeBoundary = (boundary) => {
  if (!boundary) return null;

  const result = sanitizeObject(boundary, [
    'pageTop',
    'pageBottom',
    'usableHeightPx',
    'contentHeightPx',
    'pageHeightPx',
    'pageGapPx',
    'overflowAllowancePx',
    'baselineOffset',
    'columnIndex',
    'columnCount',
  ]);

  if (!result) return null;

  const margins = sanitizeMargins(boundary.marginsPx);
  if (margins) result.marginsPx = margins;

  return Object.keys(result).length > 0 ? result : null;
};

/**
 * Formats a pixel value for display
 * @param {number} value - Pixel value
 * @returns {string} Formatted string
 */
export const formatPixels = (value) => (Number.isFinite(value) ? `${value.toFixed(1)} px` : 'n/a');

/**
 * Sanitizes export base name
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized base name
 */
export const sanitizeExportBase = (value) => {
  if (typeof value !== 'string') return 'layout-export';
  const trimmed = value.trim();
  if (!trimmed) return 'layout-export';
  const withoutQuery = trimmed.split(/[?#]/)[0];
  const fileName = withoutQuery.split(/[\\/]/).pop() || withoutQuery;
  const dotIndex = fileName.lastIndexOf('.');
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const normalized = base.trim();
  if (!normalized) return 'layout-export';
  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || lowered === 'blob') {
    return 'layout-export';
  }
  return normalized;
};

/**
 * Creates a default header/footer state object
 * @returns {Object} Header/footer state
 */
export const createHeaderFooterState = () => ({
  headers: [],
  footers: [],
  variants: {
    header: [],
    footer: [],
  },
  contentWidthPx: 816,
  distancesPx: { header: 0, footer: 0 },
});

/**
 * Resolves the drawer ID from a full identifier
 * @param {string|number} id - Full identifier
 * @returns {string} Drawer ID
 */
export const resolveDrawerId = (id) => {
  if (id == null) return '__default__';
  const value = String(id);
  const separatorIndex = value.indexOf('-');
  if (separatorIndex === -1) return value;
  return value.slice(0, separatorIndex);
};

/**
 * Resolves the break identifier for a page
 * @param {Object} entry - Page entry
 * @param {number} fallbackIndex - Fallback index
 * @returns {string} Break identifier
 */
export const resolveBreakIdentifier = (entry, fallbackIndex) => {
  const primaryBreak = entry?.break ?? null;
  const pageIndex = Number.isFinite(entry?.pageIndex) ? entry.pageIndex : fallbackIndex;
  const pos = Number.isFinite(primaryBreak?.pos) ? primaryBreak.pos : null;
  return `${pageIndex}-${pos ?? fallbackIndex}`;
};
