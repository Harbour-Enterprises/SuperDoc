import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncPageViewLayer, clearPageViewLayer } from './page-view-layer.js';

describe('page-view-layer helpers', () => {
  let root;
  let host;
  let viewWrapper;
  let viewDom;
  let storage;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    host = document.createElement('div');
    root.appendChild(host);
    viewWrapper = document.createElement('div');
    host.appendChild(viewWrapper);
    viewDom = document.createElement('div');
    viewWrapper.appendChild(viewDom);
    storage = {};
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  it('returns zero when editor or storage is missing', () => {
    expect(syncPageViewLayer({ editor: null, storage: null, engine: null })).toBe(0);
    expect(syncPageViewLayer({ editor: { view: null }, storage: null, engine: null })).toBe(0);
  });

  it('creates and updates page view elements based on engine metrics', () => {
    const editor = {
      view: { dom: viewDom },
      options: { element: host },
    };

    const engine = {
      layoutPackage: {
        pages: [
          {
            break: { startOffsetPx: 0 },
            metrics: { pageHeightPx: 811.2, pageWidthPx: 612.4 },
          },
          {
            break: { startOffsetPx: 1604.9 },
            metrics: {},
          },
        ],
      },
      pageSize: { height: 820.5, width: 598.7 },
    };

    const elementCount = syncPageViewLayer({ editor, storage, engine });
    expect(elementCount).toBe(2);

    const layer = storage.pageViewContainer;
    expect(layer).toBeTruthy();
    expect(layer.parentNode).toBe(host);
    expect(host.firstChild).toBe(layer);

    const [first, second] = storage.pageViewElements;
    expect(first.dataset.paginationPage).toBe('0');
    expect(first.style.top).toBe('0px');
    expect(first.style.height).toBe('811px');
    expect(first.style.width).toBe('612px');

    expect(second.dataset.paginationPage).toBe('1');
    expect(second.style.top).toBe('1605px');
    expect(second.style.height).toBe('821px');
    expect(second.style.width).toBe('599px');

    const clearedCount = syncPageViewLayer({ editor, storage, engine: {} });
    expect(clearedCount).toBe(0);
    expect(storage.pageViewContainer).toBeNull();
    expect(storage.pageViewElements).toEqual([]);
    expect(host.querySelector('.super-editor-page-view-layer')).toBeNull();
  });

  it('clears existing elements when instructed', () => {
    const editor = {
      view: { dom: viewDom },
      options: { element: host },
    };
    const engine = {
      layoutPackage: {
        pages: [
          {
            break: { startOffsetPx: 0 },
            metrics: { pageHeightPx: 800, pageWidthPx: 600 },
          },
        ],
      },
    };

    syncPageViewLayer({ editor, storage, engine });
    expect(storage.pageViewElements.length).toBe(1);

    clearPageViewLayer(storage);
    expect(storage.pageViewElements).toEqual([]);
    expect(storage.pageViewContainer).toBeNull();
    expect(host.querySelector('.super-editor-page-view-layer')).toBeNull();
  });
});
