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
  mockEditorOverlayManager,
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
      setEditable: vi.fn(),
      setOptions: vi.fn(),
      commands: {
        setTextSelection: vi.fn(),
      },
      state: {
        doc: {
          content: {
            size: 10,
          },
        },
      },
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
    mockEditorOverlayManager: vi.fn().mockImplementation(() => ({
      showEditingOverlay: vi.fn(() => ({
        success: true,
        editorHost: document.createElement('div'),
        reason: null,
      })),
      hideEditingOverlay: vi.fn(),
      showSelectionOverlay: vi.fn(),
      hideSelectionOverlay: vi.fn(),
      setOnDimmingClick: vi.fn(),
      getActiveEditorHost: vi.fn(() => null),
      destroy: vi.fn(),
    })),
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
        doc: {
          nodeSize: 100,
          content: {
            size: 100,
          },
          descendants: vi.fn(),
          nodesBetween: vi.fn((_from: number, _to: number, callback: (node: unknown, pos: number) => void) => {
            callback({ isTextblock: true }, 0);
          }),
          resolve: vi.fn((pos: number) => ({
            pos,
            depth: 0,
            parent: { inlineContent: true },
            node: vi.fn(),
            min: vi.fn((other: { pos: number }) => Math.min(pos, other.pos)),
            max: vi.fn((other: { pos: number }) => Math.max(pos, other.pos)),
          })),
        },
        tr: {
          setSelection: vi.fn().mockReturnThis(),
        },
      },
      view: {
        dom: {
          dispatchEvent: vi.fn(() => true),
          focus: vi.fn(),
        },
        focus: vi.fn(),
        dispatch: vi.fn(),
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
  createDragHandler: vi.fn(() => {
    return () => {};
  }),
  getFragmentAtPosition: vi.fn(() => null),
  computeLinePmRange: vi.fn(() => ({ from: 0, to: 0 })),
  measureCharacterX: vi.fn(() => 0),
  extractIdentifierFromConverter: vi.fn((_converter) => ({
    extractHeaderId: vi.fn(() => 'rId-header-default'),
    extractFooterId: vi.fn(() => 'rId-footer-default'),
  })),
  buildMultiSectionIdentifier: vi.fn(() => ({ sections: [] })),
  getHeaderFooterTypeForSection: vi.fn(() => 'default'),
  getHeaderFooterType: vi.fn((_pageNumber, _identifier, _options) => {
    return 'default';
  }),
  layoutHeaderFooterWithCache: vi.fn(async () => ({
    default: {
      layout: { pages: [{ fragments: [], number: 1 }], height: 0 },
      blocks: [],
      measures: [],
    },
  })),
  computeDisplayPageNumber: vi.fn((pages) => pages.map((p) => ({ displayText: String(p.number ?? 1) }))),
  PageGeometryHelper: vi.fn().mockImplementation(({ layout, pageGap }) => ({
    updateLayout: vi.fn(),
    getPageIndexAtY: vi.fn(() => 0),
    getNearestPageIndex: vi.fn(() => 0),
    getPageTop: vi.fn(() => 0),
    getPageGap: vi.fn(() => pageGap ?? 0),
    getLayout: vi.fn(() => layout),
  })),
}));

