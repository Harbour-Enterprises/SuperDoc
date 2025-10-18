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
  generatePageBreaks: vi.fn(defaultGeneratePageBreaksImplementation),
}));

vi.mock('./headers-footers/index.js', () => ({
  measureHeaderFooterSections: vi.fn(async () => createHeaderFooterSummary()),
  resolveHeaderFooterForPage: vi.fn(() => null),
}));

import { generatePageBreaks, normalizeInchesToPx } from './helpers/index.js';
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
      expect(instance.layoutPackage).toBe(layout);
      expect(instance.fieldSegments).toBe(fieldSegments);
      expect(instance.pageBreaks).toHaveLength(1);
      expect(instance.pageBreaks[0]).toBe(layout.pages[0]);
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
  });

  describe('destroy', () => {
    it('cleans up resources and removes internal measurement elements', async () => {
      const instance = await setupEngine();

      const measurementElement = instance.measurementElement;
      expect(measurementElement?.parentNode).toBe(document.body);

      const transactionHandler = editor.on.mock.calls.find(([event]) => event === 'transaction')?.[1];
      const createHandler = measurementEditorStub.on.mock.calls.find(([event]) => event === 'create')?.[1];

      instance.destroy();
      engine = null;

      expect(measurementEditorStub.destroy).toHaveBeenCalledTimes(1);
      expect(measurementElement?.parentNode).toBeNull();
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
});
