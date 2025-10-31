// Constants
const ROLE_HEADER = 'header';
const ROLE_FOOTER = 'footer';

/**
 * Converts a value to a finite number or null
 * @param {*} value - Value to convert
 * @returns {number | null}
 */
const toFinite = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

/**
 * Safely clones an object bucket, returning empty object if invalid
 * @param {Object} bucket - Object to clone
 * @returns {Object}
 */
const cloneBucket = (bucket) => {
  if (!bucket || typeof bucket !== 'object') {
    return {};
  }
  return { ...bucket };
};

/**
 * Creates a new section data structure with previous values cloned
 * @param {Object} storage - Storage object containing previous section data
 * @returns {{ headers: Object, footers: Object }}
 */
const ensureSectionDataSkeleton = (storage) => {
  const previous = storage?.sectionData;
  const headers = cloneBucket(previous?.headers);
  const footers = cloneBucket(previous?.footers);
  return { headers, footers };
};

/**
 * Retrieves metrics for a section ID from summary
 * @param {Object} summary - Summary object containing metrics
 * @param {string} sectionId - Section ID to look up
 * @returns {Object | null}
 */
const getMetricsForId = (summary, sectionId) => {
  if (!summary || !sectionId) return null;
  const lookup = summary.sectionMetricsById;
  if (!lookup) return null;

  // Support both Map and plain object lookups
  if (typeof lookup.get === 'function') {
    return lookup.get(sectionId) ?? null;
  }
  if (typeof lookup === 'object') {
    return lookup[sectionId] ?? null;
  }
  return null;
};

/**
 * Extracts section ID from area, trying multiple field names
 * @param {Object} area - Area object
 * @returns {string | null}
 */
const extractSectionId = (area) => {
  const candidates = [area.sectionId, area.id, area.areaId];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return null;
};

/**
 * Collects layout information from pages for headers and footers
 * @param {Array} pages - Array of page objects
 * @returns {{ header: Map, footer: Map }}
 */
const collectLayoutInfo = (pages = []) => {
  const header = new Map();
  const footer = new Map();

  pages.forEach((page) => {
    const areas = page?.headerFooterAreas ?? {};
    [ROLE_HEADER, ROLE_FOOTER].forEach((role) => {
      const area = areas[role];
      if (!area) return;

      const sectionId = extractSectionId(area);
      if (!sectionId) return;

      const map = role === ROLE_HEADER ? header : footer;
      if (map.has(sectionId)) return; // First occurrence wins

      map.set(sectionId, {
        reservedHeightPx: toFinite(area.reservedHeightPx),
        slotTopPx: toFinite(area.slotTopPx),
        slotHeightPx: toFinite(area.slotHeightPx),
        slotMaxHeightPx: toFinite(area.slotMaxHeightPx),
        slotLeftPx: toFinite(area.slotLeftPx),
        slotRightPx: toFinite(area.slotRightPx),
        metrics: area.metrics ?? null,
      });
    });
  });

  return { header, footer };
};

/**
 * Calculates effective height from metrics or content + distance
 * @param {Object} metrics - Metrics object
 * @param {number | null} contentHeightPx - Content height
 * @param {number | null} distancePx - Distance/offset
 * @returns {number | null}
 */
const calculateEffectiveHeight = (metrics, contentHeightPx, distancePx) => {
  const explicitEffective = toFinite(metrics?.effectiveHeightPx);
  if (explicitEffective != null) return explicitEffective;

  if (contentHeightPx != null || distancePx != null) {
    return Math.max((contentHeightPx ?? 0) + (distancePx ?? 0), 0);
  }
  return null;
};

/**
 * Calculates slot top position for header/footer
 * @param {Object} layoutInfo - Layout info from pages
 * @param {string} role - 'header' or 'footer'
 * @param {number | null} reservedHeight - Reserved height
 * @param {number | null} distancePx - Distance/offset
 * @param {number | null} contentHeightPx - Content height
 * @returns {number}
 */
const calculateSlotTop = (layoutInfo, role, reservedHeight, distancePx, contentHeightPx) => {
  const layoutSlotTop = toFinite(layoutInfo?.slotTopPx);
  if (layoutSlotTop != null) return layoutSlotTop;

  // Footer slots start from bottom, accounting for distance and content
  if (role === ROLE_FOOTER && reservedHeight != null && distancePx != null) {
    return Math.max(reservedHeight - distancePx - Math.max(contentHeightPx ?? 0, 0), 0);
  }

  // Header slots start from top, accounting for distance
  return Math.max(distancePx ?? 0, 0);
};

/**
 * Calculates slot height for header/footer
 * @param {Object} layoutInfo - Layout info from pages
 * @param {number | null} contentHeightPx - Content height
 * @param {number | null} reservedHeight - Reserved height
 * @param {number | null} distancePx - Distance/offset
 * @returns {number | null}
 */
