const CSS_PX_PER_INCH = 96;

const safeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const coalesceHeight = (...values) => {
  let max = 0;
  for (const value of values) {
    const numeric = safeNumber(value);
    if (numeric > max) {
      max = numeric;
    }
  }
  return max;
};

export const getPageCountFromBreaks = (pageBreaks) => {
  if (!Array.isArray(pageBreaks) || pageBreaks.length === 0) {
    return 1;
  }

  let maxIndex = -1;
  for (const entry of pageBreaks) {
    if (Number.isInteger(entry?.pageIndex)) {
      maxIndex = Math.max(maxIndex, entry.pageIndex);
    }
  }

  const derivedFromIndices = maxIndex >= 0 ? maxIndex + 2 : 1;
  const derivedFromLength = pageBreaks.length + 1;
  return Math.max(1, derivedFromIndices, derivedFromLength);
};

export const resolveSectionIdForPage = (editor, pageNumber, sectionType) => {
  try {
    const ids = editor.converter?.[sectionType];
    const alt = editor.converter?.pageStyles?.alternateHeaders;
    if (!ids) return null;
    if (ids?.titlePg && pageNumber === 1 && ids.first) return ids.first;
    let sectionId = ids.default;
    if (alt) {
      if (pageNumber === 1) sectionId = ids.first || sectionId;
      else if (pageNumber % 2 === 0) sectionId = ids.even || sectionId;
      else sectionId = ids.odd || sectionId;
    }
    return sectionId;
  } catch {
    return null;
  }
};

export const resolveSectionIdFromSummary = (summary, type, pageIndex, isLastPage) => {
  if (!summary || !summary.variantLookup) return null;
  const slot = summary.variantLookup[type];
  if (!slot) return null;

  const getValue = (variant) => {
    if (!variant) return null;
    if (slot instanceof Map) return slot.get(variant) ?? null;
    if (typeof slot === 'object' && slot !== null) return slot[variant] ?? null;
    return null;
  };

  const pageNumber = pageIndex + 1;
  const candidates = [];
  if (pageIndex === 0) {
    candidates.push('first', 'titlePg');
  }
  candidates.push(pageNumber % 2 === 0 ? 'even' : 'odd');
  if (isLastPage) {
    candidates.push('last');
  }
  candidates.push('default');

  for (const candidate of candidates) {
    const id = getValue(candidate);
    if (id) {
      return id;
    }
  }

  return null;
};

const resolveLayoutSection = (page, type) => {
  if (!page) return null;
  const metrics = page?.metrics ?? {};
  const areas = page?.headerFooterAreas ?? {};
  const section = areas?.[type] ?? {};
  const marginPx = safeNumber(type === 'header' ? metrics?.marginTopPx : metrics?.marginBottomPx);
  const heightPx = safeNumber(section?.heightPx);
  const effectiveHeightPx = safeNumber(section?.metrics?.effectiveHeightPx);
  const resolvedHeightPx = coalesceHeight(marginPx, heightPx, effectiveHeightPx);
  const offsetPx = safeNumber(section?.metrics?.offsetPx ?? section?.metrics?.distancePx);
  const contentHeightPx = safeNumber(section?.metrics?.contentHeightPx);

  return {
    heightPx: resolvedHeightPx,
    marginPx,
    offsetPx,
    contentHeightPx,
    rawHeightPx: heightPx,
    effectiveHeightPx,
  };
};

export const resolveLayoutBandForPage = (page, type) => {
  const band = resolveLayoutSection(page, type);
  return band ?? { heightPx: 0, marginPx: 0, offsetPx: 0, contentHeightPx: 0, rawHeightPx: 0, effectiveHeightPx: 0 };
};

export const resolveLayoutBands = (pages = []) =>
  pages.map((page) => ({
    header: resolveLayoutBandForPage(page, 'header'),
    footer: resolveLayoutBandForPage(page, 'footer'),
    pageHeightPx: safeNumber(page?.metrics?.pageHeightPx),
    pageTopOffsetPx: Number.isFinite(page?.pageTopOffsetPx) ? page.pageTopOffsetPx : null,
    pageGapPx: Number.isFinite(page?.pageGapPx) ? page.pageGapPx : safeNumber(page?.metrics?.pageGapPx),
  }));

