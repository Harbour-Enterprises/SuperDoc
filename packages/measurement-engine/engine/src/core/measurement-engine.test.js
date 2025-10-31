// @vitest-environment jsdom
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { EditorState } from 'prosemirror-state';
import * as constants from './constants.js';

let measurementEditorStub;
let engine;
let editor;
let doc;

function defaultGeneratePageBreaksImplementation(measurementEditor) {
  const hasView = Boolean(measurementEditor?.view?.dom);
  return {
    document: {},
    units: { unit: 'px', dpi: 96 },
    pages: hasView ? [{ break: { top: 24 } }] : [],
    fieldSegments: hasView ? [{ id: 'default-field' }] : [],
  };
}

function createHeaderFooterSummary() {
  return {
    sectionMetricsById: new Map(),
    variantLookup: {
      header: new Map(),
      footer: new Map(),
    },
    contentWidthPx: null,
    distancesPx: {
      header: 0,
      footer: 0,
    },
  };
}

vi.mock('./helpers/index.js', () => ({
  createMeasurementEditor: vi.fn(() => measurementEditorStub),
  normalizeInchesToPx: vi.fn((value) => value ?? null),
}));

vi.mock('../page-breaks/index.js', () => ({
  generatePageBreaks: vi.fn(defaultGeneratePageBreaksImplementation),
}));

vi.mock('./headers-footers/index.js', () => ({
  measureHeaderFooterSections: vi.fn(async () => createHeaderFooterSummary()),
  resolveHeaderFooterForPage: vi.fn(() => null),
}));

import { normalizeInchesToPx } from './helpers/index.js';
import { generatePageBreaks } from '../page-breaks/index.js';
import { measureHeaderFooterSections, resolveHeaderFooterForPage } from './headers-footers/index.js';
import { MeasurementEngine } from './measurement-engine.js';

const createDocStub = ({ id = Math.random().toString(36).slice(2), eq, toJSON } = {}) => {
  const docStub = {
    content: { size: 0 },
    toJSON:
      toJSON ??
      (() => ({
        type: 'doc',
        attrs: { id },
      })),
    eq: eq ?? ((other) => other === docStub),
    descendants: vi.fn(),
  };

  return docStub;
};

const createEditorStub = (sourceDoc, overrides = {}) => {
  const listeners = new Map();

  const editorStub = {
    options: { ...(overrides.options ?? {}) },
    state: { doc: sourceDoc },
    converter: { pageStyles: null, ...(overrides.converter ?? {}) },
    commands: { updatePagination: vi.fn(), ...(overrides.commands ?? {}) },
    on: vi.fn((event, handler) => {
      const handlers = listeners.get(event) ?? [];
      handlers.push(handler);
      listeners.set(event, handlers);
      return editorStub;
    }),
    off: vi.fn((event, handler) => {
      const handlers = listeners.get(event) ?? [];
      const filtered = handlers.filter((fn) => fn !== handler);
      listeners.set(event, filtered);
      return editorStub;
    }),
    emit: (event, payload) => {
      const handlers = listeners.get(event) ?? [];
      handlers.forEach((handler) => handler(payload));
    },
    listeners,
  };

  return editorStub;
};

const createMeasurementEditorStub = ({ measurementDoc, schema, element, appendToDom = true, overrides = {} } = {}) => {
  const targetElement = overrides.element ?? element ?? document.createElement('div');
  Object.defineProperty(targetElement, 'offsetWidth', { configurable: true, value: 816 });
  Object.defineProperty(targetElement, 'offsetHeight', { configurable: true, value: 1056 });
  targetElement.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    right: 816,
    bottom: 1056,
    width: 816,
    height: 1056,
  });

  if (appendToDom && !targetElement.parentNode) {
    document.body.appendChild(targetElement);
  }

  const listeners = new Map();
  const measurementState = {
    doc: measurementDoc ?? createDocStub(),
    schema: schema ?? {
      nodeFromJSON: vi.fn(() => measurementDoc ?? createDocStub()),
    },
    plugins: [],
  };

  let measurementEditor;

  const defaultView = {
    dom: targetElement,
    state: { doc: measurementState.doc },
    updateState: vi.fn((nextState) => {
      measurementEditor.state = nextState;
      defaultView.state = nextState;
    }),
  };

  measurementEditor = {
    on: vi.fn((event, handler) => {
      listeners.set(event, handler);
    }),
    off: vi.fn((event, handler) => {
      if (listeners.get(event) === handler) {
        listeners.delete(event);
      }
    }),
    emit: (event, ...args) => {
      listeners.get(event)?.(...args);
    },
    destroy: vi.fn(),
    element: targetElement,
    options: overrides.options ?? { element: targetElement },
    state: measurementState,
    view: overrides.hasOwnProperty('view') ? overrides.view : defaultView,
    listeners,
  };

  measurementEditor = Object.assign(measurementEditor, overrides);

  if (measurementEditor.view && !measurementEditor.view.updateState) {
    measurementEditor.view.updateState = vi.fn((nextState) => {
      measurementEditor.state = nextState;
      measurementEditor.view.state = nextState;
    });
  }

  return measurementEditor;
};

