import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DOCX } from '@harbour-enterprises/common';

const shuffleArrayMock = vi.fn((arr) => [...arr].reverse());

vi.mock('@harbour-enterprises/common/collaboration/awareness.js', () => ({
  shuffleArray: shuffleArrayMock,
}));

const uuidMock = vi.fn(() => 'uuid-1234');
vi.mock('uuid', () => ({
  v4: uuidMock,
}));

const toolbarUpdateSpy = vi.fn();
const toolbarSetActiveSpy = vi.fn();

class MockToolbar {
  constructor(config) {
    this.config = config;
    this.listeners = {};
    this.activeEditor = null;
    this.updateToolbarState = toolbarUpdateSpy;
  }

  on(event, handler) {
    this.listeners[event] = handler;
  }

  once(event, handler) {
    this.listeners[event] = handler;
  }

  setActiveEditor(editor) {
    this.activeEditor = editor;
    toolbarSetActiveSpy(editor);
  }
}

const createZipMock = vi.fn(async (blobs, names) => ({ zip: true, blobs, names }));

vi.mock('@harbour-enterprises/super-editor', () => ({
  SuperToolbar: MockToolbar,
  createZip: createZipMock,
}));

const createDownloadMock = vi.fn(() => 'downloaded');
const cleanNameMock = vi.fn((value) => value.replace(/\s+/g, '-'));

vi.mock('./helpers/export.js', () => ({
  createDownload: createDownloadMock,
  cleanName: cleanNameMock,
}));

const initSuperdocYdocMock = vi.fn(() => ({
  ydoc: { destroy: vi.fn() },
  provider: { disconnect: vi.fn(), destroy: vi.fn(), on: vi.fn(), off: vi.fn() },
}));
const initCollaborationCommentsMock = vi.fn();
const makeDocumentsCollaborativeMock = vi.fn((superdoc) => {
  return superdoc.config.documents.map((doc, index) => {
    const provider = { disconnect: vi.fn(), destroy: vi.fn() };
    const ydoc = {
      destroyed: false,
      destroy: vi.fn(),
      getMap: vi.fn(() => ({
        set: vi.fn(),
        observe: vi.fn(),
      })),
      transact: (fn) => fn(),
    };

    Object.assign(doc, {
      id: doc.id || `doc-${index}`,
      provider,
      ydoc,
      socket: superdoc.config.socket,
    });

    return doc;
  });
});

vi.mock('./collaboration/helpers.js', () => ({
  initSuperdocYdoc: initSuperdocYdocMock,
  initCollaborationComments: initCollaborationCommentsMock,
  makeDocumentsCollaborative: makeDocumentsCollaborativeMock,
}));

const hocuspocusConstructor = vi.fn(() => ({
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  destroy: vi.fn(),
  cancelWebsocketRetry: vi.fn(),
}));
vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProviderWebsocket: hocuspocusConstructor,
}));

const createVueAppMock = vi.fn();

vi.mock('./create-app.js', () => ({
  createSuperdocVueApp: createVueAppMock,
}));

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createAppHarness = () => {
  const superdocStore = {
    documents: [],
    init: vi.fn(),
    reset: vi.fn(),
    setExceptionHandler: vi.fn(),
    activeZoom: 100,
  };

  const commentsStore = {
    init: vi.fn(),
    translateCommentsForExport: vi.fn(() => []),
    handleEditorLocationsUpdate: vi.fn(),
    hasSyncedCollaborationComments: false,
    commentsParentElement: null,
    editorCommentIds: [],
    removePendingComment: vi.fn(),
    setActiveComment: vi.fn(),
  };

  const app = {
    mount: vi.fn(),
    unmount: vi.fn(),
    config: { globalProperties: {} },
  };

  const pinia = {};
  const highContrastModeStore = {};

  createVueAppMock.mockReturnValue({ app, pinia, superdocStore, commentsStore, highContrastModeStore });

  return { app, superdocStore, commentsStore };
};

const originalCreateElement = document.createElement;
let consoleDebugSpy;
let consoleLogSpy;

