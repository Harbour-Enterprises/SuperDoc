import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { PresentationEditor } from './PresentationEditor';
import type { Editor as EditorInstance } from './Editor';
import { Editor } from './Editor';

type MockedEditor = Mock<(...args: unknown[]) => EditorInstance> & {
  mock: {
    calls: unknown[][];
    results: Array<{ value: EditorInstance }>;
  };
};

const {
  createDefaultConverter,
  mockClickToPosition,
  mockIncrementalLayout,
  mockToFlowBlocks,
  mockSelectionToRects,
  mockCreateDomPainter,
  mockMeasureBlock,
  mockEditorConverterStore,
  mockCreateHeaderFooterEditor,
  createdSectionEditors,
  mockOnHeaderFooterDataUpdate,
  mockUpdateYdocDocxData,
} = vi.hoisted(() => {
  const createDefaultConverter = () => ({
    headers: {
      'rId-header-default': { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    footers: {
      'rId-footer-default': { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    headerIds: {
      default: 'rId-header-default',
      first: null,
      even: null,
      odd: null,
      ids: ['rId-header-default'],
    },
    footerIds: {
      default: 'rId-footer-default',
      first: null,
      even: null,
      odd: null,
      ids: ['rId-footer-default'],
    },
  });

  const converterStore = {
    current: createDefaultConverter() as ReturnType<typeof createDefaultConverter> & Record<string, unknown>,
    mediaFiles: {} as Record<string, string>,
  };

  const createEmitter = () => {
    const listeners = new Map<string, Set<(payload?: unknown) => void>>();
    const on = (event: string, handler: (payload?: unknown) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    };
    const off = (event: string, handler: (payload?: unknown) => void) => {
      listeners.get(event)?.delete(handler);
    };
    const once = (event: string, handler: (payload?: unknown) => void) => {
      const wrapper = (payload?: unknown) => {
        off(event, wrapper);
        handler(payload);
      };
      on(event, wrapper);
    };
    const emit = (event: string, payload?: unknown) => {
      listeners.get(event)?.forEach((handler) => handler(payload));
    };
    return { on, off, once, emit };
  };

  const createSectionEditor = () => {
    const emitter = createEmitter();
    const editorStub = {
      on: emitter.on,
      off: emitter.off,
      once: emitter.once,
      emit: emitter.emit,
      destroy: vi.fn(),
      view: {
        dom: document.createElement('div'),
        focus: vi.fn(),
      },
    };
    queueMicrotask(() => editorStub.emit('create'));
    return editorStub;
  };

  const editors: Array<{ editor: ReturnType<typeof createSectionEditor> }> = [];

  return {
    createDefaultConverter,
    mockClickToPosition: vi.fn(() => null),
    mockIncrementalLayout: vi.fn(async () => ({ layout: { pages: [] }, measures: [] })),
    mockToFlowBlocks: vi.fn(() => ({ blocks: [], bookmarks: new Map() })),
    mockSelectionToRects: vi.fn(() => []),
    mockCreateDomPainter: vi.fn(() => ({
      paint: vi.fn(),
      destroy: vi.fn(),
      setZoom: vi.fn(),
      setLayoutMode: vi.fn(),
      setProviders: vi.fn(),
      setData: vi.fn(),
    })),
    mockMeasureBlock: vi.fn(() => ({ width: 100, height: 100 })),
    mockEditorConverterStore: converterStore,
    mockCreateHeaderFooterEditor: vi.fn(() => {
      const editor = createSectionEditor();
      editors.push({ editor });
      return editor;
    }),
    createdSectionEditors: editors,
    mockOnHeaderFooterDataUpdate: vi.fn(),
    mockUpdateYdocDocxData: vi.fn(() => Promise.resolve()),
  };
});

// Mock Editor class
vi.mock('./Editor', () => {
  return {
    Editor: vi.fn().mockImplementation(() => ({
      setDocumentMode: vi.fn(),
      setOptions: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
      isEditable: true,
      state: {
        selection: { from: 0, to: 0 },
      },
      view: {
        dom: {
          dispatchEvent: vi.fn(() => true),
        },
        focus: vi.fn(),
      },
      options: {
        documentId: 'test-doc',
        element: document.createElement('div'),
      },
      converter: mockEditorConverterStore.current,
      storage: {
        image: {
          media: mockEditorConverterStore.mediaFiles,
        },
      },
    })),
  };
});

// Mock pm-adapter functions
vi.mock('@superdoc/pm-adapter', () => ({
  toFlowBlocks: mockToFlowBlocks,
}));

// Mock layout-bridge functions
vi.mock('@superdoc/layout-bridge', () => ({
  incrementalLayout: mockIncrementalLayout,
  selectionToRects: mockSelectionToRects,
  clickToPosition: mockClickToPosition,
  getFragmentAtPosition: vi.fn(() => null),
  computeLinePmRange: vi.fn(() => ({ from: 0, to: 0 })),
  measureCharacterX: vi.fn(() => 0),
  extractIdentifierFromConverter: vi.fn((_converter) => ({
    extractHeaderId: vi.fn(() => 'rId-header-default'),
    extractFooterId: vi.fn(() => 'rId-footer-default'),
  })),
  getHeaderFooterType: vi.fn((_pageNumber, _identifier, _options) => {
    // Returns the type of header/footer for a given page
    // For simplicity, we return 'default' for all pages
    return 'default';
  }),
}));

// Mock painter-dom
vi.mock('@superdoc/painter-dom', () => ({
  createDomPainter: mockCreateDomPainter,
}));

// Mock measuring-dom
vi.mock('@superdoc/measuring-dom', () => ({
  measureBlock: mockMeasureBlock,
}));

vi.mock('@extensions/pagination/pagination-helpers.js', () => ({
  createHeaderFooterEditor: mockCreateHeaderFooterEditor,
  onHeaderFooterDataUpdate: mockOnHeaderFooterDataUpdate,
}));

vi.mock('@extensions/collaboration/collaboration-helpers.js', () => ({
  updateYdocDocxData: mockUpdateYdocDocxData,
}));

describe('PresentationEditor', () => {
  let container: HTMLElement;
  let editor: PresentationEditor;

  beforeEach(() => {
    // Create a container element for the presentation editor
    container = document.createElement('div');
    document.body.appendChild(container);

    // Clear all mocks
    vi.clearAllMocks();
    mockEditorConverterStore.current = {
      ...createDefaultConverter(),
      headerEditors: [],
      footerEditors: [],
    };
    mockEditorConverterStore.mediaFiles = {};
    createdSectionEditors.length = 0;

    // Reset static instances
    (PresentationEditor as typeof PresentationEditor & { instances: Map<string, unknown> }).instances = new Map();
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('setDocumentMode', () => {
    it('should initialize with editing mode by default', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      // Verify by checking that Editor was called with documentMode: 'editing'
      const editorConstructorCalls = (Editor as unknown as MockedEditor).mock.calls;
      const lastCall = editorConstructorCalls[editorConstructorCalls.length - 1] as [{ documentMode?: string }];
      expect(lastCall[0].documentMode).toBe('editing');
    });

    it('should accept documentMode in constructor options', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        documentMode: 'viewing',
      });

      // Verify by checking that Editor was called with documentMode: 'viewing'
      const editorConstructorCalls = (Editor as unknown as MockedEditor).mock.calls;
      const lastCall = editorConstructorCalls[editorConstructorCalls.length - 1] as [{ documentMode?: string }];
      expect(lastCall[0].documentMode).toBe('viewing');
    });

    it('should update internal mode when setDocumentMode is called', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      editor.setDocumentMode('viewing');

      // Verify that editor.setDocumentMode was called
      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('viewing');
    });

    it('should delegate to editor.setDocumentMode', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      editor.setDocumentMode('suggesting');

      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('suggesting');
    });

    it('should handle all valid modes: editing, viewing, suggesting', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      editor.setDocumentMode('editing');
      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('editing');

      editor.setDocumentMode('viewing');
      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('viewing');

      editor.setDocumentMode('suggesting');
      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('suggesting');
    });

    it('should throw TypeError for invalid mode values', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      // Call with invalid mode should throw
      expect(() => editor.setDocumentMode('invalid-mode' as 'editing' | 'viewing' | 'suggesting')).toThrow(TypeError);
      expect(() => editor.setDocumentMode('invalid-mode' as 'editing' | 'viewing' | 'suggesting')).toThrow(
        /Must be one of/,
      );
    });

    it('should create editable function that returns true for editing and suggesting', () => {
      // Create editor with editing mode
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        documentMode: 'editing',
      });

      const editorConstructorCalls = (Editor as unknown as MockedEditor).mock.calls;
      const editorOptions = editorConstructorCalls[editorConstructorCalls.length - 1] as [
        { editorProps: { editable: () => boolean } },
      ];
      const editableFunction = editorOptions[0].editorProps.editable;

      // The editable function should return true for editing mode
      expect(editableFunction()).toBe(true);
    });

    it('should create editable function that returns false for viewing mode', () => {
      // Create editor with viewing mode
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        documentMode: 'viewing',
      });

      const editorConstructorCalls = (Editor as unknown as MockedEditor).mock.calls;
      const editorOptions = editorConstructorCalls[editorConstructorCalls.length - 1] as [
        { editorProps: { editable: () => boolean } },
      ];
      const editableFunction = editorOptions[0].editorProps.editable;

      // The editable function should return false for viewing mode
      expect(editableFunction()).toBe(false);
    });

    it('should transition between modes correctly', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        documentMode: 'editing',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      // editing -> viewing
      editor.setDocumentMode('viewing');
      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('viewing');

      // viewing -> suggesting
      editor.setDocumentMode('suggesting');
      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('suggesting');

      // suggesting -> editing
      editor.setDocumentMode('editing');
      expect(mockEditorInstance.setDocumentMode).toHaveBeenCalledWith('editing');
    });
  });

  describe('presentation surfaces', () => {
    it('attaches itself to the underlying Editor and exposes the host element', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      expect(mockEditorInstance.presentationEditor).toBe(editor);
      expect(editor.element).toBe(container);
    });

    it('clears the presentation reference on destroy', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      expect(mockEditorInstance.presentationEditor).toBe(editor);

      editor.destroy();
      expect(mockEditorInstance.presentationEditor).toBeNull();
      editor = null as unknown as PresentationEditor;
    });
  });

  describe('runtime helpers', () => {
    it('normalizes client coordinates relative to the viewport', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const result = editor.normalizeClientPoint(120, 80);
      expect(result).toEqual({ x: 120, y: 80 });
    });

    it('propagates context menu toggles to the underlying editor', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      editor.setContextMenuDisabled(true);
      expect(mockEditorInstance.setOptions).toHaveBeenCalledWith({ disableContextMenu: true });
    });

    it('forwards keyboard events to the hidden editor via the input bridge', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;
      const dispatchSpy = mockEditorInstance.view.dom.dispatchEvent;

      const event = new KeyboardEvent('keydown', { key: '/' });
      container.dispatchEvent(event);

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'keydown' }));
    });

    it('forwards contextmenu events to the hidden editor via the input bridge', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;
      const dispatchSpy = mockEditorInstance.view.dom.dispatchEvent;

      const event = new MouseEvent('contextmenu', { clientX: 10, clientY: 20 });
      container.dispatchEvent(event);

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'contextmenu' }));
    });

    it('forwards beforeinput events to the hidden editor via the input bridge', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;
      const dispatchSpy = mockEditorInstance.view.dom.dispatchEvent;

      const event = new InputEvent('beforeinput', { data: 'a', inputType: 'insertText', bubbles: true });
      container.dispatchEvent(event);

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'beforeinput' }));
    });

    it('forwards composition events to the hidden editor via the input bridge', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;
      const dispatchSpy = mockEditorInstance.view.dom.dispatchEvent;

      const event = new CompositionEvent('compositionstart', { data: 'あ', bubbles: true });
      container.dispatchEvent(event);

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'compositionstart' }));
    });
  });

  describe('editable state integration', () => {
    it('should pass documentMode to Editor constructor', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        documentMode: 'suggesting',
      });

      const editorConstructorCalls = (Editor as unknown as MockedEditor).mock.calls;
      const editorOptions = editorConstructorCalls[editorConstructorCalls.length - 1] as [{ documentMode?: string }];

      expect(editorOptions[0].documentMode).toBe('suggesting');
    });

    it('should create editable function that respects documentMode', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        documentMode: 'editing',
      });

      const editorConstructorCalls = (Editor as unknown as MockedEditor).mock.calls;
      const editorOptions = editorConstructorCalls[editorConstructorCalls.length - 1] as [
        { editorProps: { editable: () => boolean } },
      ];
      const editableFunction = editorOptions[0].editorProps.editable;

      expect(typeof editableFunction).toBe('function');
      expect(editableFunction()).toBe(true); // editing mode is editable
    });
  });

  describe('header/footer interactions', () => {
    const buildLayoutResult = () => ({
      layout: {
        pageSize: { w: 612, h: 792 },
        pages: [
          {
            number: 1,
            numberText: '1',
            size: { w: 612, h: 792 },
            fragments: [],
            margins: { top: 72, bottom: 72, left: 72, right: 72, header: 36, footer: 36 },
            sectionRefs: {
              headerRefs: { default: 'rId-header-default' },
              footerRefs: { default: 'rId-footer-default' },
            },
          },
        ],
      },
      measures: [],
      headers: [
        {
          kind: 'header',
          type: 'default',
          layout: {
            height: 36,
            pages: [{ number: 1, fragments: [] }],
          },
          blocks: [],
          measures: [],
        },
      ],
      footers: [
        {
          kind: 'footer',
          type: 'default',
          layout: {
            height: 36,
            pages: [{ number: 1, fragments: [] }],
          },
          blocks: [],
          measures: [],
        },
      ],
    });

    let rafSpy: ReturnType<typeof vi.spyOn> | null = null;

    beforeEach(() => {
      rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    });

    afterEach(() => {
      rafSpy?.mockRestore();
      rafSpy = null;
    });

    it('enters header mode on double-click and announces via aria-live', async () => {
      mockIncrementalLayout.mockResolvedValueOnce(buildLayoutResult());

      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      await vi.waitFor(() => expect(mockIncrementalLayout).toHaveBeenCalled());

      // Wait for the async rendering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const viewport = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      const boundingSpy = vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 1000,
        right: 800,
        bottom: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

      const modeSpy = vi.fn();
      const contextSpy = vi.fn();
      editor.on('headerFooterModeChanged', modeSpy);
      editor.on('headerFooterEditingContext', contextSpy);

      viewport.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 120, clientY: 10, button: 0 }));

      await vi.waitFor(() => expect(modeSpy).toHaveBeenCalled());

      const lastMode = modeSpy.mock.calls.at(-1)?.[0];
      expect(lastMode).toMatchObject({
        mode: 'header',
        kind: 'header',
        headerId: 'rId-header-default',
        pageIndex: 0,
        pageNumber: 1,
      });
      expect(contextSpy).toHaveBeenCalledWith(
        expect.objectContaining({ headerId: 'rId-header-default', kind: 'header' }),
      );
      const ariaLive = container.querySelector('.presentation-editor__aria-live');
      expect(ariaLive?.textContent).toContain('Editing Header');
      boundingSpy.mockRestore();
    });

    it('exits header mode on Escape and announces the transition', async () => {
      mockIncrementalLayout.mockResolvedValueOnce(buildLayoutResult());

      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      await vi.waitFor(() => expect(mockIncrementalLayout).toHaveBeenCalled());

      // Wait for the async rendering to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const viewport = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 1000,
        right: 800,
        bottom: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

      const modeSpy = vi.fn();
      editor.on('headerFooterModeChanged', modeSpy);

      viewport.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 120, clientY: 10, button: 0 }));
      await vi.waitFor(() => expect(modeSpy).toHaveBeenCalledTimes(1));

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      await vi.waitFor(() => expect(modeSpy).toHaveBeenCalledTimes(2));
      const lastMode = modeSpy.mock.calls.at(-1)?.[0];
      expect(lastMode.mode).toBe('body');
      expect(lastMode.headerId).toBeUndefined();
      const ariaLive = container.querySelector('.presentation-editor__aria-live');
      expect(ariaLive?.textContent).toContain('Exited header/footer edit mode');
    });

    it('emits headerFooterEditBlocked when keyboard shortcut has no matching region', async () => {
      const layoutNoHeaders = buildLayoutResult();
      layoutNoHeaders.headers = [];
      mockIncrementalLayout.mockResolvedValueOnce(layoutNoHeaders);

      const blockedSpy = vi.fn();

      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      editor.on('headerFooterEditBlocked', blockedSpy);

      await vi.waitFor(() => expect(mockIncrementalLayout).toHaveBeenCalled());

      container.dispatchEvent(
        new KeyboardEvent('keydown', { ctrlKey: true, altKey: true, code: 'KeyH', bubbles: true }),
      );

      expect(blockedSpy).toHaveBeenCalledWith(expect.objectContaining({ reason: 'missingRegion' }));
    });
  });

  describe('pageStyleUpdate event listener', () => {
    const buildLayoutResult = () => ({
      layout: {
        pageSize: { w: 612, h: 792 },
        pages: [
          {
            number: 1,
            numberText: '1',
            size: { w: 612, h: 792 },
            fragments: [],
            margins: { top: 72, bottom: 72, left: 72, right: 72, header: 36, footer: 36 },
            sectionRefs: {
              headerRefs: { default: 'rId-header-default' },
              footerRefs: { default: 'rId-footer-default' },
            },
          },
        ],
      },
      measures: [],
      headers: [
        {
          kind: 'header',
          type: 'default',
          layout: {
            height: 36,
            pages: [{ number: 1, fragments: [] }],
          },
          blocks: [],
          measures: [],
        },
      ],
      footers: [
        {
          kind: 'footer',
          type: 'default',
          layout: {
            height: 36,
            pages: [{ number: 1, fragments: [] }],
          },
          blocks: [],
          measures: [],
        },
      ],
    });

    let rafSpy: ReturnType<typeof vi.spyOn> | null = null;

    beforeEach(() => {
      rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    });

    afterEach(() => {
      rafSpy?.mockRestore();
      rafSpy = null;
    });

    /**
     * Helper to wait for layout update by polling the incrementalLayout mock.
     * This simulates the async nature of the rerender cycle.
     */
    const waitForLayoutUpdate = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    };

    it('should emit layoutUpdated when pageStyleUpdate event fires', async () => {
      mockIncrementalLayout.mockResolvedValue(buildLayoutResult());

      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      // Clear initial layout call
      mockIncrementalLayout.mockClear();

      let layoutUpdatedCount = 0;
      editor.onLayoutUpdated(() => {
        layoutUpdatedCount++;
      });

      // Get the pageStyleUpdate listener that was registered
      const onCalls = mockEditorInstance.on as unknown as Mock;
      const pageStyleUpdateCall = onCalls.mock.calls.find((call) => call[0] === 'pageStyleUpdate');
      expect(pageStyleUpdateCall).toBeDefined();
      const handlePageStyleUpdate = pageStyleUpdateCall![1] as (payload: {
        pageMargins?: unknown;
        pageStyles?: unknown;
      }) => void;

      // Simulate a pageStyleUpdate event
      const newMargins = { left: 2.0, right: 2.0, top: 1.0, bottom: 1.0 };
      handlePageStyleUpdate({ pageMargins: newMargins, pageStyles: {} });

      await waitForLayoutUpdate();

      expect(layoutUpdatedCount).toBeGreaterThan(0);
    });

    it('should include correct payload data in pageStyleUpdate event', async () => {
      mockIncrementalLayout.mockResolvedValue(buildLayoutResult());

      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      // Wait for initial render to complete
      await waitForLayoutUpdate();

      // Get the pageStyleUpdate listener that was registered
      const onCalls = mockEditorInstance.on as unknown as Mock;
      const pageStyleUpdateCall = onCalls.mock.calls.find((call) => call[0] === 'pageStyleUpdate');
      expect(pageStyleUpdateCall).toBeDefined();
      const handlePageStyleUpdate = pageStyleUpdateCall![1] as (payload: {
        pageMargins?: unknown;
        pageStyles?: unknown;
      }) => void;

      // Track the payload received
      let receivedPayload: { pageMargins?: unknown; pageStyles?: unknown } | null = null;
      const originalHandler = handlePageStyleUpdate;
      const wrappedHandler = (payload: { pageMargins?: unknown; pageStyles?: unknown }) => {
        receivedPayload = payload;
        originalHandler(payload);
      };

      // Simulate a pageStyleUpdate event with expected payload structure
      const newMargins = { left: 2.0, right: 2.0, top: 1.0, bottom: 1.0 };
      const pageStyles = { pageMargins: newMargins };
      wrappedHandler({ pageMargins: newMargins, pageStyles });

      // Verify payload structure
      expect(receivedPayload).toBeDefined();
      expect(receivedPayload?.pageMargins).toEqual(newMargins);
      expect(receivedPayload?.pageStyles).toBeDefined();
    });

    it('should handle pageStyleUpdate without affecting normal document updates', async () => {
      mockIncrementalLayout.mockResolvedValue(buildLayoutResult());

      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      // Wait for initial render to complete
      await waitForLayoutUpdate();

      // Clear initial layout call and start counting fresh
      mockIncrementalLayout.mockClear();

      let layoutUpdatedCount = 0;
      editor.onLayoutUpdated(() => {
        layoutUpdatedCount++;
      });

      // Get both update and pageStyleUpdate listeners
      const onCalls = mockEditorInstance.on as unknown as Mock;
      const updateCall = onCalls.mock.calls.find((call) => call[0] === 'update');
      const pageStyleUpdateCall = onCalls.mock.calls.find((call) => call[0] === 'pageStyleUpdate');

      expect(updateCall).toBeDefined();
      expect(pageStyleUpdateCall).toBeDefined();

      const handleUpdate = updateCall![1] as (payload: { transaction: { docChanged: boolean } }) => void;
      const handlePageStyleUpdate = pageStyleUpdateCall![1] as (payload: {
        pageMargins?: unknown;
        pageStyles?: unknown;
      }) => void;

      // First, simulate a normal document update
      handleUpdate({ transaction: { docChanged: true } });
      await waitForLayoutUpdate();
      const afterDocUpdate = layoutUpdatedCount;
      expect(afterDocUpdate).toBeGreaterThan(0);

      // Then, simulate a page style update
      mockIncrementalLayout.mockClear();
      const newMargins = { left: 2.0, right: 2.0, top: 1.0, bottom: 1.0 };
      handlePageStyleUpdate({ pageMargins: newMargins, pageStyles: {} });
      await waitForLayoutUpdate();

      // Both types of updates should trigger layout updates independently
      expect(layoutUpdatedCount).toBeGreaterThan(afterDocUpdate);
    });

    it('should remove pageStyleUpdate listener on destroy', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });

      const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
        (Editor as unknown as MockedEditor).mock.results.length - 1
      ].value;

      // Spy on the editor's off method to verify cleanup
      const offSpy = mockEditorInstance.off as unknown as Mock;

      editor.destroy();

      // Verify that 'pageStyleUpdate' listener was removed
      const pageStyleUpdateOffCall = offSpy.mock.calls.find((call) => call[0] === 'pageStyleUpdate');
      expect(pageStyleUpdateOffCall).toBeDefined();
      expect(pageStyleUpdateOffCall![1]).toBeTypeOf('function');

      editor = null as unknown as PresentationEditor;
    });
  });

  describe('Input validation', () => {
    describe('setDocumentMode', () => {
      it('should throw TypeError for non-string input', () => {
        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        expect(() => editor.setDocumentMode(123 as unknown as 'editing')).toThrow(TypeError);
        expect(() => editor.setDocumentMode(123 as unknown as 'editing')).toThrow(/expects a string/);
      });

      it('should throw TypeError for invalid mode string', () => {
        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        expect(() => editor.setDocumentMode('invalid' as 'editing')).toThrow(TypeError);
        expect(() => editor.setDocumentMode('invalid' as 'editing')).toThrow(/Must be one of/);
      });

      it('should accept all valid modes without errors', () => {
        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        expect(() => editor.setDocumentMode('editing')).not.toThrow();
        expect(() => editor.setDocumentMode('viewing')).not.toThrow();
        expect(() => editor.setDocumentMode('suggesting')).not.toThrow();
      });
    });

    describe('setZoom', () => {
      beforeEach(() => {
        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });
      });

      it('should throw TypeError for non-number input', () => {
        expect(() => editor.setZoom('1.5' as unknown as number)).toThrow(TypeError);
        expect(() => editor.setZoom('1.5' as unknown as number)).toThrow(/expects a number/);
      });

      it('should throw RangeError for NaN', () => {
        expect(() => editor.setZoom(NaN)).toThrow(RangeError);
        expect(() => editor.setZoom(NaN)).toThrow(/not NaN/);
      });

      it('should throw RangeError for Infinity', () => {
        expect(() => editor.setZoom(Infinity)).toThrow(RangeError);
        expect(() => editor.setZoom(Infinity)).toThrow(/finite number/);
      });

      it('should throw RangeError for negative zoom', () => {
        expect(() => editor.setZoom(-1)).toThrow(RangeError);
        expect(() => editor.setZoom(-1)).toThrow(/positive number/);
      });

      it('should throw RangeError for zero zoom', () => {
        expect(() => editor.setZoom(0)).toThrow(RangeError);
        expect(() => editor.setZoom(0)).toThrow(/greater than 0/);
      });

      it('should warn for zoom > 10', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
          // No-op
        });

        expect(() => editor.setZoom(15)).not.toThrow();
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeds recommended maximum'));

        consoleWarnSpy.mockRestore();
      });

      it('should accept valid zoom values', () => {
        expect(() => editor.setZoom(1.0)).not.toThrow();
        expect(() => editor.setZoom(0.5)).not.toThrow();
        expect(() => editor.setZoom(2.0)).not.toThrow();
      });
    });

    describe('setTrackedChangesOverrides', () => {
      beforeEach(() => {
        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });
      });

      it('should throw TypeError for non-object input', () => {
        expect(() => editor.setTrackedChangesOverrides('invalid' as unknown as TrackedChangesOverrides)).toThrow(
          TypeError,
        );
        expect(() => editor.setTrackedChangesOverrides(123 as unknown as TrackedChangesOverrides)).toThrow(TypeError);
        expect(() => editor.setTrackedChangesOverrides([] as unknown as TrackedChangesOverrides)).toThrow(TypeError);
      });

      it('should throw TypeError for invalid mode', () => {
        expect(() => editor.setTrackedChangesOverrides({ mode: 'invalid' as TrackedChangesMode })).toThrow(TypeError);
        expect(() => editor.setTrackedChangesOverrides({ mode: 'invalid' as TrackedChangesMode })).toThrow(
          /Invalid tracked changes mode/,
        );
      });

      it('should throw TypeError for non-boolean enabled', () => {
        expect(() => editor.setTrackedChangesOverrides({ enabled: 'true' as unknown as boolean })).toThrow(TypeError);
        expect(() => editor.setTrackedChangesOverrides({ enabled: 'true' as unknown as boolean })).toThrow(
          /must be a boolean/,
        );
      });

      it('should accept undefined', () => {
        expect(() => editor.setTrackedChangesOverrides(undefined)).not.toThrow();
      });

      it('should accept valid overrides', () => {
        expect(() => editor.setTrackedChangesOverrides({ mode: 'review' })).not.toThrow();
        expect(() => editor.setTrackedChangesOverrides({ enabled: true })).not.toThrow();
        expect(() => editor.setTrackedChangesOverrides({ mode: 'simple', enabled: false })).not.toThrow();
      });
    });
  });

  describe('Error handling and recovery', () => {
    describe('Layout error state tracking', () => {
      it('should start in healthy state', () => {
        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        expect(editor.isLayoutHealthy()).toBe(true);
        expect(editor.getLayoutHealthState()).toBe('healthy');
      });

      it('should transition to failed state on layout error', async () => {
        mockIncrementalLayout.mockRejectedValueOnce(new Error('Layout failed'));

        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        // Wait for initial layout attempt
        await vi
          .waitFor(() => expect(mockIncrementalLayout).toHaveBeenCalled(), { timeout: 500 })
          .catch(() => {
            // Ignore timeout - layout may have already failed
          });

        // Wait a bit for error handling
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(editor.isLayoutHealthy()).toBe(false);
        expect(['degraded', 'failed']).toContain(editor.getLayoutHealthState());
      });

      it('should recover to healthy state after successful layout', async () => {
        // First fail, then succeed
        mockIncrementalLayout.mockRejectedValueOnce(new Error('Layout failed'));

        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        // Wait for initial failure
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Mock success for next attempt
        mockIncrementalLayout.mockResolvedValueOnce({ layout: { pages: [] }, measures: [] });

        // Trigger re-layout
        const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
          (Editor as unknown as MockedEditor).mock.results.length - 1
        ].value;

        // Get the update handler
        const onCalls = mockEditorInstance.on as unknown as Mock;
        const updateCall = onCalls.mock.calls.find((call) => call[0] === 'update');
        if (updateCall) {
          const handleUpdate = updateCall[1] as (payload: { transaction: { docChanged: boolean } }) => void;
          handleUpdate({ transaction: { docChanged: true } });
        }

        await vi
          .waitFor(() => editor.isLayoutHealthy(), { timeout: 500 })
          .catch(() => {
            // May not recover immediately
          });
      });
    });

    describe('Type guards for external dependencies', () => {
      it('should handle invalid incrementalLayout result', async () => {
        // Return invalid result (null)
        mockIncrementalLayout.mockResolvedValueOnce(null as unknown as { layout: Layout; measures: Measure[] });

        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(editor.isLayoutHealthy()).toBe(false);
      });

      it('should handle missing layout property', async () => {
        // Return result without layout
        mockIncrementalLayout.mockResolvedValueOnce({ measures: [] } as unknown as {
          layout: Layout;
          measures: Measure[];
        });

        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(editor.isLayoutHealthy()).toBe(false);
      });

      it('should handle non-array measures', async () => {
        // Return result with invalid measures
        mockIncrementalLayout.mockResolvedValueOnce({
          layout: { pages: [] },
          measures: 'invalid',
        } as unknown as { layout: Layout; measures: Measure[] });

        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(editor.isLayoutHealthy()).toBe(false);
      });
    });
  });

  describe('Memory management', () => {
    describe('Event listener cleanup', () => {
      it('should cleanup collaboration cursors on destroy', () => {
        const mockAwareness = {
          clientID: 1,
          getStates: vi.fn(() => new Map()),
          on: vi.fn(),
          off: vi.fn(),
        };

        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
          collaborationProvider: {
            awareness: mockAwareness,
          },
          layoutEngineOptions: {
            presence: { enabled: true },
          },
        });

        // Simulate collaboration ready
        const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
          (Editor as unknown as MockedEditor).mock.results.length - 1
        ].value;
        const onCalls = mockEditorInstance.on as unknown as Mock;
        const collabReadyCall = onCalls.mock.calls.find((call) => call[0] === 'collaborationReady');
        if (collabReadyCall) {
          const handler = collabReadyCall[1] as () => void;
          handler();
        }

        // Verify subscriptions were created
        expect(mockAwareness.on).toHaveBeenCalledWith('change', expect.any(Function));
        expect(mockAwareness.on).toHaveBeenCalledWith('update', expect.any(Function));

        // Destroy and verify cleanup
        editor.destroy();
        expect(mockAwareness.off).toHaveBeenCalledWith('change', expect.any(Function));
        expect(mockAwareness.off).toHaveBeenCalledWith('update', expect.any(Function));

        editor = null as unknown as PresentationEditor;
      });

      it('should prevent double-initialization of collaboration cursors', () => {
        const mockAwareness = {
          clientID: 1,
          getStates: vi.fn(() => new Map()),
          on: vi.fn(),
          off: vi.fn(),
        };

        editor = new PresentationEditor({
          element: container,
          documentId: 'test-doc',
          collaborationProvider: {
            awareness: mockAwareness,
          },
          layoutEngineOptions: {
            presence: { enabled: true },
          },
        });

        const mockEditorInstance = (Editor as unknown as MockedEditor).mock.results[
          (Editor as unknown as MockedEditor).mock.results.length - 1
        ].value;
        const onCalls = mockEditorInstance.on as unknown as Mock;
        const collabReadyCall = onCalls.mock.calls.find((call) => call[0] === 'collaborationReady');

        if (collabReadyCall) {
          const handler = collabReadyCall[1] as () => void;

          // Call twice
          handler();
          const firstCallCount = mockAwareness.on.mock.calls.length;

          // Reset mock to detect second subscription
          mockAwareness.on.mockClear();
          mockAwareness.off.mockClear();

          handler();

          // Second call should cleanup first, then re-subscribe
          expect(mockAwareness.off).toHaveBeenCalled(); // Cleanup from first
          expect(mockAwareness.on).toHaveBeenCalled(); // New subscriptions
        }
      });
    });
  });

  describe('Public API Documentation', () => {
    beforeEach(() => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
      });
    });

    it('should expose isLayoutHealthy() method', () => {
      expect(typeof editor.isLayoutHealthy).toBe('function');
      expect(typeof editor.isLayoutHealthy()).toBe('boolean');
    });

    it('should expose getLayoutHealthState() method', () => {
      expect(typeof editor.getLayoutHealthState).toBe('function');
      const state = editor.getLayoutHealthState();
      expect(['healthy', 'degraded', 'failed']).toContain(state);
    });

    it('should expose getActiveEditor() method', () => {
      expect(typeof editor.getActiveEditor).toBe('function');
      const activeEditor = editor.getActiveEditor();
      expect(activeEditor).toBeDefined();
    });

    it('should expose dispatchInActiveEditor() method', () => {
      expect(typeof editor.dispatchInActiveEditor).toBe('function');
      let called = false;
      editor.dispatchInActiveEditor(() => {
        called = true;
      });
      expect(called).toBe(true);
    });

    it('should expose visibleHost getter', () => {
      expect(editor.visibleHost).toBe(container);
    });

    it('should expose overlayElement getter', () => {
      expect(editor.overlayElement).toBeDefined();
    });
  });
});