export const computeInterPageGap = (current, next) => {
  if (!current) return 0;
  const currentTop = Number.isFinite(current?.pageTopOffsetPx) ? current.pageTopOffsetPx : null;
  const currentHeight = safeNumber(current?.pageHeightPx);
  const nextTop = Number.isFinite(next?.pageTopOffsetPx) ? next.pageTopOffsetPx : null;
  let gap = null;
  if (currentTop != null && nextTop != null) {
    gap = nextTop - (currentTop + currentHeight);
  }
  if (!Number.isFinite(gap) || gap < 0) {
    gap = Number.isFinite(current?.pageGapPx) ? current.pageGapPx : 0;
  }
  return gap > 0 ? gap : 0;
};

const resolveLayoutBandHeight = (storage, pageIndex, type) => {
  if (!storage || !Number.isInteger(pageIndex)) return null;
  const pages = Array.isArray(storage.layoutPages) ? storage.layoutPages : null;
  if (!pages || !pages[pageIndex]) return null;
  const band = resolveLayoutBandForPage(pages[pageIndex], type);
  return Number.isFinite(band?.heightPx) ? band.heightPx : null;
};

export const getSectionHeightFromStorage = (storage, bucket, sectionId) => {
  if (!sectionId) return 0;
  try {
    const entry = storage?.sectionData?.[bucket]?.[sectionId];
    if (!entry) return 0;
    const { reservedHeight, height, measuredHeight, baselineHeight, offsetHeight } = entry;
    if (Number.isFinite(reservedHeight) && reservedHeight > 0) return reservedHeight;
    if (Number.isFinite(height) && height > 0) return height;
    if (Number.isFinite(measuredHeight) && measuredHeight > 0) return measuredHeight;
    if (Number.isFinite(baselineHeight) && Number.isFinite(offsetHeight)) {
      const combined = baselineHeight + offsetHeight;
      if (combined > 0) return combined;
    }
    if (Number.isFinite(baselineHeight) && baselineHeight > 0) return baselineHeight;
  } catch {}
  return 0;
};

export const headerSpacingFallbackPx = (editor) => {
  try {
    const topInches = editor?.converter?.pageStyles?.pageMargins?.top;
    const px = typeof topInches === 'number' ? topInches * CSS_PX_PER_INCH : null;
    return Number.isFinite(px) && px > 0 ? px : 0;
  } catch {
    return 0;
  }
};

export const footerSpacingFallbackPx = (editor) => {
  try {
    const bottomInches = editor?.converter?.pageStyles?.pageMargins?.bottom;
    const px = typeof bottomInches === 'number' ? bottomInches * CSS_PX_PER_INCH : null;
    return Number.isFinite(px) && px > 0 ? px : 0;
  } catch {
    return 0;
  }
};

export const getBandHeightFromSummary = (summary, type, pageIndex, isLastPage) => {
  if (!summary || !summary.sectionMetricsById) return 0;
  const sectionId = resolveSectionIdFromSummary(summary, type, pageIndex, isLastPage);
  if (!sectionId) return 0;

  let metrics = null;
  const lookup = summary.sectionMetricsById;
  if (typeof lookup?.get === 'function') {
    metrics = lookup.get(sectionId) ?? null;
  } else if (lookup && typeof lookup === 'object') {
    metrics = lookup[sectionId] ?? null;
  }

  if (!metrics) {
    return 0;
  }

  const effective = Number(metrics?.effectiveHeightPx);
  if (Number.isFinite(effective) && effective > 0) {
    return effective;
  }

  const content = Number(metrics?.contentHeightPx);
  const distance = Number(metrics?.distancePx);
  const combined = (Number.isFinite(content) ? content : 0) + (Number.isFinite(distance) ? distance : 0);
  return Number.isFinite(combined) ? combined : 0;
};

export const getHeaderHeightForPage = (editor, pageIndex, summary, isLastPage) => {
  const storage = editor?.storage?.pagination;
  const layoutHeight = resolveLayoutBandHeight(storage, pageIndex, 'header');
  if (Number.isFinite(layoutHeight) && layoutHeight > 0) {
    return layoutHeight;
  }
  const fallback = headerSpacingFallbackPx(editor);
  const fromSummary = getBandHeightFromSummary(summary, 'header', pageIndex, isLastPage);
  if (Number.isFinite(fromSummary) && fromSummary > 0) {
    return Math.max(fromSummary, fallback);
  }
  let sectionId = resolveSectionIdForPage(editor, pageIndex + 1, 'headerIds');
  const fromStorage = getSectionHeightFromStorage(storage, 'headers', sectionId);
  if (Number.isFinite(fromStorage) && fromStorage > 0) {
    return Math.max(fromStorage, fallback);
  }
  return fallback;
};

