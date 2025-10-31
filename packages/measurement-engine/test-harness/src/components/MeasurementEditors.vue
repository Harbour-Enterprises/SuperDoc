<script setup>
import '@/assets/styles/elements/prosemirror.css';
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { getFileObject } from 'superdoc';
import { Editor, getStarterExtensions } from '@measurement-engine';
import defaultFile from '/sdpr.docx?url';
import Ruler from './Ruler.vue';
import {
  coerceFinite,
  cloneDeep,
  cloneLayoutPage,
  sanitizeObject,
  sanitizeMargins,
  sanitizeBreak,
  sanitizeMetrics,
  sanitizeHeaderFooterArea,
  sanitizeHeaderFooterAreas,
  sanitizeRowBreaks,
  sanitizeOverflow,
  sanitizeBoundary,
  formatPixels,
  sanitizeExportBase,
  createHeaderFooterState,
  resolveDrawerId,
  resolveBreakIdentifier,
} from '../utils/measurement-utils';

const DEBUG_MODE = false; // Set to true to enable debug logging
const debugLog = (...args) => {
  if (DEBUG_MODE) console.log(...args);
};

const ensurePaginationLogs = ({ reset = false } = {}) => {
  if (typeof globalThis === 'undefined') return;

  if (reset || !Array.isArray(globalThis.__paginationOverflowLogs)) {
    globalThis.__paginationOverflowLogs = [];
  }

  if (reset || !Array.isArray(globalThis.__paginationTableLogs)) {
    globalThis.__paginationTableLogs = [];
  }
};

const installPaginationLogging = (instance) => {
  if (!instance || instance.__testHarnessLogsInstalled) {
    return;
  }

  const originalCalculate = typeof instance.calculatePageBreaks === 'function' ? instance.calculatePageBreaks : null;
  if (!originalCalculate) {
    return;
  }

  instance.calculatePageBreaks = function patchedCalculatePageBreaks(...args) {
    ensurePaginationLogs({ reset: true });
    const result = originalCalculate.apply(this, args);
    instance.__paginationLogs = {
      overflow: globalThis.__paginationOverflowLogs,
      table: globalThis.__paginationTableLogs,
    };
    return result;
  };

  instance.__testHarnessLogsInstalled = true;
  ensurePaginationLogs();
};

ensurePaginationLogs();

// ============================================================================
// STATE
// ============================================================================

const editor = shallowRef(null);
const engine = shallowRef(null);
const fileSource = ref(null);
const editorElement = ref(null);
const measurementEditor = ref(null);
const lastPageBreaks = ref([]);
const pageBreakMarkers = ref([]);
const currentLayoutPages = ref([]);
const isLoadingDocument = ref(false);
const currentObjectUrl = ref(null);
const activeTab = ref('editor');
const toolsDrawerId = 'test-tools-content';
const isToolsDrawerOpen = ref(true);
const isCopyingLayout = ref(false);
const layoutCopyMessage = ref('');
const layoutCopyIsError = ref(false);
const layoutCopyTimer = ref(null);
const isImportingLayout = ref(false);
const layoutImportInput = ref(null);
const canCopyLayout = computed(() => currentLayoutPages.value.length > 0);

const headerFooterState = ref(createHeaderFooterState());
const headerVariantLookup = computed(() => new Map(headerFooterState.value?.variants?.header ?? []));
const footerVariantLookup = computed(() => new Map(headerFooterState.value?.variants?.footer ?? []));
const headerMetricsById = computed(() => {
  const map = new Map();
  (headerFooterState.value?.headers ?? []).forEach((record) => {
    if (record?.id) {
      map.set(record.id, record.metrics ?? null);
    }
  });
  return map;
});
const footerMetricsById = computed(() => {
  const map = new Map();
  (headerFooterState.value?.footers ?? []).forEach((record) => {
    if (record?.id) {
      map.set(record.id, record.metrics ?? null);
    }
  });
  return map;
});
let markerAnimationFrame = null;
let markerAnimationUsingTimeout = false;
const paginationListenerCleanup = [];

const removePaginationListeners = () => {
  while (paginationListenerCleanup.length) {
    const dispose = paginationListenerCleanup.pop();
    try {
      dispose?.();
    } catch {
      // ignore cleanup errors
    }
  }
};

function cloneBreakEntries(entries = []) {
  return entries.map((entry, index) => cloneLayoutEntry(entry, index)).filter(Boolean);
}

const onPaginationEngineReady = ({ engine: readyEngine } = {}) => {
  resetManualOverrides();
  engine.value = readyEngine ?? null;
  if (!engine.value) {
    return;
  }

  installPaginationLogging(engine.value);
  if (!engine.value.__testHarnessLogsRecalculated) {
    engine.value.__testHarnessLogsRecalculated = true;
    try {
      engine.value.calculatePageBreaks();
    } catch (error) {
      console.warn('Pagination log recalculation failed', error);
    }
  }

  const breakEntries = Array.isArray(engine.value.pageBreaks) ? engine.value.pageBreaks : [];
  if (breakEntries.length) {
    lastPageBreaks.value = cloneBreakEntries(breakEntries);
  }

  if (Array.isArray(engine.value.layoutPackage?.pages)) {
    currentLayoutPages.value = engine.value.layoutPackage.pages
      .map((page, index) => createPageSnapshot(page, index))
      .filter(Boolean);
  }

  updateHeaderFooterSummary();
  scheduleMarkerUpdate();
};

const onPaginationEngineDestroyed = () => {
  engine.value = null;
  lastPageBreaks.value = [];
  currentLayoutPages.value = [];
  headerFooterState.value = createHeaderFooterState();
  resetManualOverrides();
  scheduleMarkerUpdate();
};

const onPaginationRepositoryReady = async ({ repository, engine: readyEngine } = {}) => {
  const engineInstance = readyEngine || engine.value;

  if (readyEngine) {
    readyEngine.headerFooterRepository = repository;
  } else if (engine.value) {
    engine.value.headerFooterRepository = repository;
  }

  // Wait for header/footer measurements to complete before updating
  if (engineInstance?.headerFooterPromise) {
    try {
      await engineInstance.headerFooterPromise;
    } catch {
      // Ignore header/footer measurement errors
    }
  }

  updateHeaderFooterSummary();
  if (engine.value) {
    scheduleMarkerUpdate();
  }
};

const onPaginationRepositoryCleared = () => {
  headerFooterState.value = createHeaderFooterState();
  scheduleMarkerUpdate();
};

const onPaginationUpdate = ({ layout, pageBreaks } = {}) => {
  const pages = Array.isArray(layout?.pages) ? layout.pages : [];
  const breaksSource = Array.isArray(pageBreaks) && pageBreaks.length ? pageBreaks : pages;

  lastPageBreaks.value = cloneBreakEntries(breaksSource);
  if (pages.length) {
    currentLayoutPages.value = pages.map((page, index) => createPageSnapshot(page, index)).filter(Boolean);
  } else if (!pages.length && engine.value?.layoutPackage?.pages) {
    currentLayoutPages.value = engine.value.layoutPackage.pages
      .map((page, index) => createPageSnapshot(page, index))
      .filter(Boolean);
  }

  updateHeaderFooterSummary();
  scheduleMarkerUpdate();
};

const attachPaginationListeners = (instance) => {
  removePaginationListeners();
  if (!instance || typeof instance.on !== 'function' || typeof instance.off !== 'function') return;

  const bindings = [
    ['pagination:engine-ready', onPaginationEngineReady],
    ['pagination:engine-destroyed', onPaginationEngineDestroyed],
    ['pagination:repository-ready', onPaginationRepositoryReady],
    ['pagination:repository-cleared', onPaginationRepositoryCleared],
    ['pagination:update', onPaginationUpdate],
  ];

  bindings.forEach(([event, handler]) => {
    instance.on(event, handler);
    paginationListenerCleanup.push(() => {
      try {
        instance.off(event, handler);
      } catch {
        // ignore
      }
    });
  });

  const storage = instance?.storage?.pagination ?? null;
  if (storage?.engine) {
    onPaginationEngineReady({ engine: storage.engine });
  }
  if (storage?.repository) {
    onPaginationRepositoryReady({ repository: storage.repository, engine: storage.engine ?? null });
  }
  if (storage?.layout) {
    onPaginationUpdate({ layout: storage.layout, pageBreaks: storage.pageBreaks ?? [] });
  } else if (Array.isArray(storage?.layoutPages)) {
    onPaginationUpdate({ layout: { pages: storage.layoutPages } });
  }
};

// resolveBreakIdentifier now imported from utils

const resolveBreakTopOffset = (entry, fallbackIndex) => {
  const primaryBreak = entry?.break ?? null;
  const boundary = entry?.boundary ?? {};
  const pageIndex = Number.isFinite(entry?.pageIndex) ? entry.pageIndex : fallbackIndex;
  const marginTop = Number.isFinite(boundary?.marginsPx?.top) ? boundary.marginsPx.top : 0;
  const stride = Number.isFinite(boundary?.usableHeightPx)
    ? boundary.usableHeightPx
    : Number.isFinite(boundary?.pageHeightPx)
      ? boundary.pageHeightPx
      : 0;

  const topCandidates = [primaryBreak?.fittedTop, primaryBreak?.top, primaryBreak?.bottom, primaryBreak?.fittedBottom];

  const breakTop = topCandidates.find((value) => Number.isFinite(value)) ?? null;
  if (!Number.isFinite(breakTop)) return null;

  const verticalOffset = marginTop + pageIndex * stride + breakTop;
  return Number.isFinite(verticalOffset) ? verticalOffset : null;
};

const pageBreakLines = computed(() => {
  if (!Array.isArray(lastPageBreaks.value)) return [];

  return lastPageBreaks.value
    .map((entry, index) => {
      const primaryBreak = entry?.break ?? null;
      if (!primaryBreak) return null;

      const verticalOffset = resolveBreakTopOffset(entry, index);
      if (!Number.isFinite(verticalOffset)) return null;

      const key = resolveBreakIdentifier(entry, index);

      return {
        id: key,
        top: verticalOffset,
      };
    })
    .filter(Boolean);
});

const snapshotHeaderFooterArea = (area) =>
  area
    ? {
        ...area,
        metrics: area.metrics ? { ...area.metrics } : {},
      }
    : null;

const createPageSnapshot = (page, index) => {
  if (!page) return null;

  const fallbackIndex = Number.isInteger(page?.pageIndex) ? page.pageIndex : index;
  const metrics = page?.metrics ? { ...page.metrics } : {};
  const snapshot = {
    id: resolveBreakIdentifier(page, fallbackIndex),
    pageIndex: Number.isInteger(page?.pageIndex) ? page.pageIndex : fallbackIndex,
    break: page?.break ? { ...page.break } : {},
    metrics,
    headerFooterAreas: page?.headerFooterAreas
      ? {
          header: snapshotHeaderFooterArea(page.headerFooterAreas.header),
          footer: snapshotHeaderFooterArea(page.headerFooterAreas.footer),
        }
      : { header: null, footer: null },
    pageGapPx: Number.isFinite(page?.pageGapPx)
      ? page.pageGapPx
      : Number.isFinite(metrics.pageGapPx)
        ? metrics.pageGapPx
        : null,
    pageBottomSpacingPx: Number.isFinite(page?.pageBottomSpacingPx) ? page.pageBottomSpacingPx : null,
  };

  if (page?.boundary) {
    snapshot.boundary = { ...page.boundary };
  }

  return snapshot;
};

const cloneLayoutEntry = (entry, fallbackIndex) => {
  if (!entry) return null;
  const clone = { ...entry };
  const pageIndex = Number.isInteger(entry?.pageIndex) ? entry.pageIndex : fallbackIndex;
  clone.pageIndex = pageIndex;

  if (entry.break) clone.break = { ...entry.break };
  if (entry.metrics) clone.metrics = { ...entry.metrics };
  if (entry.placeholder) clone.placeholder = { ...entry.placeholder };
  if (entry.boundary) clone.boundary = { ...entry.boundary };
  if (entry.layoutMeta) clone.layoutMeta = { ...entry.layoutMeta };
  if (entry.position) clone.position = { ...entry.position };

  if (entry.headerFooterAreas) {
    clone.headerFooterAreas = {
      header: snapshotHeaderFooterArea(entry.headerFooterAreas.header),
      footer: snapshotHeaderFooterArea(entry.headerFooterAreas.footer),
    };
  }

  return clone;
};

const syncLayoutPages = () => {
  const layoutPages = engine.value?.layoutPackage?.pages;

  if (Array.isArray(layoutPages) && layoutPages.length) {
    currentLayoutPages.value = layoutPages.map((page, index) => createPageSnapshot(page, index)).filter(Boolean);
    scheduleMarkerUpdate();
    return;
  }

  if (Array.isArray(lastPageBreaks.value) && lastPageBreaks.value.length) {
    currentLayoutPages.value = lastPageBreaks.value.map((entry, index) => {
      const snapshot = createPageSnapshot(entry, index) ?? {
        id: resolveBreakIdentifier(entry, index),
        pageIndex: Number.isInteger(entry?.pageIndex) ? entry.pageIndex : index,
        break: entry?.break ? { ...entry.break } : {},
        metrics: {},
        headerFooterAreas: { header: null, footer: null },
        pageGapPx: null,
        pageBottomSpacingPx: null,
      };

      if (!snapshot.metrics) {
        snapshot.metrics = {};
      }

      const boundary = entry?.boundary ?? {};
      if (boundary.marginsPx) {
        if (!Number.isFinite(snapshot.metrics.marginTopPx) && Number.isFinite(boundary.marginsPx.top)) {
          snapshot.metrics.marginTopPx = boundary.marginsPx.top;
        }
        if (!Number.isFinite(snapshot.metrics.marginBottomPx) && Number.isFinite(boundary.marginsPx.bottom)) {
          snapshot.metrics.marginBottomPx = boundary.marginsPx.bottom;
        }
      }
      if (!Number.isFinite(snapshot.metrics.contentHeightPx) && Number.isFinite(boundary.usableHeightPx)) {
        snapshot.metrics.contentHeightPx = boundary.usableHeightPx;
      }
      if (!Number.isFinite(snapshot.metrics.pageHeightPx) && Number.isFinite(boundary.pageHeightPx)) {
        snapshot.metrics.pageHeightPx = boundary.pageHeightPx;
      }
      if (!Number.isFinite(snapshot.pageGapPx) && Number.isFinite(boundary.pageGapPx)) {
        snapshot.pageGapPx = boundary.pageGapPx;
      }

      return snapshot;
    });
    scheduleMarkerUpdate();
    return;
  }

  currentLayoutPages.value = [];
  scheduleMarkerUpdate();
};

