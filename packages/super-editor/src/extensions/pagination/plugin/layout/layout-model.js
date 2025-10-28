import { DEFAULT_PAGE_HEIGHT_IN_PX, DEFAULT_PAGE_MARGINS_IN_PX } from '@measurement-engine';
import { getPageCountFromBreaks } from '../helpers/page-bands.js';

/**
 * Build a page layout model using measured break positions.
 * The model is consumed by the pagination overlay to draw page frames.
 *
 * @param {import('prosemirror-view').EditorView} view
 * @param {{ pageHeightPx?: number, marginsPx?: {top:number,bottom:number,left:number,right:number} }} metrics
 * @param {{ pageBreaks?: Array<{ break?: { pos?: number } }> }} [options]
 * @returns {{ pages: Array<{ pageIndex:number, from:number, to:number, boundary:{ pageTop:number, pageBottom:number, pageHeightPx:number, marginsPx:{top:number,bottom:number,left:number,right:number} }, break?:object|null, overflowBlock?:object|null }>, metrics: { pageHeightPx:number, marginsPx:{top:number,bottom:number,left:number,right:number} } }}
 */
export function buildLayoutModel(view, metrics = {}, options = {}) {
  const norm = normalizedMetrics(metrics);
  if (!view?.state) {
    return { pages: [], metrics: norm };
  }

  const docSize = view.state.doc?.content?.size ?? 0;
  const pageBreakEntries = Array.isArray(options.pageBreaks) ? options.pageBreaks : [];
  const rawFieldSegments = Array.isArray(options.fieldSegments) ? options.fieldSegments : [];

  const breakMap = new Map();
  for (const entry of pageBreakEntries) {
    const key = resolveBreakPosition(entry);
    if (key != null) {
      breakMap.set(key, entry);
    }
  }

  const fieldSegmentsByPage = new Map();
  for (const field of rawFieldSegments) {
    const rect = field?.rect ?? {};
    const segments = Array.isArray(field?.segments) ? field.segments : [];
    for (const segment of segments) {
      if (!Number.isInteger(segment?.pageIndex)) continue;
      const bucket = fieldSegmentsByPage.get(segment.pageIndex) ?? [];
      bucket.push({
        pos: field?.pos ?? null,
        type: field?.attrs?.type ?? null,
        fieldId: field?.attrs?.fieldId ?? null,
        rectLeftPx: rect?.leftPx ?? 0,
        rectWidthPx: rect?.widthPx ?? 0,
        rectHeightPx: rect?.heightPx ?? 0,
        offsetWithinFieldPx: segment?.offsetWithinFieldPx ?? 0,
        topPx: segment?.topPx ?? 0,
        heightPx: segment?.heightPx ?? 0,
      });
      fieldSegmentsByPage.set(segment.pageIndex, bucket);
    }
  }

  // Merge measured breaks with explicit hard breaks to avoid missing forced separators.
  const mergedPositions = new Set();
  for (const pos of breakMap.keys()) {
    if (Number.isFinite(pos) && pos > 0 && pos < docSize) mergedPositions.add(pos);
  }
  for (const pos of collectForcedAnchors(view)) {
    if (Number.isFinite(pos) && pos > 0 && pos < docSize) mergedPositions.add(pos);
  }

  const sorted = Array.from(mergedPositions).sort((a, b) => a - b);

  const pages = [];
  let from = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const to = sorted[i];
    const info = breakMap.get(to) ?? null;
    pages.push({
      pageIndex: i,
      from,
      to,
      boundary: deriveBoundaryFromContainer(view, norm, i),
      break: info?.break ?? null,
      overflowBlock: info?.overflowBlock ?? null,
      fieldSegments: fieldSegmentsByPage.get(i) ?? [],
    });
    from = to;
  }

  const lastIndex = pages.length;
  if (from < docSize || pages.length === 0) {
    pages.push({
      pageIndex: lastIndex,
      from,
      to: docSize,
      boundary: deriveBoundaryFromContainer(view, norm, lastIndex),
      break: null,
      overflowBlock: null,
      fieldSegments: fieldSegmentsByPage.get(lastIndex) ?? [],
    });
  }

  const expectedPageCount = getPageCountFromBreaks(pageBreakEntries);

  if (pages.length < expectedPageCount) {
    let baseFrom = pages.length > 0 ? pages[pages.length - 1].to : 0;
    for (let pageIndex = pages.length; pageIndex < expectedPageCount; pageIndex += 1) {
      pages.push({
        pageIndex,
        from: baseFrom,
        to: docSize,
        boundary: deriveBoundaryFromContainer(view, norm, pageIndex),
        break: null,
        overflowBlock: null,
        fieldSegments: fieldSegmentsByPage.get(pageIndex) ?? [],
      });
      baseFrom = docSize;
    }
  }

  return { pages, metrics: norm };
}

function resolveBreakPosition(entry) {
  if (!entry) return null;
  if (Number.isFinite(entry?.pos)) return entry.pos;
  if (Number.isFinite(entry?.break?.pos)) return entry.break.pos;
  if (Number.isFinite(entry?.boundary?.to)) return entry.boundary.to;
  if (Number.isFinite(entry?.to)) return entry.to;
  return null;
}

function normalizedMetrics(metrics = {}) {
  return {
    pageHeightPx: Number.isFinite(metrics.pageHeightPx) ? metrics.pageHeightPx : DEFAULT_PAGE_HEIGHT_IN_PX,
    marginsPx: {
      top: resolveMargin(metrics.marginsPx?.top, DEFAULT_PAGE_MARGINS_IN_PX.top),
      bottom: resolveMargin(metrics.marginsPx?.bottom, DEFAULT_PAGE_MARGINS_IN_PX.bottom),
      left: resolveMargin(metrics.marginsPx?.left, DEFAULT_PAGE_MARGINS_IN_PX.left),
      right: resolveMargin(metrics.marginsPx?.right, DEFAULT_PAGE_MARGINS_IN_PX.right),
    },
  };
}

function resolveMargin(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function deriveBoundaryFromContainer(view, metrics, pageIndex) {
  const { pageHeightPx, marginsPx } = metrics;
  try {
    const rect = view.dom?.getBoundingClientRect?.();
    if (rect) {
      return {
        pageTop: rect.top + pageIndex * pageHeightPx + marginsPx.top,
        pageBottom: rect.top + (pageIndex + 1) * pageHeightPx - marginsPx.bottom,
        pageHeightPx,
        marginsPx,
      };
    }
  } catch {}

  return {
    pageTop: pageIndex * pageHeightPx + marginsPx.top,
    pageBottom: (pageIndex + 1) * pageHeightPx - marginsPx.bottom,
    pageHeightPx,
    marginsPx,
  };
}

function collectForcedAnchors(view) {
  const positions = [];
  try {
    view.state.doc.descendants((node, pos) => {
      const name = node?.type?.name || '';
      if (name === 'hardBreak') {
        const t = node?.attrs?.pageBreakType || node?.attrs?.lineBreakType || null;
        if (t === 'page') positions.push(pos);
      }
      return true;
    });
  } catch {}

  positions.sort((a, b) => a - b);
  const unique = [];
  let last = -1;
  for (const p of positions) {
    if (p !== last) unique.push(p);
    last = p;
  }
  return unique;
}