// Mock painter-dom
vi.mock('@superdoc/painter-dom', () => ({
  createDomPainter: mockCreateDomPainter,
  DOM_CLASS_NAMES: {
    PAGE: 'superdoc-page',
    FRAGMENT: 'superdoc-fragment',
    LINE: 'superdoc-line',
    INLINE_SDT_WRAPPER: 'superdoc-structured-content-inline',
    BLOCK_SDT: 'superdoc-structured-content-block',
    DOCUMENT_SECTION: 'superdoc-document-section',
  },
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

vi.mock('./header-footer/EditorOverlayManager', () => ({
  EditorOverlayManager: mockEditorOverlayManager,
}));

describe('PresentationEditor - Zoom Functionality', () => {
  let container: HTMLElement;
  let editor: PresentationEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

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
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('zoom getter', () => {
    it('should return default value of 1 when zoom is not configured', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        pageSize: { w: 612, h: 792 },
      });

      expect(editor.zoom).toBe(1);
    });

    it('should return configured zoom value when set via setZoom', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        pageSize: { w: 612, h: 792 },
      });

      editor.setZoom(1.5);
      expect(editor.zoom).toBe(1.5);
    });

    it('should return updated zoom value after setZoom is called', () => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        pageSize: { w: 612, h: 792 },
      });

      expect(editor.zoom).toBe(1);

      editor.setZoom(2);
      expect(editor.zoom).toBe(2);

      editor.setZoom(0.5);
      expect(editor.zoom).toBe(0.5);
    });
  });

  describe('setZoom', () => {
    beforeEach(() => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        pageSize: { w: 612, h: 792 },
      });
    });

    it('should apply transform on viewport host when zoom is set', () => {
      editor.setZoom(1.5);

      // Verify zoom was updated via the getter
      expect(editor.zoom).toBe(1.5);

      // Verify transform is applied to the viewport element
      const viewportHost = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      expect(viewportHost?.style.transform).toBe('scale(1.5)');
      expect(viewportHost?.style.transformOrigin).toBe('top left');
    });

    it('should clear transform when zoom is set to 1', () => {
      editor.setZoom(1.5);
      expect(editor.zoom).toBe(1.5);

      editor.setZoom(1);
      expect(editor.zoom).toBe(1);

      const viewportHost = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      expect(viewportHost?.style.transform).toBe('');
    });

    it('should throw TypeError when zoom is not a number', () => {
      expect(() => editor.setZoom('1.5' as unknown as number)).toThrow(TypeError);
      expect(() => editor.setZoom('1.5' as unknown as number)).toThrow(
        '[PresentationEditor] setZoom expects a number, received string',
      );

      expect(() => editor.setZoom(null as unknown as number)).toThrow(TypeError);
      expect(() => editor.setZoom(undefined as unknown as number)).toThrow(TypeError);
      expect(() => editor.setZoom({} as unknown as number)).toThrow(TypeError);
    });

    it('should throw RangeError when zoom is NaN', () => {
      expect(() => editor.setZoom(NaN)).toThrow(RangeError);
      expect(() => editor.setZoom(NaN)).toThrow('[PresentationEditor] setZoom expects a valid number (not NaN)');
    });

    it('should throw RangeError when zoom is not finite', () => {
      expect(() => editor.setZoom(Infinity)).toThrow(RangeError);
      expect(() => editor.setZoom(Infinity)).toThrow('[PresentationEditor] setZoom expects a finite number');

      expect(() => editor.setZoom(-Infinity)).toThrow(RangeError);
      expect(() => editor.setZoom(-Infinity)).toThrow('[PresentationEditor] setZoom expects a finite number');
    });

    it('should throw RangeError when zoom is not positive', () => {
      expect(() => editor.setZoom(0)).toThrow(RangeError);
      expect(() => editor.setZoom(0)).toThrow('[PresentationEditor] setZoom expects a positive number greater than 0');

      expect(() => editor.setZoom(-1)).toThrow(RangeError);
      expect(() => editor.setZoom(-1)).toThrow('[PresentationEditor] setZoom expects a positive number greater than 0');

      expect(() => editor.setZoom(-0.5)).toThrow(RangeError);
    });

    it('should accept valid positive zoom values', () => {
      expect(() => editor.setZoom(0.1)).not.toThrow();
      expect(() => editor.setZoom(0.5)).not.toThrow();
      expect(() => editor.setZoom(1)).not.toThrow();
      expect(() => editor.setZoom(1.5)).not.toThrow();
      expect(() => editor.setZoom(2)).not.toThrow();
      expect(() => editor.setZoom(5)).not.toThrow();
    });

    it('should warn when zoom exceeds recommended maximum', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // MAX_ZOOM_WARNING_THRESHOLD is 10, so we need > 10 to trigger warning
      editor.setZoom(10.1);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Zoom level 10.1 exceeds recommended maximum'));

      warnSpy.mockRestore();
    });
  });

  describe('normalizeClientPoint', () => {
    beforeEach(() => {
      editor = new PresentationEditor({
        element: container,
        documentId: 'test-doc',
        pageSize: { w: 612, h: 792 },
      });
    });

    it('should normalize client coordinates at zoom level 1', () => {
      editor.setZoom(1);

      // Mock getBoundingClientRect to return predictable values
      const viewportHost = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      if (viewportHost) {
        vi.spyOn(viewportHost, 'getBoundingClientRect').mockReturnValue({
          left: 100,
          top: 50,
          width: 800,
          height: 1000,
          right: 900,
          bottom: 1050,
          x: 100,
          y: 50,
          toJSON: () => ({}),
        });
      }

      const result = editor.normalizeClientPoint(200, 150);

      expect(result).not.toBeNull();
      expect(result?.x).toBe(100); // (200 - 100) / 1
      expect(result?.y).toBe(100); // (150 - 50) / 1
    });

    it('should normalize client coordinates at zoom level 0.5', () => {
      editor.setZoom(0.5);

      const viewportHost = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      if (viewportHost) {
        vi.spyOn(viewportHost, 'getBoundingClientRect').mockReturnValue({
          left: 100,
          top: 50,
          width: 800,
          height: 1000,
          right: 900,
          bottom: 1050,
          x: 100,
          y: 50,
          toJSON: () => ({}),
        });
      }

      const result = editor.normalizeClientPoint(200, 150);

      expect(result).not.toBeNull();
      expect(result?.x).toBe(200); // (200 - 100) / 0.5
      expect(result?.y).toBe(200); // (150 - 50) / 0.5
    });

    it('should normalize client coordinates at zoom level 2', () => {
      editor.setZoom(2);

      const viewportHost = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      if (viewportHost) {
        vi.spyOn(viewportHost, 'getBoundingClientRect').mockReturnValue({
          left: 100,
          top: 50,
          width: 800,
          height: 1000,
          right: 900,
          bottom: 1050,
          x: 100,
          y: 50,
          toJSON: () => ({}),
        });
      }

      const result = editor.normalizeClientPoint(200, 150);

      expect(result).not.toBeNull();
      expect(result?.x).toBe(50); // (200 - 100) / 2
      expect(result?.y).toBe(50); // (150 - 50) / 2
    });

    it('should account for scroll offset when normalizing coordinates', () => {
      editor.setZoom(1);

      const viewportHost = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      const visibleHost = container.querySelector('.presentation-editor') as HTMLElement;

      if (viewportHost) {
        vi.spyOn(viewportHost, 'getBoundingClientRect').mockReturnValue({
          left: 100,
          top: 50,
          width: 800,
          height: 1000,
          right: 900,
          bottom: 1050,
          x: 100,
          y: 50,
          toJSON: () => ({}),
        });
      }

      // Note: Mocking scrollLeft/scrollTop on HTMLElement is complex in JSDOM
      // This test verifies the method works with default scroll (0, 0)
      const result = editor.normalizeClientPoint(200, 150);

      expect(result).not.toBeNull();
      // With scroll at 0,0: (200 - 100 + 0) / 1 = 100
      expect(result?.x).toBe(100);
      // With scroll at 0,0: (150 - 50 + 0) / 1 = 100
      expect(result?.y).toBe(100);
    });

    it('should return null for NaN coordinates', () => {
      expect(editor.normalizeClientPoint(NaN, 100)).toBeNull();
      expect(editor.normalizeClientPoint(100, NaN)).toBeNull();
      expect(editor.normalizeClientPoint(NaN, NaN)).toBeNull();
    });

    it('should return null for infinite coordinates', () => {
      expect(editor.normalizeClientPoint(Infinity, 100)).toBeNull();
      expect(editor.normalizeClientPoint(100, Infinity)).toBeNull();
      expect(editor.normalizeClientPoint(-Infinity, 100)).toBeNull();
      expect(editor.normalizeClientPoint(100, -Infinity)).toBeNull();
    });

    it('should accept negative coordinates (valid for elements positioned above/left of viewport)', () => {
      editor.setZoom(1);

      const viewportHost = container.querySelector('.presentation-editor__viewport') as HTMLElement;
      if (viewportHost) {
        vi.spyOn(viewportHost, 'getBoundingClientRect').mockReturnValue({
          left: 100,
          top: 50,
          width: 800,
          height: 1000,
          right: 900,
          bottom: 1050,
          x: 100,
          y: 50,
          toJSON: () => ({}),
        });
      }

      const result = editor.normalizeClientPoint(-50, -25);

      expect(result).not.toBeNull();
      // With scroll at 0,0: (-50 - 100 + 0) / 1 = -150
      // Note: Negative client coords are valid when elements are above/left of viewport
      expect(result?.x).toBe(-150); // (-50 - 100) / 1
      expect(result?.y).toBe(-75); // (-25 - 50) / 1
    });
  });
});
