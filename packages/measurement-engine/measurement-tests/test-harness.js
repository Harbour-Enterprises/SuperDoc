// Shared utilities for measurement regression tests
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const TEST_ROOT = path.dirname(__filename);

const DEFAULT_PAGE_WIDTH = 816;
const DEFAULT_CELL_HEIGHT = 32;
const DEFAULT_ROW_STRIDE = 48;

const NOOP = () => {};

export const defaultMeasurementDomPatch = () => {
  const proto = window.HTMLElement?.prototype;
  if (!proto) return NOOP;

  const originalOffsetHeight = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
  const originalGetBoundingClientRect = proto.getBoundingClientRect;
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalElementFromPoint = document.elementFromPoint;

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  }

  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get() {
      return DEFAULT_PAGE_WIDTH;
    },
  });

  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() {
      return DEFAULT_CELL_HEIGHT;
    },
  });

  const rectMap = new WeakMap();
  let rectCounter = 0;
  proto.getBoundingClientRect = function () {
    if (!rectMap.has(this)) {
      const top = rectCounter * DEFAULT_ROW_STRIDE;
      rectCounter += 1;
      rectMap.set(this, {
        top,
        bottom: top + DEFAULT_CELL_HEIGHT,
        left: 0,
        right: DEFAULT_PAGE_WIDTH,
        width: DEFAULT_PAGE_WIDTH,
        height: DEFAULT_CELL_HEIGHT,
        x: 0,
        y: top,
      });
    }
    const rect = rectMap.get(this);
    return { ...rect };
  };

  document.elementFromPoint = () => document.body;

  return () => {
    if (originalOffsetHeight) Object.defineProperty(proto, 'offsetHeight', originalOffsetHeight);
    else delete proto.offsetHeight;

    if (originalOffsetWidth) Object.defineProperty(proto, 'offsetWidth', originalOffsetWidth);
    else delete proto.offsetWidth;

    if (originalGetBoundingClientRect) proto.getBoundingClientRect = originalGetBoundingClientRect;
    else delete proto.getBoundingClientRect;

    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete window.matchMedia;

    if (originalRequestAnimationFrame) window.requestAnimationFrame = originalRequestAnimationFrame;
    else delete window.requestAnimationFrame;

    if (originalCancelAnimationFrame) window.cancelAnimationFrame = originalCancelAnimationFrame;
    else delete window.cancelAnimationFrame;

    if (originalElementFromPoint) document.elementFromPoint = originalElementFromPoint;
    else delete document.elementFromPoint;
  };
};

export const tableRowMeasurementDomPatch = ({
  cellHeight = 120,
  rowStride = 140,
  pageWidth = DEFAULT_PAGE_WIDTH,
} = {}) => {
  const proto = window.HTMLElement?.prototype;
  if (!proto) return NOOP;

  const originalOffsetHeight = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
  const originalGetBoundingClientRect = proto.getBoundingClientRect;
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  }

  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get() {
      return pageWidth;
    },
  });

  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() {
      return cellHeight;
    },
  });

  const rectMap = new WeakMap();
  const rowIndexMap = new WeakMap();
  let nextRowIndex = 0;

  const resolveRowIndex = (rowNode) => {
    if (!rowNode) return 0;
    if (rowIndexMap.has(rowNode)) return rowIndexMap.get(rowNode);
    const index = nextRowIndex;
    rowIndexMap.set(rowNode, index);
    nextRowIndex += 1;
    return index;
  };

  const findRowForElement = (element) => {
    if (!element) return null;
    if (element.tagName && element.tagName.toUpperCase() === 'TR') {
      return element;
    }
    return element.closest?.('tr') ?? null;
  };

  const resolveIndexForElement = (element) => {
    const row = findRowForElement(element);
    if (!row) return 0;
    return resolveRowIndex(row);
  };

  proto.getBoundingClientRect = function () {
    if (!rectMap.has(this)) {
      const tagName = typeof this.tagName === 'string' ? this.tagName.toUpperCase() : '';
      let top = 0;
      let height = cellHeight;

      if (tagName === 'TABLE') {
        const rowCount = this.querySelectorAll?.('tr')?.length ?? 0;
        height = Math.max(rowCount * rowStride, cellHeight);
      } else {
        const index = resolveIndexForElement(this);
        top = index * rowStride;
      }

      rectMap.set(this, {
        top,
        bottom: top + height,
        left: 0,
        right: pageWidth,
        width: pageWidth,
        height,
        x: 0,
        y: top,
      });
    }
    const rect = rectMap.get(this);
    return { ...rect };
  };

  return () => {
    if (originalOffsetHeight) Object.defineProperty(proto, 'offsetHeight', originalOffsetHeight);
    else delete proto.offsetHeight;

    if (originalOffsetWidth) Object.defineProperty(proto, 'offsetWidth', originalOffsetWidth);
    else delete proto.offsetWidth;

    if (originalGetBoundingClientRect) proto.getBoundingClientRect = originalGetBoundingClientRect;
    else delete proto.getBoundingClientRect;

    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete window.matchMedia;

    if (originalRequestAnimationFrame) window.requestAnimationFrame = originalRequestAnimationFrame;
    else delete window.requestAnimationFrame;

    if (originalCancelAnimationFrame) window.cancelAnimationFrame = originalCancelAnimationFrame;
    else delete window.cancelAnimationFrame;
  };
};

export const createMeasurementHarness = async (fixtureName, options = {}) => {
  const {
    pagination = true,
    patchDom = defaultMeasurementDomPatch,
    configureExtensions,
    editorOptions = {},
    measurementOptions = {},
  } = options;

  const { Editor, getStarterExtensions } = await vi.importActual('../engine/src/index.js');
  const { MeasurementEngine } = await vi.importActual('../engine/src/index.js');

  const restoreDom = typeof patchDom === 'function' ? patchDom() : defaultMeasurementDomPatch();

  const filePath = path.resolve(TEST_ROOT, fixtureName);
  const buffer = await readFile(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const file = new File([blob], fixtureName, { type: blob.type });
  const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(file);

  const mount = document.createElement('div');
  document.body.appendChild(mount);

  let extensions = getStarterExtensions();
  if (typeof configureExtensions === 'function') {
    extensions = configureExtensions(extensions);
  }

  const editor = new Editor({
    element: mount,
    extensions,
    content: docx,
    media,
    mediaFiles,
    fonts,
    mockDocument: document,
    mockWindow: window,
    pagination,
    isHeadless: true,
    isNewFile: true,
    ...editorOptions,
  });

  const engine = new MeasurementEngine({
    editor,
    element: null,
    onPageBreaksUpdate: () => {},
    ...measurementOptions,
  });

  const layout = engine.calculatePageBreaks(options.calculateOptions);
  const docContentSize = engine.measurementEditor?.state?.doc?.content?.size ?? null;

  const destroy = () => {
    engine?.measurementEditor?.destroy?.();
    editor?.destroy?.();
    if (mount.parentNode) {
      mount.parentNode.removeChild(mount);
    }
    if (typeof restoreDom === 'function') {
      restoreDom();
    }
    document.body.innerHTML = '';
  };

  return {
    editor,
    engine,
    layout,
    docContentSize,
    destroy,
  };
};