const clearMarkerAnimation = () => {
  if (markerAnimationFrame === null) return;

  if (markerAnimationUsingTimeout) {
    clearTimeout(markerAnimationFrame);
  } else {
    cancelAnimationFrame(markerAnimationFrame);
  }
  markerAnimationFrame = null;
  markerAnimationUsingTimeout = false;
};

const getBreakCoords = (view, pos) => {
  if (!view || !Number.isFinite(pos)) return null;
  const docSize = Number.isFinite(view.state?.doc?.content?.size) ? view.state.doc.content.size : 0;
  const clamped = Math.max(0, Math.min(pos, docSize));
  const clampToDoc = (value) => Math.max(0, Math.min(docSize, value));
  const base = clampToDoc(clamped);
  const before = clampToDoc(base - 1);
  const after = clampToDoc(base + 1);
  const attempts = [
    { pos: after, side: -1 },
    { pos: after, side: 1 },
    { pos: base, side: 1 },
    { pos: base, side: -1 },
    { pos: before, side: 1 },
    { pos: before, side: -1 },
  ];
  const seen = new Set();

  for (const { pos: candidatePos, side } of attempts) {
    const key = `${candidatePos}:${side}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const coords = view.coordsAtPos(candidatePos, side);
      if (coords && Number.isFinite(coords.top) && Number.isFinite(coords.left)) {
        return coords;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
};

const updatePageBreakMarkers = async () => {
  const measurementView = engine.value?.measurementEditor?.view ?? null;
  const surfaceEl = measurementEditor.value ?? null;

  if (!measurementView || !surfaceEl) {
    pageBreakMarkers.value = [];
    positionHighlightRects.value = [];
    return;
  }

  await nextTick();

  const surfaceRect = surfaceEl.getBoundingClientRect();
  const scrollLeft = surfaceEl.scrollLeft ?? 0;
  const lineLookup = new Map(pageBreakLines.value.map((line) => [line.id, line.top]));

  const markers = lastPageBreaks.value
    .map((entry, index) => {
      const pos = Number.isFinite(entry?.break?.pos) ? entry.break.pos : null;
      if (!Number.isFinite(pos)) return null;

      const coords = getBreakCoords(measurementView, pos);
      if (!coords) return null;

      const identifier = resolveBreakIdentifier(entry, index);
      const verticalOffset = lineLookup.get(identifier) ?? resolveBreakTopOffset(entry, index);
      const fallbackTop = coords.top - surfaceRect.top;
      const markerTop = Number.isFinite(verticalOffset) ? verticalOffset : fallbackTop;

      const localLeft = coords.left - surfaceRect.left + scrollLeft;
      if (!Number.isFinite(markerTop) || !Number.isFinite(localLeft)) return null;

      return {
        id: identifier,
        top: markerTop,
        left: localLeft,
      };
    })
    .filter(Boolean);

  pageBreakMarkers.value = markers;
};

const clampDomOffset = (node, offset) => {
  if (!node) return 0;
  if (node.nodeType === Node.TEXT_NODE) {
    const length = node.nodeValue?.length ?? 0;
    return Math.max(0, Math.min(offset, length));
  }
  const childCount = node.childNodes?.length ?? 0;
  return Math.max(0, Math.min(offset, childCount));
};

const computeRectForDocPos = (view, pos, docSize) => {
  if (!view || !Number.isFinite(pos)) return null;
  const clampedPos = Math.max(0, Math.min(pos, docSize));
  const nextPos = Math.min(docSize, clampedPos + (clampedPos < docSize ? 1 : 0));

  try {
    const range = document.createRange();
    const start = view.domAtPos(clampedPos);
    const end = view.domAtPos(nextPos);
    if (!start?.node) return null;

    range.setStart(start.node, clampDomOffset(start.node, start.offset));
    if (end?.node) {
      range.setEnd(end.node, clampDomOffset(end.node, end.offset));
    } else {
      range.setEnd(start.node, clampDomOffset(start.node, start.offset));
    }

    const rect = range.getBoundingClientRect();
    if (rect && (rect.width > 0 || rect.height > 0)) {
      return rect;
    }

    const rects = range.getClientRects?.();
    if (rects && rects.length) {
      return rects[0];
    }
  } catch {
    // fall through to coordsAtPos
  }

  try {
    const coords = view.coordsAtPos(clampedPos, 1);
    if (!coords) return null;
    const height = Math.max(coords.bottom - coords.top, 18);
    return new DOMRect(coords.left, coords.top, 2, height);
  } catch {
    return null;
  }
};

const updatePositionHighlights = async () => {
  const measurementView = engine.value?.measurementEditor?.view ?? null;
  const surfaceEl = measurementEditor.value ?? null;

  if (!measurementView || !surfaceEl) {
    positionHighlightRects.value = [];
    return;
  }

  await nextTick();

  const surfaceRect = surfaceEl.getBoundingClientRect();
  const scrollLeft = surfaceEl.scrollLeft ?? 0;
  const docSize =
    Number.isFinite(measurementView.state?.doc?.content?.size) && measurementView.state.doc.content.size > 0
      ? measurementView.state.doc.content.size
      : Math.max(0, (measurementView.state?.doc?.nodeSize ?? 0) - 2);

  const highlights = currentBreakSummaries.value
    .map((summary) => {
      const rawValue = getPositionValue(summary.id);
      const numeric = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(numeric)) return null;

      const rect = computeRectForDocPos(measurementView, numeric, docSize);
      if (!rect) return null;

      const width = Math.max(rect.width, 2);
      const height = Math.max(rect.height, 2);

      return {
        id: summary.id,
        top: rect.top - surfaceRect.top,
        left: rect.left - surfaceRect.left + scrollLeft,
        width,
        height,
      };
    })
    .filter(Boolean);

  positionHighlightRects.value = highlights;
};

const runOverlayUpdates = async () => {
  await updatePageBreakMarkers();
  await updatePositionHighlights();
};

const scheduleMarkerUpdate = () => {
  clearMarkerAnimation();
  const useRaf = typeof requestAnimationFrame === 'function';
  markerAnimationUsingTimeout = !useRaf;
  markerAnimationFrame = useRaf
    ? requestAnimationFrame(() => {
        markerAnimationFrame = null;
        markerAnimationUsingTimeout = false;
        runOverlayUpdates().catch(() => {});
      })
    : setTimeout(() => {
        markerAnimationFrame = null;
        markerAnimationUsingTimeout = false;
        runOverlayUpdates().catch(() => {});
      }, 16);
};

const scheduleManualUpdate = () => {
  if (manualApplyFrame && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(manualApplyFrame);
    manualApplyFrame = null;
  }
  applyManualAdjustments();
};

const clearLayoutCopyFeedbackTimer = () => {
  if (layoutCopyTimer.value) {
    clearTimeout(layoutCopyTimer.value);
    layoutCopyTimer.value = null;
  }
};

const showLayoutCopyFeedback = (message, isError = false) => {
  clearLayoutCopyFeedbackTimer();
  layoutCopyMessage.value = message;
  layoutCopyIsError.value = isError;
  layoutCopyTimer.value = setTimeout(() => {
    layoutCopyMessage.value = '';
    layoutCopyIsError.value = false;
    layoutCopyTimer.value = null;
  }, 2400);
};

const fallbackCopyText = (text) => {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
};

const copyTextToClipboard = async (text) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return fallbackCopyText(text);
};

// formatPixels and createHeaderFooterState now imported from utils

const resolveSectionVariantId = (variantMap, pageIndex, isLastPage) => {
  if (!(variantMap instanceof Map) || variantMap.size === 0) {
    return null;
  }

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

  for (const variant of candidates) {
    if (variantMap.has(variant)) {
      return variantMap.get(variant);
    }
  }
  return null;
};

const currentBreakSummaries = computed(() =>
  currentLayoutPages.value.map((page, index, pages) => {
    const breakInfo = page?.break ?? {};
    const metrics = page?.metrics ?? {};
    const headerArea = page?.headerFooterAreas?.header ?? null;
    const footerArea = page?.headerFooterAreas?.footer ?? null;
    const isLastPage = index === (pages?.length ?? 1) - 1;
    let headerId = headerArea?.id ?? null;
    let footerId = footerArea?.id ?? null;
    if (!headerId) {
      headerId = resolveSectionVariantId(headerVariantLookup.value, index, isLastPage);
    }
    if (!footerId) {
      footerId = resolveSectionVariantId(footerVariantLookup.value, index, isLastPage);
    }
    const headerSummaryMetrics = headerId ? (headerMetricsById.value.get(headerId) ?? null) : null;
    const footerSummaryMetrics = footerId ? (footerMetricsById.value.get(footerId) ?? null) : null;
    const headerEffective = Number.isFinite(headerArea?.metrics?.effectiveHeightPx)
      ? headerArea.metrics.effectiveHeightPx
      : Number.isFinite(headerSummaryMetrics?.effectiveHeightPx)
        ? headerSummaryMetrics.effectiveHeightPx
        : Number.isFinite(metrics.headerHeightPx)
          ? metrics.headerHeightPx
          : null;
    const footerEffective = Number.isFinite(footerArea?.metrics?.effectiveHeightPx)
      ? footerArea.metrics.effectiveHeightPx
      : Number.isFinite(footerSummaryMetrics?.effectiveHeightPx)
        ? footerSummaryMetrics.effectiveHeightPx
        : Number.isFinite(metrics.footerHeightPx)
          ? metrics.footerHeightPx
          : null;
    const headerOffset = Number.isFinite(headerArea?.metrics?.offsetPx)
      ? headerArea.metrics.offsetPx
      : Number.isFinite(headerSummaryMetrics?.distancePx)
        ? headerSummaryMetrics.distancePx
        : null;
    const footerOffset = Number.isFinite(footerArea?.metrics?.offsetPx)
      ? footerArea.metrics.offsetPx
      : Number.isFinite(footerSummaryMetrics?.distancePx)
        ? footerSummaryMetrics.distancePx
        : null;

    return {
      id: page?.id ?? resolveBreakIdentifier(page, index),
      pageIndex: Number.isInteger(page?.pageIndex) ? page.pageIndex : index,
      breakPos: Number.isFinite(breakInfo.pos) ? breakInfo.pos : null,
      breakTop: Number.isFinite(breakInfo.top) ? breakInfo.top : null,
      fittedTop: Number.isFinite(breakInfo.fittedTop) ? breakInfo.fittedTop : null,
      breakBottom: Number.isFinite(breakInfo.bottom) ? breakInfo.bottom : null,
      fittedBottom: Number.isFinite(breakInfo.fittedBottom) ? breakInfo.fittedBottom : null,
      startOffset: Number.isFinite(breakInfo.startOffsetPx) ? breakInfo.startOffsetPx : null,
      marginTop: Number.isFinite(metrics.marginTopPx) ? metrics.marginTopPx : null,
      marginBottom: Number.isFinite(metrics.marginBottomPx) ? metrics.marginBottomPx : null,
      contentHeight: Number.isFinite(metrics.contentHeightPx) ? metrics.contentHeightPx : null,
      pageHeight: Number.isFinite(metrics.pageHeightPx) ? metrics.pageHeightPx : null,
      pageGap: Number.isFinite(page?.pageGapPx)
        ? page.pageGapPx
        : Number.isFinite(metrics.pageGapPx)
          ? metrics.pageGapPx
          : null,
      extraSpacing: Number.isFinite(page?.pageBottomSpacingPx) ? page.pageBottomSpacingPx : 0,
      headerId,
      footerId,
      headerOffset,
      footerOffset,
      headerEffective,
      footerEffective,
      isLastPage,
      footerReserved: (() => {
        const footerHeight = Number.isFinite(metrics?.footerHeightPx) ? metrics.footerHeightPx : 0;
        const footerMargin = Number.isFinite(metrics?.marginBottomPx) ? metrics.marginBottomPx : footerHeight;
        return Math.max(footerHeight, footerMargin, 0);
      })(),
      pageGap: Number.isFinite(metrics?.pageGapPx) ? metrics.pageGapPx : 0,
      nextHeaderReserved: (() => {
        const nextPage = Array.isArray(pages) ? pages[index + 1] : null;
        if (!nextPage) return 0;
        const nextMetrics = nextPage?.metrics ?? {};
        const nextHeaderHeight = Number.isFinite(nextMetrics?.headerHeightPx) ? nextMetrics.headerHeightPx : 0;
        const nextHeaderMargin = Number.isFinite(nextMetrics?.marginTopPx) ? nextMetrics.marginTopPx : nextHeaderHeight;
        return Math.max(nextHeaderHeight, nextHeaderMargin, 0);
      })(),
      get totalSpacing() {
        return (
          (this.footerReserved ?? 0) + (this.pageGap ?? 0) + (this.nextHeaderReserved ?? 0) + (this.extraSpacing ?? 0)
        );
      },
      get reservedSpacing() {
        return (this.footerReserved ?? 0) + (this.pageGap ?? 0) + (this.nextHeaderReserved ?? 0);
      },
    };
  }),
);

const hasCurrentBreaks = computed(() => currentBreakSummaries.value.length > 0);
const breakDrawerStates = ref({});
const breakPositionInputs = ref({});
const spacerHeightInputs = ref({});
const manualLayoutPackage = shallowRef(null);
const manualOverrideSnapshot = ref({
  positions: {},
  spacers: {},
  headers: {},
  footers: {},
});
let manualApplyFrame = null;
const positionHighlightRects = ref([]);
const headerHeightInputs = ref({});
const footerHeightInputs = ref({});
const exportBaseName = ref('layout-export');

// resolveDrawerId now imported from utils

const resetManualOverrides = () => {
  if (manualApplyFrame && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(manualApplyFrame);
    manualApplyFrame = null;
  }
  pendingPositionEdits.clear();
  manualLayoutPackage.value = null;
  manualOverrideSnapshot.value = { positions: {}, spacers: {}, headers: {}, footers: {} };
};

const updateExportBaseName = (value) => {
  exportBaseName.value = sanitizeExportBase(value);
};

const isBreakExpanded = (id) => {
  const key = resolveDrawerId(id);
  const states = breakDrawerStates.value;
  if (Object.prototype.hasOwnProperty.call(states, key)) {
    return states[key];
  }
  return false;
};

const toggleBreakDrawer = (id) => {
  const key = resolveDrawerId(id);
  breakDrawerStates.value = { ...breakDrawerStates.value, [key]: !isBreakExpanded(id) };
};

const getPositionValue = (id) => {
  const key = resolveDrawerId(id);
  const inputs = breakPositionInputs.value;
  if (Object.prototype.hasOwnProperty.call(inputs, key)) {
    return inputs[key];
  }
  return '';
};

const updatePositionValue = (id, value) => {
  const key = resolveDrawerId(id);
  breakPositionInputs.value = { ...breakPositionInputs.value, [key]: value };
};

const updateSpacerValue = (id, value) => {
  const key = resolveDrawerId(id);
  spacerHeightInputs.value = { ...spacerHeightInputs.value, [key]: value };
};

const updateHeaderHeightValue = (id, value) => {
  if (!id) return;
  headerHeightInputs.value = { ...headerHeightInputs.value, [id]: value };
};

const updateFooterHeightValue = (id, value) => {
  if (!id) return;
  footerHeightInputs.value = { ...footerHeightInputs.value, [id]: value };
};

const pendingPositionEdits = new Set();
const pendingSpacerEdits = new Set();

const handlePositionInput = (id, event) => {
  updatePositionValue(id, event?.target?.value ?? '');
  pendingPositionEdits.add(resolveDrawerId(id));
  scheduleMarkerUpdate();
};

const resolveNumericPosition = (id) => {
  const key = resolveDrawerId(id);
  const raw = breakPositionInputs.value[key];
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const summary = currentBreakSummaries.value.find((entry) => entry.id === id);
  if (summary && Number.isFinite(summary.breakPos)) {
    return summary.breakPos;
  }
  return null;
};

const getSpacerValue = (id) => {
  const key = resolveDrawerId(id);
  const inputs = spacerHeightInputs.value;
  if (Object.prototype.hasOwnProperty.call(inputs, key) && inputs[key] !== '') {
    return inputs[key];
  }
  const summary = currentBreakSummaries.value.find((entry) => entry.id === id);
  if (summary && Number.isFinite(summary.totalSpacing)) {
    return String(summary.totalSpacing);
  }
  return '';
};

const getHeaderHeightValue = (headerId) => {
  if (!headerId) return '';
  const inputs = headerHeightInputs.value;
  if (Object.prototype.hasOwnProperty.call(inputs, headerId)) {
    return inputs[headerId];
  }
  return '';
};

const getFooterHeightValue = (footerId) => {
  if (!footerId) return '';
  const inputs = footerHeightInputs.value;
  if (Object.prototype.hasOwnProperty.call(inputs, footerId)) {
    return inputs[footerId];
  }
  return '';
};

const commitPositionValue = (id) => {
  const key = resolveDrawerId(id);
  if (!pendingPositionEdits.has(key)) return;
  pendingPositionEdits.delete(key);
  scheduleManualUpdate();
};

const resolveNumericSpacer = (id) => {
  const key = resolveDrawerId(id);
  const raw = spacerHeightInputs.value[key];
  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed) && raw !== '' && !Number.isNaN(parsed)) {
    return parsed;
  }
  const summary = currentBreakSummaries.value.find((entry) => entry.id === id);
  if (summary && Number.isFinite(summary.totalSpacing)) {
    return summary.totalSpacing;
  }
  return null;
};

const handleSpacerInput = (id, event) => {
  updateSpacerValue(id, event?.target?.value ?? '');
  pendingSpacerEdits.add(resolveDrawerId(id));
};

const commitSpacerValue = (id) => {
  const key = resolveDrawerId(id);
  if (!pendingSpacerEdits.has(key)) return;
  pendingSpacerEdits.delete(key);
  scheduleMarkerUpdate();
  scheduleManualUpdate();
};

const resolveHeaderHeight = (headerId) => {
  if (!headerId) return null;
  const raw = headerHeightInputs.value[headerId];
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveFooterHeight = (footerId) => {
  if (!footerId) return null;
  const raw = footerHeightInputs.value[footerId];
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const handleHeaderHeightInput = (headerId, event) => {
  updateHeaderHeightValue(headerId, event?.target?.value ?? '');
  scheduleManualUpdate();
};

const handleFooterHeightInput = (footerId, event) => {
  updateFooterHeightValue(footerId, event?.target?.value ?? '');
  scheduleManualUpdate();
};

const adjustPositionValue = (id, delta) => {
  const current = resolveNumericPosition(id);
  if (current == null) return;
  const next = current + delta;
  updatePositionValue(id, String(next));
  pendingPositionEdits.delete(resolveDrawerId(id));
  scheduleMarkerUpdate();
  scheduleManualUpdate();
};

const adjustSpacerValue = (id, delta) => {
  const current = resolveNumericSpacer(id);
  const base = Number.isFinite(current) ? current : 0;
  const next = Math.max(0, base + delta);
  updateSpacerValue(id, String(next));
  pendingSpacerEdits.add(resolveDrawerId(id));
  scheduleMarkerUpdate();
  scheduleManualUpdate();
  commitSpacerValue(id);
};

const adjustHeaderHeight = (headerId, delta) => {
  if (!headerId) return;
  const current = resolveHeaderHeight(headerId);
  const base = Number.isFinite(current) ? current : 0;
  const next = Math.max(0, base + delta);
  updateHeaderHeightValue(headerId, String(next));
  scheduleManualUpdate();
};

const adjustFooterHeight = (footerId, delta) => {
  if (!footerId) return;
  const current = resolveFooterHeight(footerId);
  const base = Number.isFinite(current) ? current : 0;
  const next = Math.max(0, base + delta);
  updateFooterHeightValue(footerId, String(next));
  scheduleManualUpdate();
};

watch(
  currentBreakSummaries,
  (summaries) => {
    if (!Array.isArray(summaries) || summaries.length === 0) {
      breakDrawerStates.value = {};
      breakPositionInputs.value = {};
      spacerHeightInputs.value = {};
      headerHeightInputs.value = {};
      footerHeightInputs.value = {};
      return;
    }
    const previousDrawer = breakDrawerStates.value ?? {};
    const previousPositions = breakPositionInputs.value ?? {};
    const previousSpacers = spacerHeightInputs.value ?? {};
    const previousHeaderInputs = headerHeightInputs.value ?? {};
    const previousFooterInputs = footerHeightInputs.value ?? {};

    const nextDrawer = {};
    const nextPositions = {};
    const nextSpacers = {};
    const nextHeaderInputs = { ...previousHeaderInputs };
    const nextFooterInputs = { ...previousFooterInputs };
    const seenHeaders = new Set();
    const seenFooters = new Set();

    summaries.forEach((summary) => {
      const key = resolveDrawerId(summary.id);
      nextDrawer[key] = Object.prototype.hasOwnProperty.call(previousDrawer, key) ? previousDrawer[key] : false;

      if (Object.prototype.hasOwnProperty.call(previousPositions, key)) {
        nextPositions[key] = previousPositions[key];
      } else if (Number.isFinite(summary.breakPos)) {
        nextPositions[key] = String(summary.breakPos);
      } else {
        nextPositions[key] = '';
      }

      if (Object.prototype.hasOwnProperty.call(previousSpacers, key)) {
        nextSpacers[key] = previousSpacers[key];
      } else if (Number.isFinite(summary.totalSpacing)) {
        nextSpacers[key] = String(summary.totalSpacing);
      } else {
        nextSpacers[key] = '';
      }

      if (summary.headerId) {
        seenHeaders.add(summary.headerId);
        if (!Object.prototype.hasOwnProperty.call(nextHeaderInputs, summary.headerId)) {
          nextHeaderInputs[summary.headerId] = Number.isFinite(summary.headerEffective)
            ? String(summary.headerEffective)
            : '';
        }
      }

      if (summary.footerId) {
        seenFooters.add(summary.footerId);
        if (!Object.prototype.hasOwnProperty.call(nextFooterInputs, summary.footerId)) {
          nextFooterInputs[summary.footerId] = Number.isFinite(summary.footerEffective)
            ? String(summary.footerEffective)
            : '';
        }
      }
    });

    Object.keys(nextHeaderInputs).forEach((headerId) => {
      if (!seenHeaders.has(headerId)) {
        delete nextHeaderInputs[headerId];
      }
    });
    Object.keys(nextFooterInputs).forEach((footerId) => {
      if (!seenFooters.has(footerId)) {
        delete nextFooterInputs[footerId];
      }
    });

    breakDrawerStates.value = nextDrawer;
    breakPositionInputs.value = nextPositions;
    spacerHeightInputs.value = nextSpacers;
    headerHeightInputs.value = nextHeaderInputs;
    footerHeightInputs.value = nextFooterInputs;
    scheduleMarkerUpdate();
  },
  { immediate: true },
);

// ============================================================================
// COMPONENT-SPECIFIC HELPERS
// ============================================================================

const normalizeManualLayout = (layout, counts = {}) => {
  if (!layout || !Array.isArray(layout.pages)) {
    return layout;
  }

  const safe = (value) => (Number.isFinite(value) ? value : 0);
  const totalPages = layout.pages.length;

  const ensureSectionReserved = (section, marginFallback) => {
    if (!section || typeof section !== 'object') {
      return 0;
    }
    const metrics = { ...(section.metrics ?? {}) };
    const effective = Math.max(
      safe(section.reservedHeightPx),
      safe(section.heightPx),
      safe(metrics.effectiveHeightPx),
      Math.max(safe(marginFallback), 0),
    );
    metrics.effectiveHeightPx = effective;
    metrics.offsetPx = Math.max(effective, safe(metrics.offsetPx));
    section.metrics = metrics;
    section.heightPx = effective;
    section.reservedHeightPx = effective;
    return effective;
  };

  let visualTopPx = 0;

  layout.pages.forEach((page, index) => {
    if (!page || typeof page !== 'object') {
      return;
    }
    if (!Number.isInteger(page.pageIndex)) {
      page.pageIndex = index;
    }

    if (!page.metrics || typeof page.metrics !== 'object') {
      page.metrics = {};
    }

    const metrics = page.metrics;
    const marginTop = Math.max(safe(metrics.marginTopPx), 0);
    const marginBottom = Math.max(safe(metrics.marginBottomPx), 0);
    const pageGap = Number.isFinite(page.pageGapPx)
      ? Math.max(page.pageGapPx, 0)
      : Number.isFinite(metrics.pageGapPx)
        ? Math.max(metrics.pageGapPx, 0)
        : 0;
    page.pageGapPx = pageGap;
    metrics.pageGapPx = pageGap;

    metrics.marginTopPx = marginTop;
    metrics.marginBottomPx = marginBottom;

    const pageHeight = Math.max(safe(metrics.pageHeightPx), marginTop + marginBottom);
    if (!Number.isFinite(metrics.pageHeightPx)) {
      metrics.pageHeightPx = pageHeight;
    }

    const startOffset = Number.isFinite(page?.break?.startOffsetPx) ? page.break.startOffsetPx : 0;
    const usableHeight = Math.max(pageHeight - marginTop - marginBottom, 0);
    const contentEnd = Number.isFinite(startOffset) ? startOffset + usableHeight : null;
    page.contentArea = {
      startPx: Number.isFinite(startOffset) ? startOffset : null,
      endPx: Number.isFinite(contentEnd) ? contentEnd : null,
      usableHeightPx: Number.isFinite(usableHeight) ? usableHeight : null,
    };

    if (page.headerFooterAreas && typeof page.headerFooterAreas !== 'object') {
      page.headerFooterAreas = {};
    }

    const headerArea = page.headerFooterAreas?.header ?? null;
    const headerReserved = ensureSectionReserved(headerArea, marginTop);
    if (headerArea) {
      if (!page.headerFooterAreas) page.headerFooterAreas = {};
      page.headerFooterAreas.header = headerArea;
      metrics.headerHeightPx = headerReserved;
      metrics.marginTopPx = Math.max(metrics.marginTopPx, headerReserved);
    }

    const footerArea = page.headerFooterAreas?.footer ?? null;
    const footerReserved = ensureSectionReserved(footerArea, marginBottom);
    if (footerArea) {
      if (!page.headerFooterAreas) page.headerFooterAreas = {};
      page.headerFooterAreas.footer = footerArea;
      metrics.footerHeightPx = footerReserved;
      metrics.marginBottomPx = Math.max(metrics.marginBottomPx, footerReserved);
    }

    const extraSpacing = Math.max(safe(page.pageBottomSpacingPx), 0);
    page.pageBottomSpacingPx = extraSpacing;

    const nextPage = index < totalPages - 1 ? layout.pages[index + 1] : null;
    const nextHeaderReserved = nextPage
      ? Math.max(
          safe(nextPage.metrics?.headerHeightPx),
          safe(nextPage.metrics?.marginTopPx),
          safe(nextPage.headerFooterAreas?.header?.reservedHeightPx),
        )
      : 0;

    page.spacingAfterPx = index === totalPages - 1 ? 0 : footerReserved + nextHeaderReserved + pageGap + extraSpacing;

    if (index === totalPages - 1) {
      page.spacingSegments = [];
    } else {
      const breakPos = Number.isFinite(page?.break?.pos) ? page.break.pos : null;
      const existingSegments = Array.isArray(page.spacingSegments)
        ? page.spacingSegments.filter((value) => Number.isFinite(value))
        : [];
      if (breakPos != null && !existingSegments.includes(breakPos)) {
        existingSegments.unshift(breakPos);
      }
      page.spacingSegments = existingSegments;
    }

    const pageHeightPx = Math.max(safe(page?.metrics?.pageHeightPx), 0);
    page.pageTopOffsetPx = visualTopPx;
    // Use spacingAfterPx instead of just pageGapPx to account for footer, header, and bottom spacing
    const spacingAfter = Number.isFinite(page.spacingAfterPx) ? page.spacingAfterPx : page.pageGapPx;
    visualTopPx += pageHeightPx + spacingAfter;
  });

  const manualCounts = {
    positions: Number.isInteger(counts.positions) ? counts.positions : 0,
    spacers: Number.isInteger(counts.spacers) ? counts.spacers : 0,
    headers: Number.isInteger(counts.headers) ? counts.headers : 0,
    footers: Number.isInteger(counts.footers) ? counts.footers : 0,
  };

  if (!layout.meta || typeof layout.meta !== 'object') {
    layout.meta = {};
  }

  layout.meta.manualOverrides = {
    source: 'measurement-test-harness',
    counts: manualCounts,
  };

  return layout;
};

// ============================================================================
// MANUAL ADJUSTMENTS HELPERS
// ============================================================================

/**
 * Computes and applies a position override for a page
 * @param {Object} page - The page object to process
 * @param {number} index - Page index in the array
 * @param {Object} inputPos - User input position values
 * @param {Object} measurementView - ProseMirror view instance
 * @param {DOMRect|null} surfaceRect - Bounding rect of measurement surface
 * @returns {{cloned: Object, override: Object|null, identifier: string}} Result with cloned page and override info
 */
const computePositionOverride = (page, index, inputPos, measurementView, surfaceRect) => {
  const cloned = cloneLayoutPage(page) ?? {};
  const identifier = resolveBreakIdentifier(cloned, index);
  const key = resolveDrawerId(identifier);
  const rawPos = inputPos[key];
  const overridePos = Number.parseInt(rawPos, 10);
  const originalPos = Number.isFinite(page?.break?.pos) ? page.break.pos : null;

  if (!Number.isFinite(overridePos)) {
    return { cloned, override: null };
  }

  const coords = getBreakCoords(measurementView, overridePos);
  if (!cloned.break) cloned.break = {};
  cloned.break.pos = overridePos;

  if (coords && surfaceRect) {
    const relativeTop = Number.isFinite(coords.top) ? coords.top - surfaceRect.top : null;
    const relativeBottom = Number.isFinite(coords.bottom) ? coords.bottom - surfaceRect.top : null;

    if (relativeTop !== null) {
      cloned.break.top = relativeTop;
      cloned.break.fittedTop = relativeTop;
    }
    if (relativeBottom !== null) {
      cloned.break.bottom = relativeBottom;
      cloned.break.fittedBottom = relativeBottom;
    }
  }

  const override =
    overridePos !== originalPos
      ? {
          pageIndex: Number.isInteger(cloned.pageIndex) ? cloned.pageIndex : index,
          pos: overridePos,
          originalPos,
        }
      : null;

  return { cloned, override, identifier };
};

/**
 * Computes and applies a spacer override for a page
 * @param {Object} page - Original page object
 * @param {Object} cloned - Cloned page object to modify
 * @param {number} index - Page index in the array
 * @param {Object} spacerInputs - User input spacer values
 * @param {Object} baseLayout - Base layout containing all pages
 * @param {Set} pendingEdits - Set of pending spacer edits
 * @returns {{cloned: Object, override: Object|null, identifier: string, updatedInputs: Object}} Result with modified clone and override info
 */
const computeSpacerOverride = (page, cloned, index, spacerInputs, baseLayout, pendingEdits) => {
  const identifier = resolveBreakIdentifier(cloned, index);
  const key = resolveDrawerId(identifier);
  const metricsClone = cloned.metrics ?? {};
  const footerHeight = Number.isFinite(metricsClone?.footerHeightPx) ? metricsClone.footerHeightPx : 0;
  const footerMargin = Number.isFinite(metricsClone?.marginBottomPx) ? metricsClone.marginBottomPx : footerHeight;
  const footerReserved = Math.max(footerHeight, footerMargin, 0);
  const pageGap = Number.isFinite(metricsClone?.pageGapPx) ? metricsClone.pageGapPx : 0;

  const nextSourcePage = baseLayout.pages[index + 1] ?? null;
  let nextHeaderReserved = 0;
  if (nextSourcePage) {
    const nextMetrics = nextSourcePage?.metrics ?? {};
    const nextHeaderId = nextSourcePage?.headerFooterAreas?.header?.id ?? null;
    let nextHeaderHeight = Number.isFinite(nextMetrics?.headerHeightPx) ? nextMetrics.headerHeightPx : 0;
    const overrideHeight = resolveHeaderHeight(nextHeaderId);
    if (Number.isFinite(overrideHeight)) {
      nextHeaderHeight = overrideHeight;
    }
    const nextHeaderMargin = Number.isFinite(nextMetrics?.marginTopPx) ? nextMetrics.marginTopPx : nextHeaderHeight;
    nextHeaderReserved = Math.max(nextHeaderHeight, nextHeaderMargin, 0);
  }

  const currentExtra = Number.isFinite(page?.pageBottomSpacingPx) ? page.pageBottomSpacingPx : 0;
  const rawSpacer = spacerInputs[key];
  const desiredTotal = Number.parseFloat(rawSpacer);
  let overrideSpacer = Number.isFinite(desiredTotal)
    ? Math.max(0, desiredTotal - (footerReserved + pageGap + nextHeaderReserved))
    : currentExtra;

  overrideSpacer = Math.max(0, overrideSpacer);
  cloned.pageBottomSpacingPx = overrideSpacer;
  const appliedTotal = footerReserved + pageGap + nextHeaderReserved + overrideSpacer;

  const updatedInputs = { ...spacerInputs };
  if (!pendingEdits.has(key)) {
    updatedInputs[key] = String(appliedTotal);
  }

  const override =
    !pendingEdits.has(key) && overrideSpacer !== currentExtra
      ? {
          pageIndex: Number.isInteger(cloned.pageIndex) ? cloned.pageIndex : index,
          extraHeightPx: overrideSpacer,
          originalExtraHeightPx: currentExtra,
          totalHeightPx: appliedTotal,
        }
      : null;

  return { cloned, override, identifier, updatedInputs };
};

/**
 * Applies header and footer height overrides to a cloned page
 * @param {Object} cloned - Cloned page object to modify
 * @param {Object} page - Original page object
 * @param {number} index - Page index in the array
 * @returns {{cloned: Object, headerOverride: Object, footerOverride: Object}} Result with modified clone and override info
 */
const applyHeaderFooterOverrides = (cloned, page, index) => {
  const headerArea = cloned.headerFooterAreas?.header ?? null;
  const headerId = headerArea?.id ?? null;
  const headerOverride = {};

  if (headerId) {
    const overrideHeight = resolveHeaderHeight(headerId);
    const originalEffective = Number.isFinite(headerArea?.metrics?.effectiveHeightPx)
      ? headerArea.metrics.effectiveHeightPx
      : null;

    if (overrideHeight != null) {
      if (!cloned.headerFooterAreas) cloned.headerFooterAreas = {};
      const headerClone = { ...(cloned.headerFooterAreas.header ?? {}) };
      headerClone.metrics = { ...(headerClone.metrics ?? {}) };
      headerClone.metrics.effectiveHeightPx = overrideHeight;
      headerClone.metrics.offsetPx = Math.max(
        Number.isFinite(headerClone.metrics.offsetPx) ? headerClone.metrics.offsetPx : overrideHeight,
        overrideHeight,
      );
      headerClone.heightPx = overrideHeight;
      headerClone.reservedHeightPx = overrideHeight;
      cloned.headerFooterAreas.header = headerClone;

      if (!cloned.metrics) cloned.metrics = {};
      cloned.metrics.headerHeightPx = overrideHeight;
      cloned.metrics.marginTopPx = Number.isFinite(cloned.metrics.marginTopPx)
        ? Math.max(cloned.metrics.marginTopPx, overrideHeight)
        : overrideHeight;

      if (overrideHeight !== originalEffective) {
        headerOverride[headerId] = {
          headerId,
          heightPx: overrideHeight,
          originalHeightPx: originalEffective,
        };
      }
    }
  }

  const footerArea = cloned.headerFooterAreas?.footer ?? null;
  const footerId = footerArea?.id ?? null;
  const footerOverride = {};

  if (footerId) {
    const overrideHeight = resolveFooterHeight(footerId);
    const originalEffective = Number.isFinite(footerArea?.metrics?.effectiveHeightPx)
      ? footerArea.metrics.effectiveHeightPx
      : null;

    if (overrideHeight != null) {
      if (!cloned.headerFooterAreas) cloned.headerFooterAreas = {};
      const footerClone = { ...(cloned.headerFooterAreas.footer ?? {}) };
      footerClone.metrics = { ...(footerClone.metrics ?? {}) };
      footerClone.metrics.effectiveHeightPx = overrideHeight;
      footerClone.metrics.offsetPx = Math.max(
        Number.isFinite(footerClone.metrics.offsetPx) ? footerClone.metrics.offsetPx : overrideHeight,
        overrideHeight,
      );
      footerClone.heightPx = overrideHeight;
      footerClone.reservedHeightPx = overrideHeight;
      cloned.headerFooterAreas.footer = footerClone;

      if (!cloned.metrics) cloned.metrics = {};
      cloned.metrics.footerHeightPx = overrideHeight;
      cloned.metrics.marginBottomPx = Number.isFinite(cloned.metrics.marginBottomPx)
        ? Math.max(cloned.metrics.marginBottomPx, overrideHeight)
        : overrideHeight;

      if (overrideHeight !== originalEffective) {
        footerOverride[footerId] = {
          footerId,
          heightPx: overrideHeight,
          originalHeightPx: originalEffective,
        };
      }
    }
  }

  if (!Number.isInteger(cloned.pageIndex)) {
    cloned.pageIndex = index;
  }

  return { cloned, headerOverride, footerOverride };
};

/**
 * Applies all manual layout adjustments from user inputs to create a modified layout package.
 * This function reads user inputs for positions, spacers, header heights, and footer heights,
 * then creates a new layout package with all overrides applied.
 * The resulting layout is sent to the pagination engine for rendering.
 */
const applyManualAdjustments = () => {
  debugLog('[harness] applyManualAdjustments called');
  const engineInstance = engine.value;

  // Use the baseline layout (original calculated values) not the current layoutPackage
  const baseLayout = engineInstance?.baselineLayoutPackage || engineInstance?.layoutPackage;
  if (!engineInstance || !baseLayout || !Array.isArray(baseLayout.pages)) {
    debugLog('[harness] early return - missing engine or layout', {
      engineInstance: !!engineInstance,
      hasBaseline: !!engineInstance?.baselineLayoutPackage,
      hasLayout: !!engineInstance?.layoutPackage,
      baseLayout,
    });
    return;
  }

  debugLog('[harness] using baseline layout, pages:', baseLayout.pages.length);
  const measurementView = engineInstance.measurementEditor?.view ?? null;
  const measurementSurface = measurementEditor.value ?? null;
  const surfaceRect = measurementSurface?.getBoundingClientRect?.() ?? null;

  const positionOverrides = {};
  const spacingOverrides = {};
  const rawSpacingInputs = { ...spacerHeightInputs.value };
  const headerOverrides = {};
  const footerOverrides = {};

  const manualPages = baseLayout.pages.map((page, index) => {
    // Apply position overrides
    const posResult = computePositionOverride(page, index, breakPositionInputs.value, measurementView, surfaceRect);
    let { cloned } = posResult;
    if (posResult.override && posResult.identifier) {
      positionOverrides[posResult.identifier] = posResult.override;
    }

    // Apply spacer overrides
    const spacerResult = computeSpacerOverride(
      page,
      cloned,
      index,
      spacerHeightInputs.value,
      baseLayout,
      pendingSpacerEdits,
    );
    cloned = spacerResult.cloned;
    Object.assign(rawSpacingInputs, spacerResult.updatedInputs);
    if (spacerResult.override && spacerResult.identifier) {
      spacingOverrides[spacerResult.identifier] = spacerResult.override;
    }

    // Apply header/footer overrides
    const hfResult = applyHeaderFooterOverrides(cloned, page, index);
    cloned = hfResult.cloned;
    Object.assign(headerOverrides, hfResult.headerOverride);
    Object.assign(footerOverrides, hfResult.footerOverride);

    return cloned;
  });

  const layoutClone = {
    ...baseLayout,
    pages: manualPages,
  };

  const overrideCounts = {
    positions: Object.keys(positionOverrides).length,
    spacers: Object.keys(spacingOverrides).length,
    headers: Object.keys(headerOverrides).length,
    footers: Object.keys(footerOverrides).length,
  };

  normalizeManualLayout(layoutClone, overrideCounts);

  manualLayoutPackage.value =
    typeof structuredClone === 'function' ? structuredClone(layoutClone) : JSON.parse(JSON.stringify(layoutClone));
  manualOverrideSnapshot.value = {
    positions: positionOverrides,
    spacers: spacingOverrides,
    headers: headerOverrides,
    footers: footerOverrides,
  };

  const commandOptions = {
    source: 'measurement-test-harness',
    overrides: manualOverrideSnapshot.value,
  };

  debugLog('[harness] normalized layout pages:', layoutClone.pages.length);
  debugLog('[harness] override counts:', overrideCounts);
  debugLog('[harness] sample page spacingAfterPx:', layoutClone.pages[0]?.spacingAfterPx);
  debugLog('[harness] sample page spacingSegments:', layoutClone.pages[0]?.spacingSegments);

  if (engineInstance?.applyLayoutOverride) {
    debugLog('[harness] calling engineInstance.applyLayoutOverride');
    engineInstance.applyLayoutOverride(layoutClone, commandOptions);
  } else if (editor.value?.commands?.applyManualPaginationLayout) {
    debugLog('[harness] calling applyManualPaginationLayout command');
    editor.value.commands.applyManualPaginationLayout(layoutClone, commandOptions);
  } else if (editor.value?.commands?.updatePagination) {
    debugLog('[harness] calling updatePagination command');
    editor.value.commands.updatePagination(layoutClone);
  } else {
    console.warn('[harness] no command available to apply layout!');
  }

  currentLayoutPages.value = manualPages.map((page, index) => createPageSnapshot(page, index)).filter(Boolean);
  lastPageBreaks.value = manualPages.map((page, index) => cloneLayoutEntry(page, index)).filter(Boolean);
  spacerHeightInputs.value = rawSpacingInputs;
  pendingSpacerEdits.clear();
  scheduleMarkerUpdate();
};

// ============================================================================
// COMPONENT-SPECIFIC SANITIZATION
// ============================================================================

const sanitizeFieldSegments = (segments) => {
  if (!Array.isArray(segments) || !segments.length) return null;
  const normalized = segments
    .map((segment) => {
      const entry = {};
      const pos = coerceFinite(segment?.pos);
      if (pos !== null) entry.pos = pos;
      if (segment?.attrs?.fieldId) entry.fieldId = segment.attrs.fieldId;
      if (segment?.attrs?.type) entry.type = segment.attrs.type;
      if (segment?.rect) {
        const rect = {};
        const leftPx = coerceFinite(segment.rect.leftPx);
        const topPx = coerceFinite(segment.rect.topPx);
        const widthPx = coerceFinite(segment.rect.widthPx);
        const heightPx = coerceFinite(segment.rect.heightPx);
        if (leftPx !== null) rect.leftPx = leftPx;
        if (topPx !== null) rect.topPx = topPx;
        if (widthPx !== null) rect.widthPx = widthPx;
        if (heightPx !== null) rect.heightPx = heightPx;
        if (Object.keys(rect).length) {
          entry.rect = rect;
        }
      }
      if (Array.isArray(segment?.segments) && segment.segments.length) {
        const pieces = segment.segments
          .map((piece) => {
            const payload = {};
            const pageIndex = coerceFinite(piece?.pageIndex);
            const absoluteTopPx = coerceFinite(piece?.absoluteTopPx);
            const absoluteBottomPx = coerceFinite(piece?.absoluteBottomPx);
            const topPx = coerceFinite(piece?.topPx);
            const heightPx = coerceFinite(piece?.heightPx);
            const offsetWithinFieldPx = coerceFinite(piece?.offsetWithinFieldPx);
            if (pageIndex !== null) payload.pageIndex = pageIndex;
            if (absoluteTopPx !== null) payload.absoluteTopPx = absoluteTopPx;
            if (absoluteBottomPx !== null) payload.absoluteBottomPx = absoluteBottomPx;
            if (topPx !== null) payload.topPx = topPx;
            if (heightPx !== null) payload.heightPx = heightPx;
            if (offsetWithinFieldPx !== null) payload.offsetWithinFieldPx = offsetWithinFieldPx;
            return Object.keys(payload).length ? payload : null;
          })
          .filter(Boolean);
        if (pieces.length) {
          entry.segments = pieces;
        }
      }
      return Object.keys(entry).length ? entry : null;
    })
    .filter(Boolean);
  return normalized.length ? normalized : null;
};

// ============================================================================
// LAYOUT SNAPSHOT HELPERS
// ============================================================================

const EPSILON = 0.0001;

/**
 * Extracts baseline spacing metrics from a page summary.
 * These metrics represent the original calculated spacing values before any user overrides.
 * @param {Object} summary - Page summary object containing spacing information
 * @returns {{footerReserved: number, pageGap: number, nextHeaderReserved: number, totalSpacing: number, headerEffective: number|null, footerEffective: number|null}}
 */
const extractBaselineSpacingMetrics = (summary) => {
  const footerReserved = Number.isFinite(summary?.footerReserved) ? summary.footerReserved : 0;
  const pageGap = Number.isFinite(summary?.pageGap) ? summary.pageGap : 0;
  const nextHeaderReserved = Number.isFinite(summary?.nextHeaderReserved) ? summary.nextHeaderReserved : 0;
  const totalSpacing = footerReserved + pageGap + nextHeaderReserved;

  return {
    footerReserved,
    pageGap,
    nextHeaderReserved,
    totalSpacing,
    headerEffective: Number.isFinite(summary?.headerEffective) ? summary.headerEffective : null,
    footerEffective: Number.isFinite(summary?.footerEffective) ? summary.footerEffective : null,
  };
};

/**
 * Applies position override to a page clone
 */
const applyPositionOverrideForSnapshot = (clone, identifier, pageIndex, inputs, existingOverrides, summary) => {
  const key = resolveDrawerId(identifier);
  const inputPosition = Number.parseInt(inputs[key], 10);
  const summaryBreakPos = Number.isFinite(summary?.breakPos)
    ? summary.breakPos
    : Number.isFinite(clone?.break?.pos)
      ? clone.break.pos
      : null;

  const existingOverride = existingOverrides[identifier];
  const appliedBreakPos = Number.isFinite(existingOverride?.pos)
    ? existingOverride.pos
    : Number.isFinite(inputPosition)
      ? inputPosition
      : summaryBreakPos;

  if (!Number.isFinite(appliedBreakPos)) {
    return { clone, override: null, appliedBreakPos };
  }

  // Update position override if needed
  if (
    (!existingOverride || !Number.isFinite(existingOverride.pos)) &&
    Number.isFinite(inputPosition) &&
    inputPosition !== summaryBreakPos
  ) {
    existingOverrides[identifier] = {
      pageIndex,
      pos: appliedBreakPos,
      originalPos: summaryBreakPos,
    };
  }

  clone.break = { ...(clone.break ?? {}), pos: appliedBreakPos };
  return { clone, override: existingOverrides[identifier], appliedBreakPos };
};

/**
 * Applies spacing override to a page clone
 */
const applySpacingOverrideForSnapshot = (
  clone,
  identifier,
  pageIndex,
  inputs,
  existingOverrides,
  baselineMetrics,
  summary,
) => {
  const key = resolveDrawerId(identifier);
  const inputSpacing = Number.parseFloat(inputs[key]);
  const summaryTotalSpacing = Number.isFinite(summary?.totalSpacing) ? summary.totalSpacing : null;
  const summaryExtraSpacing = Number.isFinite(summary?.extraSpacing)
    ? summary.extraSpacing
    : summaryTotalSpacing != null
      ? Math.max(0, summaryTotalSpacing - baselineMetrics.totalSpacing)
      : Number.isFinite(clone?.pageBottomSpacingPx)
        ? clone.pageBottomSpacingPx
        : 0;

  const existingOverride = existingOverrides[identifier];
  let targetTotalSpacing = Number.isFinite(existingOverride?.totalHeightPx)
    ? existingOverride.totalHeightPx
    : Number.isFinite(inputSpacing)
      ? inputSpacing
      : summaryTotalSpacing;

  if (!Number.isFinite(targetTotalSpacing) && Number.isFinite(clone?.pageBottomSpacingPx)) {
    targetTotalSpacing = clone.pageBottomSpacingPx + baselineMetrics.totalSpacing;
  }

  if (!Number.isFinite(targetTotalSpacing)) {
    return { clone, override: null };
  }

  const extraHeight = Math.max(0, targetTotalSpacing - baselineMetrics.totalSpacing);
  const originalExtra = Number.isFinite(existingOverride?.originalExtraHeightPx)
    ? existingOverride.originalExtraHeightPx
    : summaryExtraSpacing;

  if (
    !existingOverride ||
    Math.abs(extraHeight - existingOverride.extraHeightPx) > EPSILON ||
    Math.abs(targetTotalSpacing - (existingOverride.totalHeightPx ?? targetTotalSpacing)) > EPSILON
  ) {
    existingOverrides[identifier] = {
      pageIndex,
      extraHeightPx: extraHeight,
      originalExtraHeightPx: originalExtra,
      totalHeightPx: targetTotalSpacing,
    };
  }

  clone.pageBottomSpacingPx = extraHeight;
  return { clone, override: existingOverrides[identifier] };
};

/**
 * Applies header or footer height override to a page clone
 */
const applyHeaderFooterHeightForSnapshot = (
  clone,
  sectionId,
  sectionType,
  inputs,
  existingOverrides,
  summaryHeight,
) => {
  if (!sectionId) return { clone, override: null };

  const inputHeight = Number.parseFloat(inputs[sectionId]);
  const existingOverride = existingOverrides[sectionId];
  const areaPath = sectionType === 'header' ? 'headerFooterAreas.header' : 'headerFooterAreas.footer';
  const metricsKey = sectionType === 'header' ? 'headerHeightPx' : 'footerHeightPx';
  const marginKey = sectionType === 'header' ? 'marginTopPx' : 'marginBottomPx';

  const targetHeight = Number.isFinite(existingOverride?.heightPx)
    ? existingOverride.heightPx
    : Number.isFinite(inputHeight)
      ? inputHeight
      : Number.isFinite(clone?.metrics?.[metricsKey])
        ? clone.metrics[metricsKey]
        : summaryHeight;

  if (!Number.isFinite(targetHeight)) {
    return { clone, override: null };
  }

  const originalHeight = Number.isFinite(existingOverride?.originalHeightPx)
    ? existingOverride.originalHeightPx
    : summaryHeight;

  if (!existingOverride || Math.abs(targetHeight - existingOverride.heightPx) > EPSILON) {
    existingOverrides[sectionId] = {
      [sectionType === 'header' ? 'headerId' : 'footerId']: sectionId,
      heightPx: targetHeight,
      originalHeightPx: originalHeight,
    };
  }

  // Update clone with new height
  clone.headerFooterAreas = clone.headerFooterAreas ?? {};
  const section = clone.headerFooterAreas[sectionType] ?? {};
  clone.headerFooterAreas[sectionType] = {
    ...section,
    heightPx: targetHeight,
    metrics: {
      ...(section.metrics ?? {}),
      effectiveHeightPx: targetHeight,
      offsetPx: Math.max(
        Number.isFinite(section.metrics?.offsetPx) ? section.metrics.offsetPx : targetHeight,
        targetHeight,
      ),
    },
  };

  clone.metrics = { ...(clone.metrics ?? {}) };
  clone.metrics[metricsKey] = targetHeight;
  clone.metrics[marginKey] = Number.isFinite(clone.metrics[marginKey])
    ? Math.max(clone.metrics[marginKey], targetHeight)
    : targetHeight;

  return { clone, override: existingOverrides[sectionId] };
};

/**
 * Builds a sanitized page object with all overrides applied
 */
const buildSanitizedPage = (clone, pageIndex, breakInfo) => {
  const sanitizedPage = { pageIndex };

  // Add optional properties if they exist
  const optionalProps = {
    pageTopOffsetPx: coerceFinite(clone?.pageTopOffsetPx),
    pageGapPx: coerceFinite(clone?.pageGapPx),
    pageBottomSpacingPx: coerceFinite(clone?.pageBottomSpacingPx),
  };

  Object.entries(optionalProps).forEach(([key, value]) => {
    if (value !== null) sanitizedPage[key] = value;
  });

  if (breakInfo && Object.keys(breakInfo).length) {
    sanitizedPage.break = breakInfo;
  }

  // Add sanitized complex objects
  const sanitizedObjects = {
    metrics: sanitizeMetrics(clone?.metrics ?? {}),
    boundary: sanitizeBoundary(clone?.boundary),
    headerFooterAreas: sanitizeHeaderFooterAreas(clone?.headerFooterAreas),
    rowBreaks: sanitizeRowBreaks(clone?.rowBreaks),
    overflow: sanitizeOverflow(clone?.overflow),
  };

  Object.entries(sanitizedObjects).forEach(([key, value]) => {
    if (value) sanitizedPage[key] = value;
  });

  return sanitizedPage;
};

/**
 * Builds the configuration object for the layout snapshot
 */
const buildSnapshotConfig = (layoutPackage) => {
  const config = {};

  // Add units if present
  if (layoutPackage?.units) {
    const unit = layoutPackage.units?.unit;
    const dpi = coerceFinite(layoutPackage.units?.dpi);
    const units = {};

    if (typeof unit === 'string' && unit) units.unit = unit;
    if (dpi !== null) units.dpi = dpi;
    if (Object.keys(units).length) config.units = units;
  }

  // Add page size
  const pageSize = engine.value?.pageSize ?? editor.value?.converter?.pageStyles?.pageSize ?? null;
  const sizeSnapshot = {};
  const pageHeight = coerceFinite(pageSize?.height);
  const pageWidth = coerceFinite(pageSize?.width);

  if (pageHeight !== null) sizeSnapshot.heightPx = pageHeight;
  if (pageWidth !== null) sizeSnapshot.widthPx = pageWidth;
  if (Object.keys(sizeSnapshot).length) config.pageSizePx = sizeSnapshot;

  // Add margins
  const marginsSnapshot = sanitizeMargins(engine.value?.pageMargins);
  if (marginsSnapshot) config.pageMarginsPx = marginsSnapshot;

  // Add document size
  const docSize = coerceFinite(editor.value?.state?.doc?.content?.size);
  if (docSize !== null) config.docContentSize = docSize;

  return config;
};

/**
 * Builds a complete layout snapshot for export/clipboard copy.
 * This snapshot includes all pages with their overrides, configuration, field segments,
 * and override metadata. It's used for exporting layouts and sharing between documents.
 * @returns {Object} Complete layout snapshot with pages, config, and override information
 */
const buildLayoutSnapshotForCopy = () => {
  const baseLayout = manualLayoutPackage.value ?? engine.value?.layoutPackage ?? null;
  const overrideMeta = manualOverrideSnapshot.value ?? { positions: {}, spacers: {}, headers: {}, footers: {} };
  const cloneOverrideMap = (source = {}) =>
    Object.fromEntries(Object.entries(source).map(([key, meta]) => [key, meta ? { ...meta } : meta]));

  const positionOverrides = cloneOverrideMap(overrideMeta.positions ?? {});
  const spacingOverrides = cloneOverrideMap(overrideMeta.spacers ?? {});
  const headerHeightOverrides = cloneOverrideMap(overrideMeta.headers ?? {});
  const footerHeightOverrides = cloneOverrideMap(overrideMeta.footers ?? {});

  const positionInputSnapshot = { ...breakPositionInputs.value };
  const spacerInputSnapshot = { ...spacerHeightInputs.value };
  const headerInputSnapshot = { ...headerHeightInputs.value };
  const footerInputSnapshot = { ...footerHeightInputs.value };

  const breakSummaries = Array.isArray(currentBreakSummaries.value) ? currentBreakSummaries.value : [];
  const summaryLookup = new Map(breakSummaries.map((summary) => [summary.id, summary]));

  const pages = (currentLayoutPages.value ?? []).map((page, index) => {
    let clone = cloneLayoutPage(page);
    const pageIndex = Number.isInteger(clone?.pageIndex) ? clone.pageIndex : index;
    const identifier = page?.id ?? resolveBreakIdentifier(page, index);
    const summary = summaryLookup.get(identifier) ?? null;
    const baselineMetrics = extractBaselineSpacingMetrics(summary);

    // Apply position override
    const posResult = applyPositionOverrideForSnapshot(
      clone,
      identifier,
      pageIndex,
      positionInputSnapshot,
      positionOverrides,
      summary,
    );
    clone = posResult.clone;
    const { appliedBreakPos } = posResult;

    // Apply spacing override
    const spacingResult = applySpacingOverrideForSnapshot(
      clone,
      identifier,
      pageIndex,
      spacerInputSnapshot,
      spacingOverrides,
      baselineMetrics,
      summary,
    );
    clone = spacingResult.clone;

    // Apply header height override
    const headerId = clone?.headerFooterAreas?.header?.id ?? summary?.headerId ?? null;
    const headerResult = applyHeaderFooterHeightForSnapshot(
      clone,
      headerId,
      'header',
      headerInputSnapshot,
      headerHeightOverrides,
      baselineMetrics.headerEffective,
    );
    clone = headerResult.clone;

    // Apply footer height override
    const footerId = clone?.headerFooterAreas?.footer?.id ?? summary?.footerId ?? null;
    const footerResult = applyHeaderFooterHeightForSnapshot(
      clone,
      footerId,
      'footer',
      footerInputSnapshot,
      footerHeightOverrides,
      baselineMetrics.footerEffective,
    );
    clone = footerResult.clone;

    // Build break info with override source
    let breakInfo = sanitizeBreak(clone.break);
    const summaryBreakPos = Number.isFinite(summary?.breakPos)
      ? summary.breakPos
      : Number.isFinite(page?.break?.pos)
        ? page.break.pos
        : null;

    if (positionOverrides[identifier]) {
      breakInfo = {
        ...(breakInfo ?? {}),
        originalPos: positionOverrides[identifier].originalPos ?? null,
        pos: positionOverrides[identifier].pos,
        posOverrideSource: 'measurement-test-harness',
      };
    } else if (Number.isFinite(appliedBreakPos) && appliedBreakPos !== summaryBreakPos) {
      breakInfo = {
        ...(breakInfo ?? {}),
        originalPos: summaryBreakPos ?? null,
        pos: appliedBreakPos,
        posOverrideSource: 'measurement-test-harness',
      };
      positionOverrides[identifier] = {
        pageIndex,
        pos: appliedBreakPos,
        originalPos: summaryBreakPos ?? null,
      };
    }

    return buildSanitizedPage(clone, pageIndex, breakInfo);
  });

  const layoutPackage = baseLayout ?? null;
  const config = buildSnapshotConfig(layoutPackage);
  const fieldSegments = sanitizeFieldSegments(layoutPackage?.fieldSegments);

  const snapshot = {
    pages,
  };

  if (Object.keys(config).length) {
    snapshot.config = config;
  }

  if (fieldSegments) {
    snapshot.fieldSegments = fieldSegments;
  }

  if (Object.keys(positionOverrides).length) {
    snapshot.docPositionOverrides = positionOverrides;
  }
  if (Object.keys(spacingOverrides).length) {
    snapshot.pageSpacingOverrides = spacingOverrides;
  }
  if (Object.keys(headerHeightOverrides).length) {
    snapshot.headerHeightOverrides = headerHeightOverrides;
  }
  if (Object.keys(footerHeightOverrides).length) {
    snapshot.footerHeightOverrides = footerHeightOverrides;
  }

  return snapshot;
};

const resolveExportFileName = () => {
  const base = sanitizeExportBase(exportBaseName.value);
  return `${base}.txt`;
};

const applyImportedLayoutSnapshot = (payload = {}) => {
  const engineInstance = engine.value;
  if (!engineInstance?.layoutPackage) {
    throw new Error('Measurement engine is not ready to accept layout overrides.');
  }

  const pages = Array.isArray(payload.pages) ? payload.pages : [];
  if (!pages.length) {
    throw new Error('Layout snapshot missing pages array.');
  }

  const importedPositions = cloneDeep(payload.docPositionOverrides, {});
  const importedSpacing = cloneDeep(payload.pageSpacingOverrides, {});
  const importedHeader = cloneDeep(payload.headerHeightOverrides, {});
  const importedFooter = cloneDeep(payload.footerHeightOverrides, {});

  resetManualOverrides();

  try {
    if (typeof engineInstance.calculatePageBreaks === 'function') {
      engineInstance.calculatePageBreaks();
    }
  } catch (error) {
    console.warn('Failed to recalculate pagination before applying imported layout', error);
  }

  const nextPositions = {};
  Object.entries(importedPositions).forEach(([pageId, meta]) => {
    if (!pageId) return;
    const key = resolveDrawerId(pageId);
    const targetPos =
      meta && typeof meta === 'object'
        ? Number.isFinite(meta.pos)
          ? meta.pos
          : null
        : Number.isFinite(meta)
          ? meta
          : null;
    if (targetPos != null) {
      nextPositions[key] = String(targetPos);
    }
  });

  if (!Object.keys(nextPositions).length) {
    pages.forEach((page, index) => {
      const pageIndex = Number.isInteger(page?.pageIndex) ? page.pageIndex : index;
      const pos = Number.isFinite(page?.break?.pos) ? page.break.pos : null;
      if (pos == null) return;
      const identifier = `${pageIndex}-${pos ?? index}`;
      const key = resolveDrawerId(identifier);
      nextPositions[key] = String(pos);
    });
  }

  const nextSpacers = {};
  Object.entries(importedSpacing).forEach(([pageId, meta]) => {
    if (!pageId) return;
    const key = resolveDrawerId(pageId);
    const total =
      meta && typeof meta === 'object'
        ? Number.isFinite(meta.totalHeightPx)
          ? meta.totalHeightPx
          : Number.isFinite(meta.extraHeightPx)
            ? meta.extraHeightPx
            : null
        : Number.isFinite(meta)
          ? meta
          : null;
    if (total != null) {
      nextSpacers[key] = String(total);
    }
  });

  const nextHeaderInputs = {};
  Object.entries(importedHeader).forEach(([headerId, meta]) => {
    if (!headerId) return;
    const height =
      meta && typeof meta === 'object'
        ? Number.isFinite(meta.heightPx)
          ? meta.heightPx
          : null
        : Number.isFinite(meta)
          ? meta
          : null;
    if (height != null) {
      nextHeaderInputs[headerId] = String(height);
    }
  });

  const nextFooterInputs = {};
  Object.entries(importedFooter).forEach(([footerId, meta]) => {
    if (!footerId) return;
    const height =
      meta && typeof meta === 'object'
        ? Number.isFinite(meta.heightPx)
          ? meta.heightPx
          : null
        : Number.isFinite(meta)
          ? meta
          : null;
    if (height != null) {
      nextFooterInputs[footerId] = String(height);
    }
  });

  breakPositionInputs.value = nextPositions;
  spacerHeightInputs.value = nextSpacers;
  headerHeightInputs.value = nextHeaderInputs;
  footerHeightInputs.value = nextFooterInputs;

  manualOverrideSnapshot.value = {
    positions: importedPositions,
    spacers: importedSpacing,
    headers: importedHeader,
    footers: importedFooter,
  };

  pendingSpacerEdits.clear();
  pendingPositionEdits.clear();
  scheduleMarkerUpdate();
  scheduleManualUpdate();
};

const triggerLayoutImport = () => {
  const input = layoutImportInput.value;
  if (input && typeof input.click === 'function') {
    input.click();
  }
};

const handleLayoutImport = async (event) => {
  const input = event?.target ?? layoutImportInput.value;
  const file = input?.files?.[0];
  if (!file) return;

  isImportingLayout.value = true;

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    applyImportedLayoutSnapshot(payload);
    showLayoutCopyFeedback(`Imported layout overrides (${file.name}).`);
  } catch (error) {
    console.error('Failed to import layout', error);
    showLayoutCopyFeedback('Unable to import layout. See console for details.', true);
  } finally {
    isImportingLayout.value = false;
    if (input) {
      input.value = '';
    }
  }
};

const exportLayout = async () => {
  if (isCopyingLayout.value) return;

  if (!canCopyLayout.value) {
    showLayoutCopyFeedback('Layout not ready to export yet.', true);
    return;
  }

  isCopyingLayout.value = true;

  try {
    applyManualAdjustments();
    const snapshot = buildLayoutSnapshotForCopy();
    const payload = {
      generatedAt: new Date().toISOString(),
      pages: snapshot.pages,
    };
    const summary = {
      pageCount: snapshot.pages.length,
    };
    if (snapshot.config) {
      payload.config = snapshot.config;
    }
    if (snapshot.fieldSegments) {
      payload.fieldSegments = snapshot.fieldSegments;
      const fieldSegmentCount = Array.isArray(snapshot.fieldSegments) ? snapshot.fieldSegments.length : 0;
      if (fieldSegmentCount) {
        summary.fieldSegmentCount = fieldSegmentCount;
      }
    }
    if (snapshot.docPositionOverrides) {
      payload.docPositionOverrides = snapshot.docPositionOverrides;
      const overrideCount = Object.keys(snapshot.docPositionOverrides).length;
      if (overrideCount) {
        summary.docPositionOverrides = overrideCount;
      }
    }
    if (snapshot.pageSpacingOverrides) {
      payload.pageSpacingOverrides = snapshot.pageSpacingOverrides;
      const spacingOverrideCount = Object.keys(snapshot.pageSpacingOverrides).length;
      if (spacingOverrideCount) {
        summary.pageSpacingOverrides = spacingOverrideCount;
      }
    }
    if (snapshot.headerHeightOverrides) {
      payload.headerHeightOverrides = snapshot.headerHeightOverrides;
      const headerOverrideCount = Object.keys(snapshot.headerHeightOverrides).length;
      if (headerOverrideCount) {
        summary.headerHeightOverrides = headerOverrideCount;
      }
    }
    if (snapshot.footerHeightOverrides) {
      payload.footerHeightOverrides = snapshot.footerHeightOverrides;
      const footerOverrideCount = Object.keys(snapshot.footerHeightOverrides).length;
      if (footerOverrideCount) {
        summary.footerHeightOverrides = footerOverrideCount;
      }
    }
    if (Object.keys(summary).length) {
      payload.summary = summary;
    }
    const serialized = JSON.stringify(payload, null, 2);
    const copied = await copyTextToClipboard(serialized);
    if (!copied) {
      throw new Error('Clipboard copy not supported');
    }
    const exportName = resolveExportFileName();
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = exportName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
    showLayoutCopyFeedback(`Exported layout (${exportName}) to clipboard and download.`);
  } catch (error) {
    console.error('Failed to export layout', error);
    showLayoutCopyFeedback('Unable to export layout. See console for details.', true);
  } finally {
    isCopyingLayout.value = false;
  }
};

const updateHeaderFooterSummary = () => {
  const repo = editor.value?.storage?.pagination?.repository;
  const summary = engine.value?.getHeaderFooterSummary?.();

  if (!repo || !summary) {
    headerFooterState.value = createHeaderFooterState();
    return;
  }

  const metricsById = summary.sectionMetricsById ?? new Map();
  const toDisplay = (type) =>
    (repo.list?.(type) ?? []).map((record) => ({
      id: record.id,
      type,
      metrics: metricsById.get(record.id) ?? null,
      variants: Array.isArray(record.meta?.variants) ? record.meta.variants : [],
      contentJson: record.contentJson,
      raw: record,
    }));

  headerFooterState.value = {
    headers: toDisplay('header'),
    footers: toDisplay('footer'),
    variants: {
      header: Array.from(summary.variantLookup?.header ?? []),
      footer: Array.from(summary.variantLookup?.footer ?? []),
    },
    contentWidthPx: Number.isFinite(summary.contentWidthPx) ? summary.contentWidthPx : 816,
    distancesPx: summary.distancesPx ?? { header: 0, footer: 0 },
  };

  nextTick(() => {
    syncLayoutPages();
  });
};

const hasHeaderFooterContent = computed(
  () => headerFooterState.value.headers.length > 0 || headerFooterState.value.footers.length > 0,
);

const toFileObject = async (source) => {
  if (typeof File !== 'undefined' && source instanceof File) {
    if (currentObjectUrl.value) {
      URL.revokeObjectURL(currentObjectUrl.value);
      currentObjectUrl.value = null;
    }

    const objectUrl = URL.createObjectURL(source);
    currentObjectUrl.value = objectUrl;

    return getFileObject(
      objectUrl,
      source.name,
      source.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  }

  return getFileObject(source);
};

const loadEditorData = async (source) => {
  fileSource.value = await toFileObject(source);
  const candidateName = typeof source === 'string' ? source : fileSource.value?.name;
  updateExportBaseName(candidateName || fileSource.value?.name);
  const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(fileSource.value);
  return { content: docx, media, mediaFiles, fonts };
};

const teardownHarness = () => {
  removePaginationListeners();
  editor.value?.destroy?.();
  editor.value = null;
  engine.value = null;

  if (editorElement.value) {
    editorElement.value.innerHTML = '';
  }

  // Note: Do NOT clear measurementEditor.innerHTML here
  // The Editor/pagination system manages this element internally,
  // and clearing it manually breaks the ProseMirror view structure

  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value);
    currentObjectUrl.value = null;
  }

  clearMarkerAnimation();
  lastPageBreaks.value = [];
  pageBreakMarkers.value = [];
  positionHighlightRects.value = [];
  currentLayoutPages.value = [];
  breakDrawerStates.value = {};
  breakPositionInputs.value = {};
  spacerHeightInputs.value = {};
  headerHeightInputs.value = {};
  footerHeightInputs.value = {};
  resetManualOverrides();
  exportBaseName.value = 'layout-export';
  headerFooterState.value = createHeaderFooterState();
  activeTab.value = 'editor';
  isToolsDrawerOpen.value = true;
};

const initMeasurementHarness = async (source = defaultFile) => {
  if (isLoadingDocument.value) return;

  isLoadingDocument.value = true;
  try {
    teardownHarness();

    const { content, media, mediaFiles, fonts } = await loadEditorData(source);

    editor.value = new Editor({
      element: editorElement.value,
      fileSource: fileSource.value,
      extensions: getStarterExtensions(),
      content,
      media,
      mediaFiles,
      fonts,
      pagination: true,
      paginationMeasurementElement: measurementEditor.value,
      annotations: true,
    });

    attachPaginationListeners(editor.value);
    scheduleMarkerUpdate();
    // Note: Don't call syncLayoutPages() here - it's premature
    // The pagination:update event will trigger it after calculation is complete
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize measurement harness', error);
  } finally {
    isLoadingDocument.value = false;
  }
};

const hasHeaderFooterVariants = computed(
  () => headerFooterState.value.variants.header.length > 0 || headerFooterState.value.variants.footer.length > 0,
);

const onWindowResize = () => {
  scheduleMarkerUpdate();
};

watch(
  lastPageBreaks,
  () => {
    syncLayoutPages();
    scheduleMarkerUpdate();
  },
  { deep: true },
);

watch(
  () => measurementEditor.value,
  (element, _, onCleanup) => {
    if (element) {
      const handleScroll = () => {
        scheduleMarkerUpdate();
      };
      element.addEventListener('scroll', handleScroll, { passive: true });
      onCleanup(() => {
        element.removeEventListener('scroll', handleScroll);
      });
    }
    scheduleMarkerUpdate();
  },
);

const HeaderFooterPreview = defineComponent({
  name: 'HeaderFooterPreview',
  props: {
    record: { type: Object, required: true },
    parentEditor: { type: Object, required: true },
    pageWidthPx: { type: Number, default: 816 },
  },
  setup(props) {
    const containerRef = ref(null);
    let previewEditor = null;

    const metrics = () => props.record.metrics ?? {};
    const scheduleFrame = (cb) => {
      const container = containerRef.value;
      if (!container || typeof cb !== 'function') return;
      const win = container.ownerDocument?.defaultView ?? null;
      const requestFrame = win?.requestAnimationFrame?.bind(win) ?? ((fn) => setTimeout(fn, 16));
      requestFrame(cb);
    };

    const applyMetricsToContainer = () => {
      const container = containerRef.value;
      if (!container) return;

      const { distancePx = 0, effectiveHeightPx = 0 } = metrics();
      // Mirror Word: header content starts headerDistance below page top, footer content sits
      // footerDistance above the bottom edge. We visualize that spacing by applying padding
      // around the preview editor so developers can see how much vertical budget the header
      // or footer consumes on the page.
      container.style.minHeight = `${Math.max(effectiveHeightPx, 200)}px`;
      container.style.paddingTop = props.record.type === 'header' ? `${distancePx}px` : '0px';
      container.style.paddingBottom = props.record.type === 'footer' ? `${distancePx}px` : '0px';

      if (props.record.type === 'footer') {
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'flex-end';
      } else {
        container.style.display = 'block';
      }
    };

    const applyMetricsToEditor = () => {
      if (!previewEditor?.view?.dom) return;
      const { contentHeightPx = 0 } = metrics();
      previewEditor.view.dom.classList.add('hf-preview-editor');
      previewEditor.view.dom.style.setProperty('padding', '18px');
      previewEditor.view.dom.style.setProperty('min-height', `${Math.max(contentHeightPx, 120)}px`);
      previewEditor.view.dom.style.setProperty('overflow', 'visible');
    };

    const relaxOverflowConstraints = () => {
      if (!previewEditor?.view?.dom) return;
      const root = previewEditor.view.dom;
      root.style.removeProperty('height');
      root.style.removeProperty('max-height');
      root.style.setProperty('overflow', 'visible');
      const selectors = [
        '[data-pagination-section-role="overlay-slot"]',
        '.super-editor-page-section-slot',
        '[data-pagination-section-role="overlay-content"]',
        '.super-editor-page-section-editor',
        '.super-editor-mount',
      ];
      selectors.forEach((selector) => {
        const nodes = Array.from(root.querySelectorAll(selector));
        nodes.forEach((node) => {
          node.style.removeProperty('height');
          node.style.removeProperty('max-height');
          node.style.setProperty('overflow', 'visible');
        });
      });
    };

    const scheduleOverflowRelaxation = () => {
      relaxOverflowConstraints();
      const monitorMedia = () => {
        if (!previewEditor?.view?.dom) return;
        const mediaNodes = Array.from(previewEditor.view.dom.querySelectorAll('img, video'));
        mediaNodes.forEach((node) => {
          const tagName = node.tagName?.toLowerCase() ?? '';
          const eventType = tagName === 'video' ? 'loadeddata' : 'load';
          if (eventType === 'load' && node.complete) {
            return;
          }
          if (eventType === 'loadeddata' && node.readyState >= 2) {
            return;
          }
          const handler = () => {
            node.removeEventListener(eventType, handler);
            scheduleOverflowRelaxation();
          };
          node.addEventListener(eventType, handler, { once: true });
        });
      };

      monitorMedia();
      scheduleFrame(() => {
        relaxOverflowConstraints();
      });
    };

    const instantiate = () => {
      if (!containerRef.value || !props.parentEditor) return;

      if (previewEditor) {
        previewEditor.destroy?.();
        previewEditor = null;
      }

      try {
        if (Number.isFinite(props.pageWidthPx)) {
          containerRef.value.style.width = `${props.pageWidthPx}px`;
        }
        containerRef.value.classList.add('super-editor', 'hf-preview-surface');
        applyMetricsToContainer();

        const extensions = getStarterExtensions().filter((extension) => extension?.name !== 'pagination');
        previewEditor = new Editor({
          element: containerRef.value,
          loadFromSchema: true,
          content: props.record.contentJson,
          extensions,
          pagination: false,
          editable: false,
          isHeaderOrFooter: true,
          parentEditor: props.parentEditor,
          role: 'viewer',
          documentMode: 'viewing',
          fonts: props.parentEditor.options?.fonts ?? {},
          media: props.parentEditor.options?.media ?? {},
          mediaFiles: props.parentEditor.options?.mediaFiles ?? {},
        });
        previewEditor.setEditable?.(false, false);
        applyMetricsToEditor();
        scheduleOverflowRelaxation();
      } catch (error) {}
    };

    const refreshEditorMetrics = () => {
      applyMetricsToContainer();
      applyMetricsToEditor();
      scheduleOverflowRelaxation();
    };

    onMounted(() => {
      nextTick(instantiate);
    });

    watch(
      () => props.parentEditor,
      () => {
        nextTick(instantiate);
      },
    );

    watch(
      () => props.record.contentJson,
      (content) => {
        if (!previewEditor) {
          nextTick(instantiate);
          return;
        }
        if (typeof previewEditor.replaceContent === 'function' && content) {
          previewEditor.replaceContent(content);
        }
        previewEditor?.setEditable?.(false, false);
        nextTick(refreshEditorMetrics);
      },
      { deep: true },
    );

    watch(
      () => props.pageWidthPx,
      (width) => {
        if (containerRef.value && Number.isFinite(width)) {
          containerRef.value.style.width = `${width}px`;
        }
        nextTick(instantiate);
      },
    );

    watch(
      () => props.record.metrics,
      () => {
        nextTick(refreshEditorMetrics);
      },
      { immediate: true, deep: true },
    );

    onBeforeUnmount(() => {
      previewEditor?.destroy?.();
      previewEditor = null;
    });

    return () =>
      h('div', {
        ref: containerRef,
        class: 'hf-preview',
        style: {
          width: Number.isFinite(props.pageWidthPx) ? `${props.pageWidthPx}px` : '816px',
          minHeight: Number.isFinite(metrics().effectiveHeightPx)
            ? `${Math.max(metrics().effectiveHeightPx, 200)}px`
            : '200px',
        },
        'data-record-id': props.record.id,
        'data-record-type': props.record.type,
      });
  },
});

onMounted(() => {
  window.addEventListener('resize', onWindowResize);
  initMeasurementHarness();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  teardownHarness();
  clearMarkerAnimation();
  clearLayoutCopyFeedbackTimer();
});

defineExpose({
  loadDocument: initMeasurementHarness,
  isLoadingDocument,
});
</script>

<template>
  <div class="editor-container">
    <div class="workspace">
      <div class="stage-column">
        <div class="panel-tabs" role="tablist">
          <button
            type="button"
            class="panel-tab"
            :class="{ active: activeTab === 'editor' }"
            @click="activeTab = 'editor'"
            role="tab"
            :aria-selected="activeTab === 'editor'"
          >
            Editor
          </button>
          <button
            type="button"
            class="panel-tab"
            :class="{ active: activeTab === 'headers' }"
            @click="activeTab = 'headers'"
            role="tab"
            :aria-selected="activeTab === 'headers'"
          >
            Headers &amp; Footers
          </button>
        </div>

        <div class="stage-content">
          <Ruler />

          <div class="editor measurement-wrapper">
            <div class="page-break-overlay">
              <div
                v-for="highlight in positionHighlightRects"
                :key="`highlight-${highlight.id}`"
                class="position-highlight"
                :style="{
                  top: `${highlight.top}px`,
                  left: `${highlight.left}px`,
                  width: `${highlight.width}px`,
                  height: `${highlight.height}px`,
                }"
              ></div>
              <div
                v-for="line in pageBreakLines"
                :key="line.id"
                class="page-break-line"
                :style="{ top: `${line.top}px` }"
              ></div>
              <div
                v-for="marker in pageBreakMarkers"
                :key="`marker-${marker.id}`"
                class="page-break-marker"
                :style="{ top: `${marker.top}px`, left: `${marker.left}px` }"
              ></div>
            </div>
            <div ref="measurementEditor" class="measurement-surface"></div>
          </div>

          <div class="editor-panel">
            <div class="panel-body">
              <div v-show="activeTab === 'editor'" class="panel-section" role="tabpanel">
                <div ref="editorElement" class="editor main-editor"></div>
              </div>

              <div v-show="activeTab === 'headers'" class="panel-section headers" role="tabpanel">
                <div v-if="!hasHeaderFooterContent" class="empty-state">
                  <p>No header or footer content detected for this document.</p>
                </div>

                <div v-else class="headers-footers">
                  <section
                    class="variant-summary"
                    v-if="
                      hasHeaderFooterVariants ||
                      headerFooterState.distancesPx.header ||
                      headerFooterState.distancesPx.footer
                    "
                  >
                    <div class="variant-column" v-if="headerFooterState.variants.header.length">
                      <h3>Header Variants</h3>
                      <ul>
                        <li
                          v-for="[variant, id] in headerFooterState.variants.header"
                          :key="`header-variant-${variant}`"
                        >
                          <span class="variant-key">{{ variant }}</span>
                          <span class="variant-id">{{ id }}</span>
                        </li>
                      </ul>
                    </div>
                    <div class="variant-column" v-if="headerFooterState.variants.footer.length">
                      <h3>Footer Variants</h3>
                      <ul>
                        <li
                          v-for="[variant, id] in headerFooterState.variants.footer"
                          :key="`footer-variant-${variant}`"
                        >
                          <span class="variant-key">{{ variant }}</span>
                          <span class="variant-id">{{ id }}</span>
                        </li>
                      </ul>
                    </div>
                    <div class="variant-column distance-meta">
                      <h3>Distances</h3>
                      <p>Header distance: {{ formatPixels(headerFooterState.distancesPx.header) }}</p>
                      <p>Footer distance: {{ formatPixels(headerFooterState.distancesPx.footer) }}</p>
                    </div>
                  </section>

                  <section class="hf-group" v-if="headerFooterState.headers.length">
                    <h2>Headers</h2>
                    <div class="hf-grid">
                      <article v-for="record in headerFooterState.headers" :key="record.id" class="hf-card">
                        <header class="hf-card-header">
                          <div>
                            <h3>{{ record.id }}</h3>
                            <p class="hf-meta">
                              Content: {{ formatPixels(record.metrics?.contentHeightPx) }} · Distance:
                              {{ formatPixels(record.metrics?.distancePx) }} · Effective:
                              {{ formatPixels(record.metrics?.effectiveHeightPx) }}
                            </p>
                          </div>
                          <div v-if="record.variants?.length" class="hf-badges">
                            <span
                              v-for="variant in record.variants"
                              :key="`${record.id}-variant-${variant}`"
                              class="hf-badge"
                            >
                              {{ variant }}
                            </span>
                          </div>
                        </header>
                        <HeaderFooterPreview
                          :record="record"
                          :parent-editor="editor"
                          :page-width-px="headerFooterState.contentWidthPx"
                        />
                      </article>
                    </div>
                  </section>

                  <section class="hf-group" v-if="headerFooterState.footers.length">
                    <h2>Footers</h2>
                    <div class="hf-grid">
                      <article v-for="record in headerFooterState.footers" :key="record.id" class="hf-card">
                        <header class="hf-card-header">
                          <div>
                            <h3>{{ record.id }}</h3>
                            <p class="hf-meta">
                              Content: {{ formatPixels(record.metrics?.contentHeightPx) }} · Distance:
                              {{ formatPixels(record.metrics?.distancePx) }} · Effective:
                              {{ formatPixels(record.metrics?.effectiveHeightPx) }}
                            </p>
                          </div>
                          <div v-if="record.variants?.length" class="hf-badges">
                            <span
                              v-for="variant in record.variants"
                              :key="`${record.id}-variant-${variant}`"
                              class="hf-badge"
                            >
                              {{ variant }}
                            </span>
                          </div>
                        </header>
                        <HeaderFooterPreview
                          :record="record"
                          :parent-editor="editor"
                          :page-width-px="headerFooterState.contentWidthPx"
                        />
                      </article>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="tools-column">
        <section class="tools-drawer" :class="{ collapsed: !isToolsDrawerOpen }">
          <header class="tools-header">
            <div class="tools-titles">
              <h2>Test tools</h2>
              <p>Inspect live pagination measurements without leaving the harness.</p>
            </div>
            <div class="tools-actions">
              <input
                ref="layoutImportInput"
                type="file"
                accept="application/json,.json,.txt"
                style="display: none"
                @change="handleLayoutImport"
              />
              <button
                type="button"
                class="copy-layout-button"
                @click="triggerLayoutImport"
                :disabled="isImportingLayout || !canCopyLayout"
              >
                {{ isImportingLayout ? 'Importing…' : 'Import layout' }}
              </button>
              <button
                type="button"
                class="copy-layout-button"
                @click="exportLayout"
                :disabled="isCopyingLayout || !canCopyLayout"
              >
                {{ isCopyingLayout ? 'Exporting…' : 'Export layout' }}
              </button>
            </div>
          </header>
          <div
            v-if="layoutCopyMessage"
            class="tools-feedback"
            :class="{ error: layoutCopyIsError }"
            role="status"
            aria-live="polite"
          >
            {{ layoutCopyMessage }}
          </div>
          <transition name="tools-fade">
            <div v-show="isToolsDrawerOpen" class="tools-body" :id="toolsDrawerId">
              <section class="tool-section">
                <div v-if="hasCurrentBreaks" class="break-drawers">
                  <article
                    v-for="summary in currentBreakSummaries"
                    :key="summary.id"
                    class="break-card"
                    :class="{ open: isBreakExpanded(summary.id) }"
                  >
                    <button
                      type="button"
                      class="break-card-toggle"
                      @click="toggleBreakDrawer(summary.id)"
                      :aria-expanded="isBreakExpanded(summary.id)"
                    >
                      <div class="break-card-title">
                        <h4>Page {{ summary.pageIndex + 1 }}</h4>
                      </div>
                      <span class="break-card-icon" aria-hidden="true" />
                    </button>

                    <transition name="break-fade">
                      <div v-show="isBreakExpanded(summary.id)" class="break-card-body">
                        <div class="break-position-controls">
                          <label class="position-label" :for="`doc-pos-${summary.id}`">Doc pos</label>
                          <div class="position-input-group">
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustPositionValue(summary.id, -1)"
                              aria-label="Decrease document position"
                            >
                              -
                            </button>
                            <input
                              class="position-input"
                              type="text"
                              :id="`doc-pos-${summary.id}`"
                              :value="getPositionValue(summary.id)"
                              @input="handlePositionInput(summary.id, $event)"
                              @blur="commitPositionValue(summary.id)"
                              @keyup.enter="commitPositionValue(summary.id)"
                            />
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustPositionValue(summary.id, 1)"
                              aria-label="Increase document position"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div v-if="!summary.isLastPage" class="break-position-controls">
                          <label class="position-label" :for="`spacer-${summary.id}`">
                            Spacer after page {{ summary.pageIndex + 1 }}
                          </label>
                          <div class="position-input-group">
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustSpacerValue(summary.id, -5)"
                              aria-label="Decrease spacer height"
                            >
                              -
                            </button>
                            <input
                              class="position-input"
                              type="text"
                              :id="`spacer-${summary.id}`"
                              :value="getSpacerValue(summary.id)"
                              @input="handleSpacerInput(summary.id, $event)"
                              @blur="commitSpacerValue(summary.id)"
                              @keyup.enter="commitSpacerValue(summary.id)"
                            />
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustSpacerValue(summary.id, 5)"
                              aria-label="Increase spacer height"
                            >
                              +
                            </button>
                          </div>
                          <small class="control-hint"> Affects the gap before page {{ summary.pageIndex + 2 }} </small>
                        </div>
                        <div v-else class="control-hint">No spacer after the final page.</div>

                        <div class="break-position-controls" v-if="summary.headerId">
                          <label class="position-label" :for="`header-height-${summary.headerId}`">
                            Header {{ summary.headerId }} height
                          </label>
                          <div class="position-input-group">
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustHeaderHeight(summary.headerId, -5)"
                              aria-label="Decrease header height"
                            >
                              -
                            </button>
                            <input
                              class="position-input"
                              type="text"
                              :id="`header-height-${summary.headerId}`"
                              :value="getHeaderHeightValue(summary.headerId)"
                              @input="handleHeaderHeightInput(summary.headerId, $event)"
                            />
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustHeaderHeight(summary.headerId, 5)"
                              aria-label="Increase header height"
                            >
                              +
                            </button>
                          </div>
                          <small class="control-hint"> Original: {{ formatPixels(summary.headerEffective) }} </small>
                        </div>

                        <div class="break-position-controls" v-if="summary.footerId">
                          <label class="position-label" :for="`footer-height-${summary.footerId}`">
                            Footer {{ summary.footerId }} height
                          </label>
                          <div class="position-input-group">
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustFooterHeight(summary.footerId, -5)"
                              aria-label="Decrease footer height"
                            >
                              -
                            </button>
                            <input
                              class="position-input"
                              type="text"
                              :id="`footer-height-${summary.footerId}`"
                              :value="getFooterHeightValue(summary.footerId)"
                              @input="handleFooterHeightInput(summary.footerId, $event)"
                            />
                            <button
                              type="button"
                              class="position-adjust"
                              @click.stop="adjustFooterHeight(summary.footerId, 5)"
                              aria-label="Increase footer height"
                            >
                              +
                            </button>
                          </div>
                          <small class="control-hint"> Original: {{ formatPixels(summary.footerEffective) }} </small>
                        </div>

                        <dl class="break-grid">
                          <div class="break-metric">
                            <dt>Start offset</dt>
                            <dd>{{ formatPixels(summary.startOffset) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Break top</dt>
                            <dd>{{ formatPixels(summary.breakTop) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Break bottom</dt>
                            <dd>{{ formatPixels(summary.breakBottom) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Fitted top</dt>
                            <dd>{{ formatPixels(summary.fittedTop) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Fitted bottom</dt>
                            <dd>{{ formatPixels(summary.fittedBottom) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Extra spacer</dt>
                            <dd>{{ formatPixels(summary.extraSpacing) }}</dd>
                          </div>
                        </dl>

                        <dl class="break-grid secondary">
                          <div class="break-metric">
                            <dt>Total spacer</dt>
                            <dd>{{ formatPixels(summary.totalSpacing) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Page gap</dt>
                            <dd>{{ formatPixels(summary.pageGap) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Margin top</dt>
                            <dd>{{ formatPixels(summary.marginTop) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Margin bottom</dt>
                            <dd>{{ formatPixels(summary.marginBottom) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Footer reserved</dt>
                            <dd>{{ formatPixels(summary.footerReserved) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Next header reserved</dt>
                            <dd>{{ formatPixels(summary.nextHeaderReserved) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Content height</dt>
                            <dd>{{ formatPixels(summary.contentHeight) }}</dd>
                          </div>
                          <div class="break-metric">
                            <dt>Page height</dt>
                            <dd>{{ formatPixels(summary.pageHeight) }}</dd>
                          </div>
                        </dl>

                        <footer class="break-associations">
                          <div class="association">
                            <span class="association-label">Header</span>
                            <span class="association-value">
                              {{ summary.headerId ?? '—' }}
                              <template v-if="summary.headerOffset !== null">
                                · {{ formatPixels(summary.headerOffset) }}
                              </template>
                            </span>
                          </div>
                          <div class="association">
                            <span class="association-label">Footer</span>
                            <span class="association-value">
                              {{ summary.footerId ?? '—' }}
                              <template v-if="summary.footerOffset !== null">
                                · {{ formatPixels(summary.footerOffset) }}
                              </template>
                            </span>
                          </div>
                        </footer>
                      </div>
                    </transition>
                  </article>
                </div>

                <div v-else class="empty-state small">
                  <p>No break data available yet.</p>
                </div>
              </section>
            </div>
          </transition>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.tools-drawer {
  position: relative;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 20px;
  border: 1px solid rgba(114, 138, 255, 0.28);
  background: linear-gradient(140deg, rgba(19, 26, 46, 0.92), rgba(20, 31, 57, 0.78));
  box-shadow:
    inset 0 1px 0 rgba(171, 186, 255, 0.08),
    0 18px 48px rgba(7, 11, 24, 0.55);
  width: 100%;
  box-sizing: border-box;
}

.tools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tools-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.copy-layout-button {
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 255, 0.38);
  background: rgba(24, 35, 65, 0.85);
  color: #eaf0ff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.copy-layout-button:hover:not(:disabled) {
  border-color: rgba(192, 206, 255, 0.72);
  background: rgba(28, 40, 70, 0.95);
}

.copy-layout-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tools-titles h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #f4f7ff;
}

.tools-titles p {
  margin: 4px 0 0;
  color: rgba(220, 230, 255, 0.72);
  font-size: 13px;
  line-height: 1.4;
}

.tools-feedback {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(220, 230, 255, 0.75);
  font-weight: 500;
}

.tools-feedback.error {
  color: rgba(248, 113, 113, 0.85);
}

.tools-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tool-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tool-section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #f1f5ff;
}

.tool-section-header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(205, 219, 255, 0.65);
}

.break-drawers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.break-card {
  border-radius: 16px;
  border: 1px solid rgba(111, 128, 255, 0.22);
  background: rgba(13, 20, 35, 0.85);
  box-shadow: inset 0 1px 0 rgba(180, 196, 255, 0.05);
  overflow: hidden;
}

.break-card-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
}

.break-card-toggle:hover {
  background: rgba(24, 32, 54, 0.65);
}

.break-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f4f7ff;
}

.break-card-title h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f4f7ff;
}

.break-card-icon {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-right: 2px solid rgba(206, 215, 255, 0.9);
  border-bottom: 2px solid rgba(206, 215, 255, 0.9);
  transform: rotate(45deg);
  transition: transform 0.2s ease;
}

.break-card.open .break-card-icon {
  transform: rotate(-135deg);
}

.break-card-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0 20px 20px;
  border-top: 1px solid rgba(118, 136, 255, 0.18);
  background: rgba(11, 17, 32, 0.35);
}

.break-position-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.position-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(198, 210, 255, 0.7);
}

.position-input-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 25, 44, 0.8);
  border: 1px solid rgba(120, 138, 255, 0.28);
  border-radius: 999px;
  padding: 6px;
}

.control-hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(220, 230, 255, 0.65);
}

.position-input {
  width: 90px;
  padding: 8px 12px;
  border: none;
  border-radius: 999px;
  background: rgba(12, 19, 36, 0.9);
  color: #f4f7ff;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.position-input:focus {
  outline: 2px solid rgba(144, 168, 255, 0.6);
  outline-offset: 2px;
}

.position-adjust {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(32, 46, 78, 0.9);
  color: #f4f7ff;
  font-size: 18px;
  line-height: 1;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.position-adjust:hover {
  background: rgba(74, 102, 164, 0.95);
}

.position-adjust:active {
  transform: scale(0.94);
}

.break-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin: 0;
}

.break-grid.secondary {
  border-top: 1px solid rgba(118, 136, 255, 0.18);
  padding-top: 12px;
}

.break-metric dt {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(198, 210, 255, 0.6);
}

.break-metric dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #f9fbff;
}

.break-associations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(118, 136, 255, 0.18);
}

.association {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.association-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(198, 210, 255, 0.6);
}

.association-value {
  font-size: 14px;
  font-weight: 600;
  color: #f9fbff;
}

.empty-state.small {
  padding: 24px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 255, 0.3);
  background: rgba(19, 26, 46, 0.6);
  color: rgba(205, 219, 255, 0.72);
  text-align: center;
  font-size: 14px;
}

.tools-fade-enter-active,
.tools-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.tools-fade-enter-from,
.tools-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.break-fade-enter-active,
.break-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.break-fade-enter-from,
.break-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workspace {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.stage-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.tools-column {
  flex: 0 0 360px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: sticky;
  top: 24px;
  align-self: flex-start;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}

@media (max-width: 1400px) {
  .workspace {
    flex-direction: column;
  }

  .tools-column {
    flex: 1 1 auto;
    width: 100%;
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
  }
}

.stage-content {
  display: flex;
  flex: 1;
  flex-direction: row;
  gap: 16px;
  justify-content: flex-start;
}

.editor-panel {
  display: flex;
  min-width: 8.5in;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(10, 15, 27, 0.92);
  box-shadow: 0 22px 48px rgba(5, 10, 22, 0.48);
}

.panel-tabs {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  flex-wrap: wrap;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 255, 0.24);
  background: linear-gradient(135deg, rgba(19, 24, 39, 0.88), rgba(21, 33, 55, 0.78));
  box-shadow: 0 18px 40px rgba(6, 12, 26, 0.45);
}

.panel-tab {
  flex: 1;
  padding: 14px 18px;
  background: transparent;
  border: none;
  color: rgba(226, 232, 255, 0.75);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.panel-tab:hover {
  background: rgba(148, 163, 255, 0.08);
  color: #e6ecff;
}

.panel-tab.active {
  background: rgba(148, 163, 255, 0.18);
  color: #ffffff;
}

.panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20px 24px;
  overflow: auto;
}

.panel-section.headers {
  gap: 18px;
  padding-top: 20px;
}

.measurement-wrapper {
  position: relative;
  flex: 0 1 816px;
  max-width: 816px;
  background: rgba(10, 15, 27, 0.92);
  box-shadow: 0 22px 48px rgba(5, 10, 22, 0.48);
  background-color: white;
}

.page-break-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.position-highlight {
  position: absolute;
  border: 2px solid rgba(239, 68, 68, 0.94);
  border-radius: 4px;
  box-shadow:
    0 0 0 1px rgba(239, 68, 68, 0.45),
    0 4px 10px rgba(239, 68, 68, 0.3);
  pointer-events: none;
  z-index: 18;
}

.page-break-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
  opacity: 1;
}

.page-break-marker {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 15;
}

.page-break-marker::before {
  content: '';
  position: absolute;
  width: 6px;
  height: 18px;
  border-radius: 3px;
  background: linear-gradient(180deg, #dc2626 0%, #f87171 100%);
  box-shadow:
    0 0 0 1px rgba(220, 38, 38, 0.55),
    0 6px 12px rgba(220, 38, 38, 0.25);
  transform: translate(-50%, -50%);
}

.headers-footers {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.variant-summary {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  background: rgba(148, 163, 255, 0.08);
  padding: 16px;
  border-radius: 12px;
}

.variant-column {
  min-width: 180px;
}

.variant-column.distance-meta p {
  margin: 0;
  font-size: 12px;
  color: rgba(226, 232, 255, 0.7);
}

.variant-column h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e6ecff;
}

.variant-column ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.variant-key {
  display: inline-block;
  min-width: 64px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(226, 232, 255, 0.75);
}

.variant-id {
  font-size: 12px;
  color: rgba(226, 232, 255, 0.55);
}

.hf-group h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #f4f6ff;
}

.hf-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hf-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(14, 22, 38, 0.92);
  border: 1px solid rgba(148, 163, 255, 0.18);
  box-shadow: 0 16px 32px rgba(5, 10, 22, 0.38);
  min-width: 840px;
}

.hf-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.hf-card-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f1f5ff;
}

.hf-meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(226, 232, 255, 0.8);
}

.hf-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hf-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 255, 0.2);
  color: #dbe2ff;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hf-preview {
  min-height: 200px;
  border-radius: 10px;
  overflow: visible;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  color: #0f172a;
  position: relative;
}

.hf-preview-surface {
  min-height: 200px;
}

.hf-preview :deep(.ProseMirror) {
  color: #0f172a;
  padding: 18px;
  min-height: 180px;
}

.empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: rgba(226, 232, 255, 0.7);
  font-size: 14px;
  padding: 24px;
  min-width: 700px;
  text-align: center;
}
</style>
