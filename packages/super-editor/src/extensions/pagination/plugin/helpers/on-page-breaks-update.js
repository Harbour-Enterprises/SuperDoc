import { PaginationPluginKey } from '../index.js';
import { computeInterPageGap, resolveLayoutBands } from './page-bands.js';

const toNumber = (value, { allowZero = true } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (!allowZero && numeric === 0) {
    return null;
  }
  return numeric;
};

const clampPositive = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const buildPlaceholderFromLayout = (currentMeta, nextMeta) => {
  if (!currentMeta || !nextMeta) return null;
  const footerBand = currentMeta?.footer ?? {};
  const headerBand = nextMeta?.header ?? {};
  const footerHeight = clampPositive(footerBand?.heightPx);
  const headerHeight = clampPositive(headerBand?.heightPx);
  const gapHeight = clampPositive(computeInterPageGap(currentMeta, nextMeta));
  const totalHeight = footerHeight + gapHeight + headerHeight;
  if (totalHeight <= 0) {
    return null;
  }
  return {
    footerHeightPx: footerHeight,
    headerHeightPx: headerHeight,
    gapHeightPx: gapHeight,
    totalHeightPx: totalHeight,
  };
};

const sanitizeBreakInfo = (breakInfo) => {
  const startOffset = toNumber(breakInfo?.startOffsetPx);
  const breakTop = toNumber(breakInfo?.top);
  const pos = toNumber(breakInfo?.pos);

  const sanitized = {};
  if (startOffset != null) {
    sanitized.startOffsetPx = startOffset;
  }
  if (breakTop != null) {
    sanitized.top = breakTop;
  }
  if (pos != null && pos >= 0) {
    sanitized.pos = pos;
  }

  return sanitized;
};

const sanitizeMetrics = (metrics) => {
  if (!metrics || typeof metrics !== 'object') {
    return {};
  }
  const keys = [
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
    'pageTopOffsetPx',
  ];

  return keys.reduce((acc, key) => {
    const numeric = toNumber(metrics[key]);
    if (numeric != null) {
      acc[key] = numeric;
    }
    return acc;
  }, {});
};

const derivePageBreakEntry = (page, nextPage, fallbackIndex, currentMeta, nextMeta) => {
  if (!page) {
    return null;
  }
  const breakTop = toNumber(page?.break?.top);
  if (breakTop == null) {
    return null;
  }
  const placeholder = buildPlaceholderFromLayout(currentMeta, nextMeta);
  const pageIndex = Number.isInteger(page?.pageIndex) ? page.pageIndex : fallbackIndex;
  const entry = {
    pageIndex,
    break: sanitizeBreakInfo(page?.break),
    metrics: sanitizeMetrics(page?.metrics ?? {}),
  };
  if (Number.isFinite(page?.pageTopOffsetPx)) {
    entry.metrics.pageTopOffsetPx = Number(page.pageTopOffsetPx);
  }
  if (Number.isFinite(page?.pageGapPx)) {
    entry.metrics.pageGapPx = Number(page.pageGapPx);
  }
  const pos = entry.break?.pos;
  if (pos != null) {
    entry.pos = pos;
  }
  if (placeholder) {
    entry.placeholder = placeholder;
  }
  if (page?.headerFooterAreas) {
    entry.headerFooterAreas = page.headerFooterAreas;
  }
  return entry;
};

const derivePageBreaks = (pages, layoutBands) => {
  if (!pages.length) {
    return [];
  }
  const breaks = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const entry = derivePageBreakEntry(page, pages[index + 1], index, layoutBands[index], layoutBands[index + 1]);
    if (entry) {
      breaks.push(entry);
    }
  }
  return breaks;
};

/**
 * Handle page breaks update from measurement engine.
 * Restores inline widgets by translating the layout payload into page break metadata.
 * @param {import('../../../../../core/Editor.js').Editor} editor
 * @param {{ pages?: Array }} layout
 * @returns {void}
 */
export const onPageBreaksUpdate = (editor, layout) => {
  const view = editor?.view;
  if (!view) {
    console.debug('[pagination-plugin] page break update without view');
    return;
  }

  const rawPages = Array.isArray(layout?.pages) ? layout.pages : [];
  const pages = rawPages.map((page, index) => {
    if (index === rawPages.length - 1) {
      const sanitizedBreak = page?.break ? { ...page.break } : null;
      if (sanitizedBreak) {
        delete sanitizedBreak.top;
        delete sanitizedBreak.totalHeightPx;
      }
      return {
        ...page,
        break: sanitizedBreak ?? page?.break ?? null,
      };
    }
    return page;
  });

  const layoutBands = resolveLayoutBands(pages);
  const storage = editor?.storage?.pagination;
  if (storage) {
    storage.layoutPages = pages;
    storage.fieldSegments = Array.isArray(layout?.fieldSegments) ? layout.fieldSegments : [];
  }

  const pageBreaks = derivePageBreaks(pages, layoutBands);
  const tr = view.state.tr.setMeta(PaginationPluginKey, { pageBreaks });
  if (tr.docChanged) {
    throw new Error('Pagination meta transaction should not modify the document');
  }
  view.dispatch(tr);
};