const calculateSlotHeight = (layoutInfo, contentHeightPx, reservedHeight, distancePx) => {
  const layoutSlotHeight = toFinite(layoutInfo?.slotHeightPx);
  if (layoutSlotHeight != null) return layoutSlotHeight;

  if (contentHeightPx != null && contentHeightPx > 0) {
    return contentHeightPx;
  }

  if (reservedHeight != null && distancePx != null) {
    return Math.max(reservedHeight - Math.max(distancePx, 0), 0);
  }

  return null;
};

/**
 * Derives all height-related metrics for a section
 * @param {Object} params - Parameters
 * @param {Object} params.metrics - Section metrics
 * @param {Object} params.summaryDistances - Summary distance values
 * @param {Object} params.layoutInfo - Layout info from pages
 * @param {string} params.role - 'header' or 'footer'
 * @returns {Object} Derived height metrics
 */
const deriveHeights = ({ metrics, summaryDistances, layoutInfo, role }) => {
  const distancePx = toFinite(metrics?.distancePx) ?? toFinite(summaryDistances?.[role]);
  const contentHeightPx = toFinite(metrics?.contentHeightPx);
  const effectiveHeightPx = calculateEffectiveHeight(metrics, contentHeightPx, distancePx);
  const layoutReserved = toFinite(layoutInfo?.reservedHeightPx);
  const reservedHeight = layoutReserved ?? effectiveHeightPx;

  const slotTopPx = calculateSlotTop(layoutInfo, role, reservedHeight, distancePx, contentHeightPx);
  const slotHeightPx = calculateSlotHeight(layoutInfo, contentHeightPx, reservedHeight, distancePx);

  const baselineHeight =
    reservedHeight != null && distancePx != null ? Math.max(reservedHeight - distancePx, 0) : contentHeightPx;

  return {
    reservedHeight,
    measuredHeight: contentHeightPx,
    offsetHeight: distancePx,
    baselineHeight,
    slotTopPx,
    slotHeightPx,
    slotMaxHeightPx: toFinite(layoutInfo?.slotMaxHeightPx),
    slotLeftPx: toFinite(layoutInfo?.slotLeftPx),
    slotRightPx: toFinite(layoutInfo?.slotRightPx),
  };
};

/**
 * Synchronise pagination sectionData from the measurement engine summary.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {{ summary: any, repository?: any, layoutPages?: any[] }} params
 * @returns {{ headers: Record<string, any>, footers: Record<string, any> } | null}
 */
export const syncSectionDataFromSummary = (editor, storage, { summary, repository, layoutPages } = {}) => {
  if (!editor || !storage || !summary || !repository) {
    return null;
  }

  const distances = summary?.distancesPx ?? {};
  const layoutInfo = collectLayoutInfo(Array.isArray(layoutPages) ? layoutPages : []);
  const previous = storage.sectionData ?? { headers: {}, footers: {} };
  const next = ensureSectionDataSkeleton(storage);

  /**
   * Populates section data for a given role (header or footer)
   * @param {string} role - 'header' or 'footer'
   */
  const populate = (role) => {
    const records = Array.isArray(repository.list?.(role)) ? repository.list(role) : [];
    const isFooter = role === ROLE_FOOTER;
    const targetBucket = isFooter ? next.footers : next.headers;
    const layoutBucket = isFooter ? layoutInfo.footer : layoutInfo.header;
    const previousBucket = isFooter ? previous.footers : previous.headers;

    records.forEach((record) => {
      if (!record || !record.id) return;

      const metrics = getMetricsForId(summary, record.id);
      const layoutMetrics = layoutBucket.get(record.id);
      const previousEntry = previousBucket?.[record.id] ?? {};
      const heights = deriveHeights({
        metrics,
        summaryDistances: distances,
        layoutInfo: layoutMetrics,
        role,
      });

      // Merge with previous entry, preferring new values when available
      targetBucket[record.id] = {
        ...previousEntry,
        data: record.contentJson ?? previousEntry.data ?? null,
        metrics,
        role,
        reservedHeight: heights.reservedHeight ?? previousEntry.reservedHeight ?? null,
        measuredHeight: heights.measuredHeight ?? previousEntry.measuredHeight ?? null,
        offsetHeight: heights.offsetHeight ?? previousEntry.offsetHeight ?? null,
        baselineHeight: heights.baselineHeight ?? previousEntry.baselineHeight ?? null,
        slotTopPx: heights.slotTopPx ?? previousEntry.slotTopPx ?? null,
        slotHeightPx: heights.slotHeightPx ?? previousEntry.slotHeightPx ?? null,
        slotMaxHeightPx: heights.slotMaxHeightPx ?? previousEntry.slotMaxHeightPx ?? null,
        slotLeftPx: heights.slotLeftPx ?? previousEntry.slotLeftPx ?? null,
        slotRightPx: heights.slotRightPx ?? previousEntry.slotRightPx ?? null,
      };
    });
  };

  populate(ROLE_HEADER);
  populate(ROLE_FOOTER);

  storage.sectionData = next;
  return next;
};

export default {
  syncSectionDataFromSummary,
};
