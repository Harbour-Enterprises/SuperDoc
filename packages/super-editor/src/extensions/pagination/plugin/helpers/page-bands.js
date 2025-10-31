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

export default {
  getPageCountFromBreaks,
  resolveSectionIdForPage,
  resolveSectionIdFromSummary,
};