const setupEngine = async ({
  doc: docOverride,
  measurementDoc,
  measurementSchema,
  measurementOverrides,
  appendMeasurementElementToDom = true,
  externalElement = null,
  editorOverrides = {},
  pageStyles,
  onPageBreaksUpdate = vi.fn(),
  headerFooterRepository = null,
  skipAwaitReady = false,
} = {}) => {
  doc = docOverride ?? createDocStub();
  editor = createEditorStub(doc, editorOverrides);
  if (pageStyles) {
    editor.converter.pageStyles = pageStyles;
  }

  measurementEditorStub = createMeasurementEditorStub({
    measurementDoc: measurementDoc ?? doc,
    schema: measurementSchema,
    element: externalElement ?? undefined,
    appendToDom: appendMeasurementElementToDom,
    overrides: measurementOverrides,
  });

  const instance = new MeasurementEngine({
    editor,
    element: externalElement,
    onPageBreaksUpdate,
    headerFooterRepository,
  });

  if (!skipAwaitReady) {
    await instance.awaitReady();
  }

  engine = instance;
  return instance;
};

beforeEach(() => {
  measurementEditorStub = null;
  engine = null;
  editor = null;
  doc = null;
  vi.clearAllMocks();
  generatePageBreaks.mockImplementation(defaultGeneratePageBreaksImplementation);
  measureHeaderFooterSections.mockImplementation(async () => createHeaderFooterSummary());
  resolveHeaderFooterForPage.mockImplementation(() => null);
  normalizeInchesToPx.mockImplementation((value) => value ?? null);
});

afterEach(() => {
  engine?.destroy?.();
  engine = null;
  editor = null;
  doc = null;
  measurementEditorStub = null;
  document.body.innerHTML = '';
});

