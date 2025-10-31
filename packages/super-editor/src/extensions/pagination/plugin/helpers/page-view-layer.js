const px = (value) => `${Math.max(0, Math.round(value))}px`;

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const ensureLayer = (editor, storage) => {
  const viewDom = editor?.view?.dom;
  const viewContainer = viewDom?.parentNode ?? null;
  const host = editor?.options?.element ?? viewContainer ?? null;
  if (!viewDom || !host) return null;

  let layer = storage?.pageViewContainer ?? null;
  if (layer && layer.isConnected) {
    return layer;
  }

  const doc = viewDom.ownerDocument ?? document;
  layer = doc.createElement('div');
  layer.className = 'super-editor-page-view-layer';
  layer.style.position = 'absolute';
  layer.style.pointerEvents = 'none';
  layer.style.top = '0';
  layer.style.left = '0';
  layer.style.right = '0';
  layer.style.bottom = '0';
  layer.style.zIndex = '1';

  if (viewContainer && host) {
    host.insertBefore(layer, viewContainer);
  } else {
    host?.appendChild(layer);
  }

  if (storage) {
    storage.pageViewContainer = layer;
    storage.pageViewElements = [];
  }

  return layer;
};

const ensureElements = (layer, storage, count) => {
  if (!layer || !storage) return [];
  const elements = Array.isArray(storage.pageViewElements) ? storage.pageViewElements : [];

  while (elements.length < count) {
    const el = layer.ownerDocument.createElement('div');
    el.className = 'super-editor-page-view';
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.pointerEvents = 'none';
    el.dataset.paginationPage = String(elements.length);
    layer.appendChild(el);
    elements.push(el);
  }

  while (elements.length > count) {
    const removed = elements.pop();
    if (removed?.parentNode) {
      removed.parentNode.removeChild(removed);
    }
  }

  storage.pageViewElements = elements;
  return elements;
};

const derivePageCount = (engine) => {
  if (!engine) return 0;
  const pages = Array.isArray(engine?.layoutPackage?.pages) ? engine.layoutPackage.pages : null;
  if (pages?.length) return pages.length;
  const breaks = Array.isArray(engine?.pageBreaks) ? engine.pageBreaks.length : 0;
  return breaks > 0 ? breaks + 1 : 0;
};

const resolvePageMetrics = (engine, pageIndex) => {
  const pages = Array.isArray(engine?.layoutPackage?.pages) ? engine.layoutPackage.pages : [];
  const entry = pages[pageIndex] ?? null;

  const pageHeight =
    toNumber(entry?.metrics?.pageHeightPx, toNumber(engine?.pageSize?.height)) ||
    toNumber(engine?.measurementEditor?.pageSize?.height);
  const pageWidth =
    toNumber(entry?.metrics?.pageWidthPx, toNumber(engine?.pageSize?.width)) ||
    toNumber(engine?.measurementEditor?.pageSize?.width);
  const startOffset = toNumber(entry?.break?.startOffsetPx, pageIndex * pageHeight);

  return {
    height: pageHeight,
    width: pageWidth,
    top: startOffset,
  };
};

export const clearPageViewLayer = (storage) => {
  if (!storage) return;

  const elements = Array.isArray(storage.pageViewElements) ? storage.pageViewElements : [];
  elements.forEach((el) => {
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  storage.pageViewElements = [];

  const layer = storage.pageViewContainer;
  if (layer?.parentNode) {
    layer.parentNode.removeChild(layer);
  }
  storage.pageViewContainer = null;
};

export const syncPageViewLayer = ({ editor, storage, engine }) => {
  if (!editor || !storage) return 0;

  const layer = ensureLayer(editor, storage);
  if (!layer) {
    return 0;
  }

  const pageCount = Math.max(derivePageCount(engine), 0);
  if (!pageCount) {
    clearPageViewLayer(storage);
    return 0;
  }

  const elements = ensureElements(layer, storage, pageCount);

  for (let index = 0; index < elements.length; index += 1) {
    const el = elements[index];
    const metrics = resolvePageMetrics(engine, index);
    el.dataset.paginationPage = String(index);
    el.style.left = '0';
    el.style.top = px(metrics.top);
    if (metrics.height > 0) {
      el.style.height = px(metrics.height);
    } else {
      el.style.removeProperty('height');
    }
    if (metrics.width > 0) {
      el.style.width = px(metrics.width);
    } else {
      el.style.removeProperty('width');
    }
  }

  return elements.length;
};