describe('FaddockSuperdoc core', () => {
  let FaddockSuperdoc;

  beforeEach(async () => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.resetModules();
    toolbarUpdateSpy.mockClear();
    toolbarSetActiveSpy.mockClear();
    createZipMock.mockClear();
    createDownloadMock.mockClear();
    cleanNameMock.mockClear();
    shuffleArrayMock.mockClear();
    makeDocumentsCollaborativeMock.mockClear();
    initSuperdocYdocMock.mockClear();
    initCollaborationCommentsMock.mockClear();
    hocuspocusConstructor.mockClear();

    document.body.innerHTML = '<div id="host"></div>';

    ({ FaddockSuperdoc } = await import('./FaddockSuperdoc.js'));
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    consoleDebugSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it('normalizes document and mounts app', async () => {
    const { app, superdocStore } = createAppHarness();
    const config = {
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red', 'blue'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    };

    const instance = new FaddockSuperdoc(config);
    await flushMicrotasks();

    expect(createVueAppMock).toHaveBeenCalled();
    expect(app.mount).toHaveBeenCalledWith('#host');
    expect(superdocStore.init).toHaveBeenCalledWith(instance.config);
    expect(instance.config.documents).toHaveLength(1);
    expect(instance.config.documents[0]).toMatchObject({ type: DOCX, url: 'https://example.com/doc.docx' });
    expect(instance.colors).toEqual(['blue', 'red']);
    expect(shuffleArrayMock).toHaveBeenCalledWith(['red', 'blue']);
  });

  it('warns when both document object and documents list provided', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createAppHarness();

    const blob = new Blob(['test'], { type: DOCX });
    const config = {
      selector: '#host',
      document: { data: blob, name: 'doc1.docx' },
      documents: [{ type: DOCX, url: 'https://example.com/file.docx' }],
      modules: { comments: {}, toolbar: {} },
      colors: [],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    };

    const instance = new FaddockSuperdoc(config);
    await flushMicrotasks();

    expect(warnSpy).toHaveBeenCalledWith('🦋 [superdoc] You can only provide one of document or documents');
    expect(instance.config.documents).toHaveLength(1);
    expect(instance.config.documents[0].name).toBe('doc1.docx');
    warnSpy.mockRestore();
  });

  it('initializes collaboration for hocuspocus provider', async () => {
    const { superdocStore } = createAppHarness();
    superdocStore.documents = [
      {
        id: 'doc-1',
        type: DOCX,
        getEditor: vi.fn(() => ({ commands: { togglePagination: vi.fn() } })),
      },
    ];

    const config = {
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: {
        comments: { useInternalExternalComments: false },
        toolbar: {},
        collaboration: {
          providerType: 'hocuspocus',
          url: 'wss://example.com',
          suppressInternalExternalComments: false,
        },
      },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    };

    const instance = new FaddockSuperdoc(config);
    await flushMicrotasks();

    expect(hocuspocusConstructor).toHaveBeenCalledWith({ url: 'wss://example.com' });
    expect(makeDocumentsCollaborativeMock).toHaveBeenCalledWith(instance);
    expect(initCollaborationCommentsMock).toHaveBeenCalledWith(instance);
    expect(instance.isCollaborative).toBe(true);
    expect(instance.provider).toBeDefined();
    expect(instance.ydoc).toBeDefined();
  });

  it('toggles pagination across editors', async () => {
    const { superdocStore } = createAppHarness();
    const togglePagination = vi.fn();
    superdocStore.documents = [
      {
        type: DOCX,
        getEditor: () => ({ commands: { togglePagination } }),
      },
    ];

    const instance = new FaddockSuperdoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
      pagination: false,
    });
    await flushMicrotasks();

    instance.togglePagination();
    expect(instance.config.pagination).toBe(true);
    expect(togglePagination).toHaveBeenCalled();
  });

  it('broadcasts ready only when all editors resolved', async () => {
    const { superdocStore } = createAppHarness();
    superdocStore.documents = [
      { type: DOCX, getEditor: vi.fn(() => ({})), setEditor: vi.fn() },
      { type: DOCX, getEditor: vi.fn(() => ({})), setEditor: vi.fn() },
    ];

    const instance = new FaddockSuperdoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    const readySpy = vi.fn();
    instance.on('ready', readySpy);

    const editor = {};
    instance.broadcastEditorCreate(editor);
    expect(readySpy).not.toHaveBeenCalled();

    instance.broadcastEditorCreate(editor);
    expect(readySpy).toHaveBeenCalledTimes(1);
  });

  it('locks superdoc via ydoc metadata and emits event', async () => {
    createAppHarness();

    const metaSet = vi.fn();
    const metaMap = { set: metaSet };

    const instance = new FaddockSuperdoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    instance.config.documents = [
      {
        ydoc: {
          getMap: vi.fn(() => metaMap),
          transact: (fn) => fn(),
        },
      },
    ];

    const lockedSpy = vi.fn();
    instance.on('locked', lockedSpy);

    instance.setLocked(true);
    expect(metaSet).toHaveBeenNthCalledWith(1, 'locked', true);
    expect(metaSet).toHaveBeenNthCalledWith(2, 'lockedBy', instance.user);
    expect(lockedSpy).not.toHaveBeenCalled();
    instance.lockSuperdoc(true, { name: 'Admin' });
    expect(lockedSpy).toHaveBeenCalledWith({ isLocked: true, lockedBy: { name: 'Admin' } });
  });

  it('exports docx files alongside additional assets', async () => {
    createAppHarness();

    const instance = new FaddockSuperdoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
      title: 'Test Export',
    });
    await flushMicrotasks();

    vi.spyOn(instance, 'exportEditorsToDOCX').mockResolvedValue(['docx-blob']);

    const extraBlob = new Blob(['extra']);
    await instance.export({
      exportType: ['docx', 'txt'],
      additionalFiles: [extraBlob],
      additionalFileNames: ['extra.txt'],
      commentsType: 'all',
      triggerDownload: true,
    });

    expect(createZipMock).toHaveBeenCalled();
    expect(createDownloadMock).toHaveBeenCalledWith(expect.any(Object), 'Test-Export', 'zip');
  });

  it('destroys app and cleans providers', async () => {
    const { app } = createAppHarness();

    const instance = new FaddockSuperdoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: {
        comments: {},
        toolbar: {},
        collaboration: { providerType: 'hocuspocus', url: 'wss://example.com' },
      },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    const provider = instance.provider;
    const processedDocs = instance.config.documents;

    instance.destroy();

    expect(provider.disconnect).toHaveBeenCalled();
    expect(provider.destroy).toHaveBeenCalled();
    processedDocs.forEach((doc) => {
      expect(doc.provider.disconnect).toHaveBeenCalled();
      expect(doc.provider.destroy).toHaveBeenCalled();
      expect(doc.ydoc.destroy).toHaveBeenCalled();
    });
    expect(app.unmount).toHaveBeenCalled();
    expect(instance.app.config.globalProperties.$config).toBeUndefined();
    expect(instance.listenerCount('ready')).toBe(0);
  });

  it('applies CSP nonce to style tags when configured', async () => {
    createAppHarness();

    const instance = new FaddockSuperdoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
      cspNonce: 'nonce-123',
    });
    await flushMicrotasks();

    const styleElement = document.createElement('style');
    expect(styleElement.getAttribute('nonce')).toBe('nonce-123');
  });

  describe('FaddockSuperdoc document normalization', () => {
    describe('real-world document handling', () => {
      it('handles File from browser input', async () => {
        createAppHarness();

        // Real browser File object
        const file = new File(['content'], 'contract.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const instance = new FaddockSuperdoc({
          selector: '#host',
          document: file,
        });
        await flushMicrotasks();

        expect(instance.config.documents).toHaveLength(1);
        expect(instance.config.documents[0]).toMatchObject({
          id: expect.any(String),
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: 'contract.docx',
          isNewFile: true,
        });
        expect(instance.config.documents[0].data).toBe(file);
      });

      it('handles Blob from fetch response', async () => {
        createAppHarness();

        // Simulates fetch().then(res => res.blob())
        const blob = new Blob(['content'], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const instance = new FaddockSuperdoc({
          selector: '#host',
          document: blob,
        });
        await flushMicrotasks();

        expect(instance.config.documents).toHaveLength(1);
        expect(instance.config.documents[0]).toMatchObject({
          id: expect.any(String),
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: 'document', // Default name for Blobs
          isNewFile: true,
        });
        // Blob should be wrapped as File
        expect(instance.config.documents[0].data).toBeInstanceOf(File);
      });

      it('handles File with empty type (browser edge case)', async () => {
        createAppHarness();

        // Some browsers can't determine MIME type
        const file = new File(['content'], 'report.docx', { type: '' });

        const instance = new FaddockSuperdoc({
          selector: '#host',
          document: file,
        });
        await flushMicrotasks();

        expect(instance.config.documents).toHaveLength(1);
        // Should infer type from filename
        expect(instance.config.documents[0].type).toBe(DOCX);
      });

      it('handles Blob without type', async () => {
        createAppHarness();

        // Untyped Blob (edge case)
        const blob = new Blob(['content']);

        const instance = new FaddockSuperdoc({
          selector: '#host',
          document: blob,
        });
        await flushMicrotasks();

        expect(instance.config.documents).toHaveLength(1);
        // Should default to DOCX
        expect(instance.config.documents[0].type).toBe(DOCX);
        expect(instance.config.documents[0].name).toBe('document');
      });
    });

    describe('ID generation', () => {
      it('generates IDs for all document types', async () => {
        createAppHarness();

        const testCases = [
          // URL string
          { document: 'https://example.com/doc.docx' },
          // File
          { document: new File(['test'], 'test.docx', { type: DOCX }) },
          // Blob
          { document: new Blob(['test'], { type: DOCX }) },
          // Config object
          { document: { data: new Blob(['test']), name: 'test.html', type: 'text/html' } },
        ];

        for (const config of testCases) {
          const instance = new FaddockSuperdoc({
            selector: '#host',
            ...config,
          });
          await flushMicrotasks();

          expect(instance.config.documents[0].id).toBeDefined();
          expect(instance.config.documents[0].id).toMatch(/^(uuid-1234|doc-)/);
        }
      });

      it('leaves non-object entries untouched when normalizing arrays', async () => {
        createAppHarness();

        const instance = new FaddockSuperdoc({
          selector: '#host',
          documents: [null, { type: DOCX, data: new Blob(['test'], { type: DOCX }), name: 'doc.docx' }],
        });
        await flushMicrotasks();

        expect(instance.config.documents[0]).toBeNull();
        expect(instance.config.documents[1]).toMatchObject({
          id: 'uuid-1234',
          type: DOCX,
          name: 'doc.docx',
        });
      });

      it('preserves existing IDs in documents array', async () => {
        createAppHarness();

        const instance = new FaddockSuperdoc({
          selector: '#host',
          documents: [
            { id: 'custom-id-1', type: DOCX, data: new Blob(['test']) },
            { type: DOCX, url: 'test.docx' }, // No ID
          ],
        });
        await flushMicrotasks();

        expect(instance.config.documents[0].id).toBe('custom-id-1');
        expect(instance.config.documents[1].id).toBeDefined();
        expect(instance.config.documents[1].id).not.toBe('custom-id-1');
      });
    });

    describe('backward compatibility', () => {
      it('still handles document config objects', async () => {
        createAppHarness();

        const blob = new Blob(['test'], { type: DOCX });
        const instance = new FaddockSuperdoc({
          selector: '#host',
          document: {
            data: blob,
            name: 'custom.docx',
            type: DOCX,
          },
        });
        await flushMicrotasks();

        expect(instance.config.documents).toHaveLength(1);
        expect(instance.config.documents[0]).toMatchObject({
          id: expect.any(String),
          type: DOCX,
          name: 'custom.docx',
          // Note: isNewFile is not added when passing config objects
          // only when passing File/Blob directly
        });
      });

      it('handles document config with isNewFile flag', async () => {
        createAppHarness();

        const blob = new Blob(['test'], { type: DOCX });
        const instance = new FaddockSuperdoc({
          selector: '#host',
          document: {
            data: blob,
            name: 'custom.docx',
            type: DOCX,
            isNewFile: true, // Explicitly set
          },
        });
        await flushMicrotasks();

        expect(instance.config.documents[0]).toMatchObject({
          id: expect.any(String),
          type: DOCX,
          name: 'custom.docx',
          isNewFile: true,
        });
      });
    });
  });
});