describe('MeasurementEngine', () => {
  describe('static accessors', () => {
    it('exposes measurement constants via static getters', () => {
      expect(MeasurementEngine.PIXELS_PER_INCH).toBe(constants.PIXELS_PER_INCH);
      expect(MeasurementEngine.CONTENT_HEIGHT_ALLOWANCE_INCHES).toBe(constants.CONTENT_HEIGHT_ALLOWANCE_INCHES);
      expect(MeasurementEngine.CONTENT_HEIGHT_ALLOWANCE_IN_PX).toBe(constants.CONTENT_HEIGHT_ALLOWANCE_IN_PX);
      expect(MeasurementEngine.DEFAULT_PAGE_HEIGHT_IN_PX).toBe(constants.DEFAULT_PAGE_HEIGHT_IN_PX);
      expect(MeasurementEngine.DEFAULT_PAGE_MARGINS_IN_PX).toBe(constants.DEFAULT_PAGE_MARGINS_IN_PX);
      expect(MeasurementEngine.BREAK_TOLERANCE_PX).toBe(constants.BREAK_TOLERANCE_PX);
      expect(MeasurementEngine.BINARY_BACKTRACK_STEPS).toBe(constants.BINARY_BACKTRACK_STEPS);
      expect(MeasurementEngine.PAGE_BREAK_SPACING_PX).toBe(constants.DEFAULT_PAGE_BREAK_GAP_PX);
    });
  });

  describe('initialization', () => {
    it('attaches to the host editor and triggers initial pagination', async () => {
      const onPageBreaksUpdate = vi.fn();
      const instance = await setupEngine({ onPageBreaksUpdate });

      expect(instance.isReady()).toBe(true);
      await expect(instance.awaitReady()).resolves.toBe(true);

      expect(editor.measurement).toBe(instance);
      expect(editor.commands.updatePagination).toHaveBeenCalledTimes(1);

      const layout = editor.commands.updatePagination.mock.calls[0][0];
      expect(layout).toBe(instance.layoutPackage);
      expect(instance.fieldSegments).toEqual(layout.fieldSegments);
      expect(instance.pageBreaks.every((page) => Number.isFinite(page?.break?.top))).toBe(true);
      expect(instance.getView()).toBe(measurementEditorStub.view);

      expect(measurementEditorStub.on).toHaveBeenCalledWith('create', expect.any(Function));
    });

    it('pulls measurement element from editor options when element is unset', async () => {
      const fallbackElement = document.createElement('div');
      document.body.appendChild(fallbackElement);

      const instance = await setupEngine({
        measurementOverrides: {
          element: null,
          options: { element: fallbackElement },
        },
      });

      expect(instance.measurementElement).toBe(fallbackElement);
    });

    it('normalizes converter page styles', async () => {
      const pageMargins = { top: 1 };
      const pageSize = { width: 8.5, height: 11 };
      const normalizedMargins = { top: 96 };
      const normalizedSize = { width: 816, height: 1056 };

      normalizeInchesToPx.mockImplementation((value) => {
        if (value === pageMargins) return normalizedMargins;
        if (value === pageSize) return normalizedSize;
        return value;
      });

      const instance = await setupEngine({
        editorOverrides: {
          converter: { pageStyles: { pageMargins, pageSize } },
        },
      });

      expect(instance.pageMargins).toBe(normalizedMargins);
      expect(instance.pageSize).toBe(normalizedSize);
      expect(normalizeInchesToPx).toHaveBeenCalledWith(pageMargins);
      expect(normalizeInchesToPx).toHaveBeenCalledWith(pageSize);
    });

    it('resolves immediately when the host editor is a header/footer surface', async () => {
      const instance = await setupEngine({
        editorOverrides: { options: { isHeaderOrFooter: true } },
      });

      expect(instance.isReady()).toBe(true);
      await expect(instance.awaitReady()).resolves.toBe(true);
      expect(generatePageBreaks).not.toHaveBeenCalled();
      expect(editor.on).not.toHaveBeenCalled();
      expect(instance.measurementEditor).toBeUndefined();
    });
  });

  describe('calculatePageBreaks', () => {
    it('stores derived layout metadata and resolves headers/footers', async () => {
      const instance = await setupEngine();

      const fieldSegments = [{ id: 'field-1' }, { id: 'field-2' }];
      const layout = {
        document: {},
        units: { unit: 'px', dpi: 96 },
        pages: [{ break: { top: 10 } }, { break: { top: Number.POSITIVE_INFINITY } }, { break: {} }],
        fieldSegments,
      };

      resolveHeaderFooterForPage.mockReturnValueOnce({ header: 'section-1' });
      generatePageBreaks.mockImplementation((_measurementEditor, params) => {
        const headerFooter = params.resolveHeaderFooter(2, { isLastPage: true });
        expect(headerFooter).toEqual({ header: 'section-1' });
        expect(resolveHeaderFooterForPage).toHaveBeenCalledWith({
          variantLookup: instance.headerFooterSummary.variantLookup,
          metricsById: instance.headerFooterSummary.sectionMetricsById,
          pageIndex: 2,
          isLastPage: true,
        });

        return layout;
      });

      const result = instance.calculatePageBreaks();

      expect(result).toBe(layout);
      expect(result.headerFooterSummary).toBe(instance.headerFooterSummary);
      expect(instance.layoutPackage).toBe(layout);
      expect(instance.fieldSegments).toBe(fieldSegments);
      expect(instance.pageBreaks).toHaveLength(1);
      expect(instance.pageBreaks[0]).toBe(layout.pages[0]);
      expect(Array.isArray(result.pages[0].spacingSegments || [])).toBe(true);
      expect(editor.commands.updatePagination).toHaveBeenCalledWith(layout);
    });

    it('returns an empty layout when the measurement view is unavailable', async () => {
      const instance = await setupEngine({
        measurementOverrides: { view: null },
        skipAwaitReady: true,
      });

      expect(instance.isReady()).toBe(false);
      generatePageBreaks.mockClear();

      const layout = instance.calculatePageBreaks();

      expect(layout.pages).toEqual([]);
      expect(instance.layoutPackage).toBe(layout);
      expect(instance.pageBreaks).toEqual([]);
      expect(instance.fieldSegments).toEqual([]);
      expect(editor.commands.updatePagination).toHaveBeenCalledWith(layout);
    });

    it('resets layout state when pagination returns nothing', async () => {
      const instance = await setupEngine();

      generatePageBreaks.mockClear();
      editor.commands.updatePagination.mockClear();

      instance.fieldSegments = [{ id: 'kept' }];
      instance.pageBreaks = [{ break: { top: 42 } }];

      generatePageBreaks.mockReturnValueOnce(null);

      const layout = instance.calculatePageBreaks();

      expect(layout).toBeNull();
      expect(instance.layoutPackage).toBeNull();
      expect(instance.fieldSegments).toEqual([]);
      expect(instance.pageBreaks).toEqual([]);
      expect(editor.commands.updatePagination).toHaveBeenCalledWith(null);
    });

    it('uses default page height when pageSize is not set', async () => {
      const instance = await setupEngine({
        editorOverrides: { converter: { pageStyles: {} } },
      });

      expect(generatePageBreaks).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pageHeightPx: MeasurementEngine.DEFAULT_PAGE_HEIGHT_IN_PX,
          pageWidthPx: null,
        }),
      );
    });

    it('creates baselineLayoutPackage using structuredClone when available', async () => {
      const instance = await setupEngine();

      expect(instance.baselineLayoutPackage).toBeDefined();
      expect(instance.baselineLayoutPackage).not.toBe(instance.layoutPackage);
      expect(JSON.stringify(instance.baselineLayoutPackage)).toBe(JSON.stringify(instance.layoutPackage));
    });

    it('falls back to JSON.parse/stringify when structuredClone unavailable', async () => {
      const originalStructuredClone = globalThis.structuredClone;
      globalThis.structuredClone = undefined;

      const instance = await setupEngine();

      expect(instance.baselineLayoutPackage).toBeDefined();
      expect(instance.baselineLayoutPackage).not.toBe(instance.layoutPackage);

      globalThis.structuredClone = originalStructuredClone;
    });

    it('handles structuredClone errors gracefully', async () => {
      const originalStructuredClone = globalThis.structuredClone;
      globalThis.structuredClone = () => {
        throw new Error('Clone failed');
      };

      const instance = await setupEngine();

      expect(instance.baselineLayoutPackage).toBeDefined();

      globalThis.structuredClone = originalStructuredClone;
    });

    it('handles JSON serialization errors in baseline cloning', async () => {
      const originalStructuredClone = globalThis.structuredClone;
      globalThis.structuredClone = undefined;

      const originalStringify = JSON.stringify;
      JSON.stringify = () => {
        throw new Error('Stringify failed');
      };

      const instance = await setupEngine();

      expect(instance.baselineLayoutPackage).toBeDefined();

      JSON.stringify = originalStringify;
      globalThis.structuredClone = originalStructuredClone;
    });

    it('filters pages with infinite breaks', async () => {
      const instance = await setupEngine();

      generatePageBreaks.mockClear();
      generatePageBreaks.mockReturnValueOnce({
        pages: [
          { break: { top: 100 } },
          { break: { top: Infinity } },
          { break: { top: 200 } },
          { break: { top: -Infinity } },
          { break: { top: NaN } },
        ],
        fieldSegments: [],
      });

      instance.calculatePageBreaks();

      expect(instance.pageBreaks).toHaveLength(2);
      expect(instance.pageBreaks[0].break.top).toBe(100);
      expect(instance.pageBreaks[1].break.top).toBe(200);
    });
  });

  describe('transaction syncing', () => {
    it('mirrors source document into the measurement editor when content changes', async () => {
      const hostDoc = createDocStub({
        toJSON: () => ({ type: 'doc', attrs: { id: 'host' } }),
      });
      const measurementDoc = createDocStub({
        eq: vi.fn(() => false),
      });
      const syncedDoc = createDocStub({
        toJSON: () => ({ type: 'doc', attrs: { id: 'synced' } }),
      });
      const schema = {
        nodeFromJSON: vi.fn(() => syncedDoc),
      };

      const createSpy = vi
        .spyOn(EditorState, 'create')
        .mockImplementation(({ doc: nextDoc, schema: nextSchema, plugins }) => ({
          doc: nextDoc,
          schema: nextSchema,
          plugins,
        }));

      const instance = await setupEngine({
        doc: hostDoc,
        measurementDoc,
        measurementSchema: schema,
      });

      measurementEditorStub.state.doc = measurementDoc;
      measurementEditorStub.view.state.doc = measurementDoc;

      generatePageBreaks.mockClear();
      measurementDoc.eq.mockClear();
      schema.nodeFromJSON.mockClear();
      createSpy.mockClear();
      measurementEditorStub.view.updateState.mockClear();
      editor.commands.updatePagination.mockClear();

      editor.emit('transaction', { transaction: { docChanged: true } });

      expect(measurementDoc.eq).toHaveBeenCalledWith(hostDoc);
      expect(schema.nodeFromJSON).toHaveBeenCalledWith(hostDoc.toJSON());
      expect(createSpy).toHaveBeenCalledTimes(1);

      const nextStateArg = measurementEditorStub.view.updateState.mock.calls[0][0];
      expect(nextStateArg.doc).toBe(syncedDoc);
      expect(nextStateArg.schema).toBe(instance.measurementEditor.state.schema);
      expect(nextStateArg.plugins).toBe(instance.measurementEditor.state.plugins);
      expect(instance.measurementEditor.state).toBe(nextStateArg);

      expect(generatePageBreaks).toHaveBeenCalledTimes(1);
      expect(editor.commands.updatePagination).toHaveBeenCalledTimes(1);

      createSpy.mockRestore();
    });

    it('skips pagination when doc hydration fails', async () => {
      const docJSON = { type: 'doc', attrs: { id: 'host' } };
      const hostDoc = createDocStub({
        toJSON: () => docJSON,
      });

      await setupEngine({
        doc: hostDoc,
      });

      const measurementDoc = createDocStub({
        eq: vi.fn(() => false),
      });
      measurementEditorStub.state.doc = measurementDoc;
      measurementEditorStub.view.state.doc = measurementDoc;

      const schema = measurementEditorStub.state.schema;

      generatePageBreaks.mockClear();
      measurementEditorStub.view.updateState.mockClear();
      editor.commands.updatePagination.mockClear();

      schema.nodeFromJSON.mockImplementation(() => {
        throw new Error('hydrate failure');
      });

      editor.emit('transaction', { transaction: { docChanged: true } });

      expect(measurementDoc.eq).toHaveBeenCalledWith(hostDoc);
      expect(schema.nodeFromJSON).toHaveBeenCalledWith(docJSON);
      expect(measurementEditorStub.view.updateState).not.toHaveBeenCalled();
      expect(generatePageBreaks).not.toHaveBeenCalled();
      expect(editor.commands.updatePagination).not.toHaveBeenCalled();
    });

    it('ignores transactions that do not change the document', async () => {
      await setupEngine();

      generatePageBreaks.mockClear();
      measurementEditorStub.view.updateState.mockClear();
      editor.commands.updatePagination.mockClear();

      editor.emit('transaction', { transaction: { docChanged: false } });

      expect(generatePageBreaks).not.toHaveBeenCalled();
      expect(measurementEditorStub.view.updateState).not.toHaveBeenCalled();
      expect(editor.commands.updatePagination).not.toHaveBeenCalled();
    });

    it('skips syncing when the measurement doc already matches the source', async () => {
      const hostDoc = createDocStub();
      const measurementDoc = createDocStub({
        eq: vi.fn((other) => other === hostDoc),
      });

      const createSpy = vi.spyOn(EditorState, 'create');

      await setupEngine({
        doc: hostDoc,
        measurementDoc,
      });

      generatePageBreaks.mockClear();
      measurementDoc.eq.mockClear();
      measurementEditorStub.view.updateState.mockClear();
      editor.commands.updatePagination.mockClear();

      editor.emit('transaction', { transaction: { docChanged: true } });

      expect(measurementDoc.eq).toHaveBeenCalledWith(hostDoc);
      expect(createSpy).not.toHaveBeenCalled();
      expect(measurementEditorStub.view.updateState).not.toHaveBeenCalled();
      expect(generatePageBreaks).not.toHaveBeenCalled();
      expect(editor.commands.updatePagination).not.toHaveBeenCalled();

      createSpy.mockRestore();
    });
  });

  describe('measurement editor lifecycle', () => {
    it('re-runs pagination when the measurement editor emits create', async () => {
      const instance = await setupEngine({
        measurementOverrides: { view: null },
        skipAwaitReady: true,
      });

      expect(instance.isReady()).toBe(false);
      const readyPromise = instance.awaitReady();

      const measurementView = {
        dom: measurementEditorStub.element,
        state: { doc },
        updateState: vi.fn(),
      };

      measurementEditorStub.view = measurementView;
      generatePageBreaks.mockClear();

      measurementEditorStub.emit('create');

      await expect(readyPromise).resolves.toBe(true);
      expect(instance.isReady()).toBe(true);
      expect(generatePageBreaks).toHaveBeenCalledTimes(1);
    });
  });

  describe('header and footer integration', () => {
    it('measures repositories during initialization and refresh', async () => {
      const repository = { id: 'repository' };
      const initialSummary = {
        sectionMetricsById: new Map([['section', { height: 32 }]]),
        variantLookup: {
          header: new Map([['0', 'section']]),
          footer: new Map(),
        },
        contentWidthPx: 600,
        distancesPx: { header: 12, footer: 20 },
      };
      measureHeaderFooterSections.mockResolvedValueOnce(initialSummary);

      const instance = await setupEngine({ headerFooterRepository: repository });

      expect(measureHeaderFooterSections).toHaveBeenCalledWith({
        editor,
        repository,
      });

      generatePageBreaks.mockClear();
      await instance.headerFooterPromise;

      expect(instance.getHeaderFooterSummary()).toBe(initialSummary);
      expect(generatePageBreaks).toHaveBeenCalledTimes(1);

      const refreshedSummary = {
        ...initialSummary,
        contentWidthPx: 640,
      };
      measureHeaderFooterSections.mockResolvedValueOnce(refreshedSummary);

      generatePageBreaks.mockClear();
      await instance.refreshHeaderFooterMeasurements();
      await instance.headerFooterPromise;

      expect(instance.getHeaderFooterSummary()).toBe(refreshedSummary);
      expect(generatePageBreaks).toHaveBeenCalledTimes(1);
    });

    it('is a no-op refreshing when no repository is configured', async () => {
      const instance = await setupEngine();

      generatePageBreaks.mockClear();
      await instance.refreshHeaderFooterMeasurements();

      expect(measureHeaderFooterSections).not.toHaveBeenCalled();
      expect(generatePageBreaks).not.toHaveBeenCalled();
    });

    it('handles errors in header/footer measurement gracefully', async () => {
      const repository = { id: 'repository' };
      measureHeaderFooterSections.mockRejectedValueOnce(new Error('Measurement failed'));

      const instance = await setupEngine({ headerFooterRepository: repository });

      await instance.headerFooterPromise;

      // Should still have default summary
      expect(instance.headerFooterSummary.sectionMetricsById).toBeInstanceOf(Map);
      expect(instance.headerFooterSummary.variantLookup).toBeDefined();
    });

    it('still triggers pagination after header/footer measurement error', async () => {
      const repository = { id: 'repository' };
      measureHeaderFooterSections.mockRejectedValueOnce(new Error('Measurement failed'));

      generatePageBreaks.mockClear();
      await setupEngine({ headerFooterRepository: repository });

      // Wait for header/footer promise to resolve/reject
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Pagination should still be called in finally block
      expect(generatePageBreaks).toHaveBeenCalled();
    });

    it('does not update summary when measurement returns null', async () => {
      const repository = { id: 'repository' };
      const originalSummary = createHeaderFooterSummary();
      measureHeaderFooterSections.mockResolvedValueOnce(null);

      const instance = await setupEngine({ headerFooterRepository: repository });

      await instance.headerFooterPromise;

      // Should keep the default summary structure
      expect(instance.headerFooterSummary.sectionMetricsById).toBeInstanceOf(Map);
    });
  });

  describe('applyLayoutOverride', () => {
    it('updates state and reuses the pagination command', async () => {
      const onPageBreaksUpdate = vi.fn();
      const instance = await setupEngine({ onPageBreaksUpdate });

      const layout = JSON.parse(JSON.stringify(instance.layoutPackage));
      layout.pages = Array.isArray(layout.pages) ? layout.pages : [];

      if (!layout.pages.length) {
        layout.pages.push({
          pageIndex: 0,
          break: { top: 100 },
          metrics: {
            pageHeightPx: 1056,
            pageWidthPx: 816,
            marginTopPx: 96,
            marginBottomPx: 96,
            marginLeftPx: 96,
            marginRightPx: 96,
            contentHeightPx: 864,
            contentWidthPx: 624,
            headerHeightPx: 96,
            footerHeightPx: 96,
            pageGapPx: 20,
          },
          headerFooterAreas: { header: null, footer: null },
          pageTopOffsetPx: 0,
          pageGapPx: 20,
        });
      }

      layout.pages[0].spacingAfterPx = 500;
      layout.fieldSegments = [{ id: 'field-override' }];

      editor.commands.updatePagination.mockClear();

      const result = instance.applyLayoutOverride(layout, { source: 'test-harness' });

      expect(result).toBe(layout);
      expect(instance.layoutPackage).toBe(layout);
      expect(instance.fieldSegments).toEqual([{ id: 'field-override' }]);
      expect(instance.pageBreaks).toEqual(layout.pages.filter((page) => Number.isFinite(page?.break?.top)));
      expect(editor.commands.updatePagination).toHaveBeenCalledTimes(1);
      expect(editor.commands.updatePagination).toHaveBeenCalledWith(layout);
      expect(onPageBreaksUpdate).toHaveBeenCalledWith(layout);
    });

    it('returns null when layout is null', async () => {
      const instance = await setupEngine();

      const result = instance.applyLayoutOverride(null);

      expect(result).toBeNull();
    });

    it('returns null when layout is not an object', async () => {
      const instance = await setupEngine();

      expect(instance.applyLayoutOverride('invalid')).toBeNull();
      expect(instance.applyLayoutOverride(123)).toBeNull();
      expect(instance.applyLayoutOverride(undefined)).toBeNull();
    });

    it('preserves existing headerFooterSummary when layout does not provide one', async () => {
      const instance = await setupEngine();
      const originalSummary = instance.headerFooterSummary;

      const layout = {
        pages: [{ break: { top: 100 } }],
        fieldSegments: [],
      };

      const result = instance.applyLayoutOverride(layout);

      expect(result.headerFooterSummary).toBe(originalSummary);
      expect(instance.headerFooterSummary).toBe(originalSummary);
    });

    it('updates headerFooterSummary when layout provides one', async () => {
      const instance = await setupEngine();

      const newSummary = {
        sectionMetricsById: new Map([['section-1', { height: 50 }]]),
        variantLookup: { header: new Map(), footer: new Map() },
        contentWidthPx: 700,
        distancesPx: { header: 10, footer: 10 },
      };

      const layout = {
        pages: [{ break: { top: 100 } }],
        fieldSegments: [],
        headerFooterSummary: newSummary,
      };

      const result = instance.applyLayoutOverride(layout);

      expect(instance.headerFooterSummary).toBe(newSummary);
      expect(result.headerFooterSummary).toBe(newSummary);
    });

    it('emits page-breaks-updated event when emit function exists', async () => {
      const instance = await setupEngine();
      instance.emit = vi.fn();

      const layout = {
        pages: [{ break: { top: 100 } }],
        fieldSegments: [],
      };

      instance.applyLayoutOverride(layout, { source: 'custom-source' });

      expect(instance.emit).toHaveBeenCalledWith('page-breaks-updated', {
        layout,
        source: 'custom-source',
      });
    });

    it('handles emit errors gracefully', async () => {
      const instance = await setupEngine();
      instance.emit = vi.fn(() => {
        throw new Error('Emit failed');
      });

      const layout = {
        pages: [{ break: { top: 100 } }],
        fieldSegments: [],
      };

      expect(() => instance.applyLayoutOverride(layout)).not.toThrow();
    });

    it('handles missing editor.commands.updatePagination gracefully', async () => {
      const instance = await setupEngine({
        editorOverrides: { commands: {} },
      });

      const layout = {
        pages: [{ break: { top: 100 } }],
        fieldSegments: [],
      };

      expect(() => instance.applyLayoutOverride(layout)).not.toThrow();
    });

    it('does not overwrite baselineLayoutPackage', async () => {
      const instance = await setupEngine();
      const originalBaseline = instance.baselineLayoutPackage;

      const layout = {
        pages: [{ break: { top: 200 } }],
        fieldSegments: [],
      };

      instance.applyLayoutOverride(layout);

      // Baseline should remain unchanged
      expect(instance.baselineLayoutPackage).toBe(originalBaseline);
      expect(instance.layoutPackage).toBe(layout);
    });
  });

  describe('destroy', () => {
    it('cleans up resources and removes internal measurement elements', async () => {
      const instance = await setupEngine();
      const offSpy = vi.fn();
      instance.off = offSpy;

      const measurementElement = instance.measurementElement;
      expect(measurementElement?.parentNode).toBe(document.body);

      const transactionHandler = editor.on.mock.calls.find(([event]) => event === 'transaction')?.[1];
      const createHandler = measurementEditorStub.on.mock.calls.find(([event]) => event === 'create')?.[1];

      instance.destroy();
      engine = null;

      expect(measurementEditorStub.destroy).toHaveBeenCalledTimes(1);
      expect(measurementElement?.parentNode).toBeNull();
      expect(offSpy).toHaveBeenCalledWith('page-breaks-updated', instance.config.onPageBreaksUpdate);
      expect(editor.off).toHaveBeenCalledWith('transaction', transactionHandler);
      expect(measurementEditorStub.off).toHaveBeenCalledWith('create', createHandler);
      expect(instance.measurementEditor).toBeNull();
      expect(instance.fieldSegments).toEqual([]);
      expect(instance.pageBreaks).toEqual([]);
      expect(instance.layoutPackage).toBeNull();
      expect(editor.measurement).toBeUndefined();

      measurementEditorStub.destroy.mockClear();
      instance.destroy();
      expect(measurementEditorStub.destroy).not.toHaveBeenCalled();
    });

    it('retains external measurement elements during teardown', async () => {
      const externalElement = document.createElement('div');
      document.body.appendChild(externalElement);

      const instance = await setupEngine({
        externalElement,
        measurementOverrides: { element: externalElement },
      });

      instance.destroy();
      engine = null;

      expect(externalElement.parentNode).toBe(document.body);
    });

    it('resolves readiness promise as false when destroyed before ready', async () => {
      const instance = await setupEngine({
        measurementOverrides: { view: null },
        skipAwaitReady: true,
      });

      const readyPromise = instance.awaitReady();
      instance.destroy();
      engine = null;

      await expect(readyPromise).resolves.toBe(false);
    });

    it('handles errors when removing page-breaks-updated listener', async () => {
      const instance = await setupEngine();
      instance.off = vi.fn(() => {
        throw new Error('Off failed');
      });

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });

    it('handles errors when removing transaction listener', async () => {
      const instance = await setupEngine();
      editor.off = vi.fn(() => {
        throw new Error('Off failed');
      });

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });

    it('handles errors when removing create listener', async () => {
      const instance = await setupEngine();
      measurementEditorStub.off = vi.fn(() => {
        throw new Error('Off failed');
      });

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });

    it('handles errors when destroying measurement editor', async () => {
      const instance = await setupEngine();
      measurementEditorStub.destroy = vi.fn(() => {
        throw new Error('Destroy failed');
      });

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });

    it('handles missing editor.off gracefully', async () => {
      const instance = await setupEngine();
      delete editor.off;

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });

    it('handles missing measurementEditor.off gracefully', async () => {
      const instance = await setupEngine();
      delete measurementEditorStub.off;

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });

    it('handles missing measurementEditor.destroy gracefully', async () => {
      const instance = await setupEngine();
      delete measurementEditorStub.destroy;

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });
  });

  describe('accessors', () => {
    it('returns the live measurement view when available', async () => {
      const instance = await setupEngine();

      expect(instance.getView()).toBe(measurementEditorStub.view);
    });

    it('returns null view when the measurement editor is missing', async () => {
      const instance = await setupEngine({
        measurementOverrides: { view: null },
        skipAwaitReady: true,
      });

      expect(instance.getView()).toBeNull();
    });
  });

  describe('edge cases and configuration', () => {
    it('initializes with minimal config', async () => {
      const minimalEditor = createEditorStub(createDocStub());
      const instance = new MeasurementEngine({ editor: minimalEditor });

      expect(instance.config.editor).toBe(minimalEditor);
      expect(instance.config.element).toBeNull();
      expect(typeof instance.config.onPageBreaksUpdate).toBe('function');
      expect(instance.config.headerFooterRepository).toBeNull();

      instance.destroy();
    });

    it('handles null editor in config', () => {
      const instance = new MeasurementEngine({ editor: null });

      expect(instance.editor).toBeNull();
      expect(instance.measurementEditor).toBeUndefined();

      instance.destroy();
    });

    it('does not set editor.measurement when editor is null', () => {
      const instance = new MeasurementEngine({ editor: null });

      expect(instance.editor).toBeNull();

      instance.destroy();
    });

    it('does not crash when editor.measurement does not exist during destroy', async () => {
      const instance = await setupEngine();
      delete editor.measurement;

      expect(() => instance.destroy()).not.toThrow();
      engine = null;
    });

    it('handles missing converter.pageStyles', async () => {
      const instance = await setupEngine({
        editorOverrides: { converter: {} },
      });

      expect(instance.pageMargins).toBeNull();
      expect(instance.pageSize).toBeNull();
    });

    it('handles missing converter entirely', async () => {
      const instance = await setupEngine({
        editorOverrides: { converter: null },
      });

      expect(() => instance.calculatePageBreaks()).not.toThrow();
    });

    it('handles transaction with missing transaction object', async () => {
      const instance = await setupEngine();

      generatePageBreaks.mockClear();

      // Emit event with null transaction
      editor.emit('transaction', {});

      expect(generatePageBreaks).not.toHaveBeenCalled();
    });

    it('does not register event listeners when editor is header/footer', async () => {
      const instance = await setupEngine({
        editorOverrides: { options: { isHeaderOrFooter: true } },
      });

      // Should not have registered transaction listener
      expect(editor.on).not.toHaveBeenCalled();
    });

    it('handles missing state when syncing', async () => {
      const instance = await setupEngine();

      // Set editor state to null
      instance.editor.state = null;

      generatePageBreaks.mockClear();
      editor.emit('transaction', { transaction: { docChanged: true } });

      expect(generatePageBreaks).not.toHaveBeenCalled();
    });

    it('handles missing schema when syncing', async () => {
      const instance = await setupEngine();

      const noSchemaMeasurementState = {
        doc: createDocStub({ eq: () => false }),
        schema: null,
        plugins: [],
      };

      measurementEditorStub.state = noSchemaMeasurementState;

      generatePageBreaks.mockClear();

      // Should fail gracefully
      editor.emit('transaction', { transaction: { docChanged: true } });

      expect(generatePageBreaks).not.toHaveBeenCalled();
    });
  });
});
