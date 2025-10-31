import { PaginationPluginKey } from '../index.js';
import { syncSectionDataFromSummary } from '../../section-data.js';

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

const derivePageBreakEntry = (page, nextPage, fallbackIndex) => {
  if (!page) {
    return null;
  }
  const breakTop = toNumber(page?.break?.top);
  if (breakTop == null) {
    return null;
  }
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
  const placeholder = buildPlaceholder(page, nextPage);
  if (placeholder) {
    entry.placeholder = placeholder;
  }
  if (page?.headerFooterAreas) {
    entry.headerFooterAreas = page.headerFooterAreas;
  }
  if (Array.isArray(page?.spacingSegments) && page.spacingSegments.length) {
    entry.spacingSegments = page.spacingSegments.slice();
  }
  return entry;
};

const derivePageBreaks = (pages) => {
  if (!pages.length) {
    return [];
  }
  const breaks = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const entry = derivePageBreakEntry(page, pages[index + 1], index);
    if (entry) {
      breaks.push(entry);
    }
  }
  return breaks;
};

const buildPlaceholder = (currentPage, nextPage) => {
  if (!currentPage || !nextPage) {
    return null;
  }
  const footerHeight = clampPositive(currentPage?.headerFooterAreas?.footer?.reservedHeightPx);
  const headerHeight = clampPositive(nextPage?.headerFooterAreas?.header?.reservedHeightPx);
  const totalSpacing = clampPositive(currentPage?.spacingAfterPx);
  const gapHeight = Math.max(totalSpacing - footerHeight - headerHeight, 0);
  const totalHeight = Math.max(totalSpacing, footerHeight + headerHeight + gapHeight);

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

const getSummary = (layout, engine) => {
  if (layout?.headerFooterSummary && typeof layout.headerFooterSummary === 'object') {
    return layout.headerFooterSummary;
  }
  if (typeof engine?.getHeaderFooterSummary === 'function') {
    return engine.getHeaderFooterSummary();
  }
  return null;
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
  const storage = editor?.storage?.pagination;
  const engine = storage?.engine ?? editor?.measurement ?? null;
  if (!engine) {
    console.debug('[pagination-plugin] skipping pagination update - measurement engine unavailable');
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

  if (storage) {
    storage.layoutPages = pages;
    storage.fieldSegments = Array.isArray(layout?.fieldSegments) ? layout.fieldSegments : [];
    const summary = getSummary(layout, engine);
    storage.headerFooterSummary = summary;
    if (summary && storage.repository) {
      syncSectionDataFromSummary(editor, storage, {
        summary,
        repository: storage.repository,
        layoutPages: pages,
      });
    }
  }

  const pageBreaks = derivePageBreaks(pages);
  if (storage) {
    storage.pageBreaks = pageBreaks;
  }

  // IMPORTANT: Include the layout in the meta so the plugin rebuilds decorations
  // The plugin's apply function checks for meta.layout to trigger decoration rebuild
  const updatedLayout = { ...layout, pages };
  const tr = view.state.tr.setMeta(PaginationPluginKey, { pageBreaks, layout: updatedLayout });
  if (tr.docChanged) {
    throw new Error('Pagination meta transaction should not modify the document');
  }
  view.dispatch(tr);

  if (typeof editor?.emit === 'function') {
    try {
      editor.emit('pagination:update', {
        layout,
        pages,
        pageBreaks,
      });
    } catch {
      // no-op when emit listeners throw
    }
  }
};