export const getFooterHeightForPage = (editor, pageIndex, summary, isLastPage) => {
  const storage = editor?.storage?.pagination;
  const layoutHeight = resolveLayoutBandHeight(storage, pageIndex, 'footer');
  if (Number.isFinite(layoutHeight) && layoutHeight > 0) {
    return layoutHeight;
  }
  const fallback = footerSpacingFallbackPx(editor);
  const fromSummary = getBandHeightFromSummary(summary, 'footer', pageIndex, isLastPage);
  if (Number.isFinite(fromSummary) && fromSummary > 0) {
    return Math.max(fromSummary, fallback);
  }
  let sectionId = resolveSectionIdForPage(editor, pageIndex + 1, 'footerIds');
  const fromStorage = getSectionHeightFromStorage(storage, 'footers', sectionId);
  if (Number.isFinite(fromStorage) && fromStorage > 0) {
    return Math.max(fromStorage, fallback);
  }
  return fallback;
};

export const getLeadingHeaderSpacingPx = (editor) => {
  const storage = editor?.storage?.pagination;
  const layoutHeight = resolveLayoutBandHeight(storage, 0, 'header');
  if (Number.isFinite(layoutHeight) && layoutHeight > 0) {
    return layoutHeight;
  }
  const summary = storage?.headerFooterSummary;
  let sectionId = resolveSectionIdFromSummary(summary, 'header', 0, false);
  if (!sectionId) {
    sectionId = resolveSectionIdForPage(editor, 1, 'headerIds');
  }
  const fromStorage = getSectionHeightFromStorage(storage, 'headers', sectionId);
  const fallback = headerSpacingFallbackPx(editor);
  if (Number.isFinite(fromStorage) && fromStorage > 0) {
    return Math.max(fromStorage, fallback);
  }
  return fallback;
};

export const getTrailingFooterSpacingPx = (editor, pageBreaks) => {
  const storage = editor?.storage?.pagination;
  const pageCount = getPageCountFromBreaks(pageBreaks);
  const pageIndex = Math.max(pageCount - 1, 0);
  const layoutHeight = resolveLayoutBandHeight(storage, pageIndex, 'footer');
  if (Number.isFinite(layoutHeight) && layoutHeight > 0) {
    return layoutHeight;
  }
  const summary = storage?.headerFooterSummary;

  let sectionId = resolveSectionIdFromSummary(summary, 'footer', pageIndex, true);
  if (!sectionId) {
    sectionId = resolveSectionIdForPage(editor, pageIndex + 1, 'footerIds');
  }

  const fromStorage = getSectionHeightFromStorage(storage, 'footers', sectionId);
  const fallback = footerSpacingFallbackPx(editor);
  if (Number.isFinite(fromStorage) && fromStorage > 0) {
    return Math.max(fromStorage, fallback);
  }

  return fallback;
};

export const resolvePageBandHeights = (editor, pageBreaks) => {
  const pageCount = getPageCountFromBreaks(pageBreaks);
  if (!editor || pageCount <= 0) {
    return { headerHeights: [], footerHeights: [] };
  }

  const storage = editor.storage?.pagination;
  const layoutPages = Array.isArray(storage?.layoutPages) ? storage.layoutPages : null;
  if (layoutPages?.length) {
    const headerHeights = new Array(pageCount).fill(0);
    const footerHeights = new Array(pageCount).fill(0);
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const page = layoutPages[pageIndex] ?? null;
      const headerBand = resolveLayoutBandForPage(page, 'header');
      const footerBand = resolveLayoutBandForPage(page, 'footer');
      headerHeights[pageIndex] = Number.isFinite(headerBand.heightPx) ? headerBand.heightPx : 0;
      footerHeights[pageIndex] = Number.isFinite(footerBand.heightPx) ? footerBand.heightPx : 0;
    }
    return { headerHeights, footerHeights };
  }
  const summary = storage?.headerFooterSummary;
  const headerHeights = new Array(pageCount).fill(0);
  const footerHeights = new Array(pageCount).fill(0);

  console.debug('[band-helper] input-summary', { hasSummary: !!summary, pageCount });
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const isLastPage = pageIndex === pageCount - 1;
    headerHeights[pageIndex] = getHeaderHeightForPage(editor, pageIndex, summary, isLastPage);
    footerHeights[pageIndex] = getFooterHeightForPage(editor, pageIndex, summary, isLastPage);
  }

  console.debug('[band-helper] result', { headerHeights, footerHeights });
  return { headerHeights, footerHeights };
};
