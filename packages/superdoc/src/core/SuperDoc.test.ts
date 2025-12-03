import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DOCX, PDF } from '@superdoc/common';

// Mock must be defined before imports that use it
vi.mock('@superdoc/common/collaboration/awareness', () => ({
  shuffleArray: vi.fn((arr: unknown[]) => [...arr].reverse()),
}));

// Import the mocked module to access the mock
import { shuffleArray as shuffleArrayMock } from '@superdoc/common/collaboration/awareness';

const uuidMock = vi.fn(() => 'uuid-1234');
vi.mock('uuid', () => ({
  v4: uuidMock,
}));

const toolbarUpdateSpy = vi.fn();
const toolbarSetActiveSpy = vi.fn();

class MockToolbar {
  config: Record<string, unknown>;
  listeners: Record<string, (...args: unknown[]) => void>;
  activeEditor: unknown;
  updateToolbarState: ReturnType<typeof vi.fn>;

  constructor(config: Record<string, unknown>) {
    this.config = config;
    this.listeners = {};
    this.activeEditor = null;
    this.updateToolbarState = toolbarUpdateSpy;
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.listeners[event] = handler;
  }

  once(event: string, handler: (...args: unknown[]) => void): void {
    this.listeners[event] = handler;
  }

  setActiveEditor(editor: unknown): void {
    this.activeEditor = editor;
    toolbarSetActiveSpy(editor);
  }
}

const createZipMock = vi.fn(async (blobs: unknown[], names: string[]) => ({ zip: true, blobs, names }));

vi.mock('@harbour-enterprises/super-editor', () => ({
  SuperToolbar: MockToolbar,
  createZip: createZipMock,
}));

const superCommentsConstructor = vi.fn();
vi.mock('../components/CommentsLayer/commentsList/super-comments-list.js', () => ({
  SuperComments: superCommentsConstructor,
}));

const createDownloadMock = vi.fn(() => 'downloaded');
const cleanNameMock = vi.fn((value: string) => value.replace(/\s+/g, '-'));

vi.mock('./helpers/export.js', () => ({
  createDownload: createDownloadMock,
  cleanName: cleanNameMock,
}));

const initSuperdocYdocMock = vi.fn(() => ({
  ydoc: { destroy: vi.fn() },
  provider: { disconnect: vi.fn(), destroy: vi.fn(), on: vi.fn(), off: vi.fn() },
}));
const initCollaborationCommentsMock = vi.fn();
const makeDocumentsCollaborativeMock = vi.fn((superdoc: { config: { documents: unknown[]; socket: unknown } }) => {
  return superdoc.config.documents.map((doc, index) => {
    const provider = { disconnect: vi.fn(), destroy: vi.fn() };
    const ydoc = {
      destroyed: false,
      destroy: vi.fn(),
      getMap: vi.fn(() => ({
        set: vi.fn(),
        observe: vi.fn(),
      })),
      transact: (fn: () => void) => fn(),
    };

    Object.assign(doc as Record<string, unknown>, {
      id: (doc as { id?: string }).id || `doc-${index}`,
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

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const createAppHarness = (): {
  app: Record<string, unknown>;
  superdocStore: Record<string, unknown>;
  commentsStore: Record<string, unknown>;
} => {
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
let consoleDebugSpy: ReturnType<typeof vi.spyOn> | undefined;
let consoleLogSpy: ReturnType<typeof vi.spyOn> | undefined;

describe('SuperDoc core', () => {
  let SuperDoc: { new (config: Record<string, unknown>): Record<string, unknown> };

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
    superCommentsConstructor.mockClear();

    document.body.innerHTML = '<div id="host"></div>';

    ({ SuperDoc } = await import('./SuperDoc.js'));
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

    const instance = new SuperDoc(config);
    await flushMicrotasks();

    expect(createVueAppMock).toHaveBeenCalled();
    expect(app.mount).toHaveBeenCalledWith('#host');
    expect(superdocStore.init).toHaveBeenCalledWith((instance as { config: unknown }).config);
    expect((instance.config as { documents: unknown[] }).documents).toHaveLength(1);
    expect((instance.config as { documents: { type: string; url: string }[] }).documents[0]).toMatchObject({
      type: DOCX,
      url: 'https://example.com/doc.docx',
    });
    expect((instance as { colors: string[] }).colors).toEqual(['blue', 'red']);
    expect(shuffleArrayMock).toHaveBeenCalledWith(['red', 'blue']);
  });

  it('defaults comments module config when omitted', async () => {
    const { commentsStore } = createAppHarness();
    const instance = new SuperDoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { toolbar: {} },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    expect(
      Object.prototype.hasOwnProperty.call(
        (instance.config as { modules: Record<string, unknown> }).modules,
        'comments',
      ),
    ).toBe(true);
    expect((instance.config as { modules: { comments: Record<string, unknown> } }).modules.comments).toMatchObject({});
    expect(commentsStore.init).toHaveBeenCalledWith({});
  });

  it('creates a default user when none is provided', async () => {
    createAppHarness();

    const instance = new SuperDoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
    });

    await flushMicrotasks();

    expect((instance.config as { user: { name: string; email: unknown } }).user).toEqual(
      expect.objectContaining({ name: 'Default SuperDoc user', email: null }),
    );
    expect((instance as { user: { name: string; email: unknown } }).user).toEqual(
      expect.objectContaining({ name: 'Default SuperDoc user', email: null }),
    );
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

    const instance = new SuperDoc(config);
    await flushMicrotasks();

    expect(warnSpy).toHaveBeenCalledWith('🦋 [superdoc] You can only provide one of document or documents');
    expect((instance.config as { documents: { name: string }[] }).documents).toHaveLength(1);
    expect((instance.config as { documents: { name: string }[] }).documents[0].name).toBe('doc1.docx');
    warnSpy.mockRestore();
  });

  it('initializes collaboration for hocuspocus provider', async () => {
    const { superdocStore } = createAppHarness();
    (superdocStore.documents as {
      id: string;
      type: string;
      getEditor: () => { commands: { togglePagination: ReturnType<typeof vi.fn> } };
    }[]) = [
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

    const instance = new SuperDoc(config);
    await flushMicrotasks();

    expect(hocuspocusConstructor).toHaveBeenCalledWith({ url: 'wss://example.com' });
    expect(makeDocumentsCollaborativeMock).toHaveBeenCalledWith(instance);
    expect(initCollaborationCommentsMock).toHaveBeenCalledWith(instance);
    expect((instance as { isCollaborative: boolean }).isCollaborative).toBe(true);
    expect((instance as { provider: unknown }).provider).toBeDefined();
    expect((instance as { ydoc: unknown }).ydoc).toBeDefined();
  });

  // pagination legacy removed; togglePagination test removed

  it('broadcasts ready only when all editors resolved', async () => {
    const { superdocStore } = createAppHarness();
    (superdocStore.documents as {
      type: string;
      getEditor: () => Record<string, unknown>;
      setEditor: ReturnType<typeof vi.fn>;
    }[]) = [
      { type: DOCX, getEditor: vi.fn(() => ({})), setEditor: vi.fn() },
      { type: DOCX, getEditor: vi.fn(() => ({})), setEditor: vi.fn() },
    ];

    const instance = new SuperDoc({
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
    (instance as { on: (event: string, handler: () => void) => void }).on('ready', readySpy);

    const editor = {};
    (instance as { broadcastEditorCreate: (editor: unknown) => void }).broadcastEditorCreate(editor);
    expect(readySpy).not.toHaveBeenCalled();

    (instance as { broadcastEditorCreate: (editor: unknown) => void }).broadcastEditorCreate(editor);
    expect(readySpy).toHaveBeenCalledTimes(1);
  });

  it('locks superdoc via ydoc metadata and emits event', async () => {
    createAppHarness();

    const metaSet = vi.fn();
    const metaMap = { set: metaSet };

    const instance = new SuperDoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    (
      instance.config as { documents: { ydoc: { getMap: () => typeof metaMap; transact: (fn: () => void) => void } }[] }
    ).documents = [
      {
        ydoc: {
          getMap: vi.fn(() => metaMap),
          transact: (fn: () => void) => fn(),
        },
      },
    ];

    const lockedSpy = vi.fn();
    (instance as { on: (event: string, handler: (data: unknown) => void) => void }).on('locked', lockedSpy);

    (instance as { setLocked: (locked: boolean) => void }).setLocked(true);
    expect(metaSet).toHaveBeenNthCalledWith(1, 'locked', true);
    expect(metaSet).toHaveBeenNthCalledWith(2, 'lockedBy', (instance as { user: unknown }).user);
    expect(lockedSpy).not.toHaveBeenCalled();
    (instance as { lockSuperdoc: (locked: boolean, lockedBy: { name: string }) => void }).lockSuperdoc(true, {
      name: 'Admin',
    });
    expect(lockedSpy).toHaveBeenCalledWith({ isLocked: true, lockedBy: { name: 'Admin' } });
  });

  it('exports docx files alongside additional assets', async () => {
    createAppHarness();

    const instance = new SuperDoc({
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

    vi.spyOn(instance as { exportEditorsToDOCX: () => Promise<string[]> }, 'exportEditorsToDOCX').mockResolvedValue([
      'docx-blob',
    ]);

    const extraBlob = new Blob(['extra']);
    await (instance as { export: (params: Record<string, unknown>) => Promise<void> }).export({
      exportType: ['docx', 'txt'],
      additionalFiles: [extraBlob],
      additionalFileNames: ['extra.txt'],
      commentsType: 'all',
      triggerDownload: true,
    });

    expect(createZipMock).toHaveBeenCalled();
    expect(createDownloadMock).toHaveBeenCalledWith(expect.any(Object), 'Test-Export', 'zip');
  });

  it('falls back to original document data when an editor export yields no blob', async () => {
    createAppHarness();

    const instance = new SuperDoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: [],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    const originalBlob = { name: 'fallback.docx' };
    const exportDocxMock = vi.fn().mockResolvedValue(undefined);

    (
      instance as {
        superdocStore: {
          documents: {
            id: string;
            type: string;
            data: unknown;
            getEditor: () => { exportDocx: ReturnType<typeof vi.fn> };
          }[];
        };
      }
    ).superdocStore.documents = [
      {
        id: 'doc-1',
        type: DOCX,
        data: originalBlob,
        getEditor: () => ({ exportDocx: exportDocxMock }),
      },
    ];

    const results = await (instance as { exportEditorsToDOCX: () => Promise<unknown[]> }).exportEditorsToDOCX();

    expect(exportDocxMock).toHaveBeenCalledTimes(1);
    expect(results).toEqual([originalBlob]);
  });

  it('skips non-DOCX documents when exporting editors to DOCX', async () => {
    createAppHarness();

    const instance = new SuperDoc({
      selector: '#host',
      document: 'https://example.com/doc.pdf',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: [],
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    const docxBlob = { name: 'doc-1.docx', type: DOCX };
    const pdfBlob = { name: 'doc-2.pdf', type: PDF };

    (
      instance as { superdocStore: { documents: { id: string; type: string; data: unknown; getEditor: () => null }[] } }
    ).superdocStore.documents = [
      {
        id: 'doc-1',
        type: DOCX,
        data: docxBlob,
        getEditor: () => null,
      },
      {
        id: 'doc-2',
        type: PDF,
        data: pdfBlob,
        getEditor: () => null,
      },
    ];

    const results = await (instance as { exportEditorsToDOCX: () => Promise<unknown[]> }).exportEditorsToDOCX();

    expect(results).toEqual([docxBlob]);
  });

  it('destroys app and cleans providers', async () => {
    const { app } = createAppHarness();

    const instance = new SuperDoc({
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

    const provider = (
      instance as { provider: { disconnect: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> } }
    ).provider;
    const processedDocs = (
      instance.config as {
        documents: {
          provider: { disconnect: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
          ydoc: { destroy: ReturnType<typeof vi.fn> };
        }[];
      }
    ).documents;

    (instance as { destroy: () => void }).destroy();

    expect(provider.disconnect).toHaveBeenCalled();
    expect(provider.destroy).toHaveBeenCalled();
    processedDocs.forEach((doc) => {
      expect(doc.provider.disconnect).toHaveBeenCalled();
      expect(doc.provider.destroy).toHaveBeenCalled();
      expect(doc.ydoc.destroy).toHaveBeenCalled();
    });
    expect(app.unmount).toHaveBeenCalled();
    expect(
      (instance as { app: { config: { globalProperties: { $config?: unknown } } } }).app.config.globalProperties
        .$config,
    ).toBeUndefined();
    expect((instance as { listenerCount: (event: string) => number }).listenerCount('ready')).toBe(0);
  });

  it('removes comments in viewing mode and restores them when returning to editing', async () => {
    const { superdocStore } = createAppHarness();
    const removeComments = vi.fn();
    const restoreComments = vi.fn();
    const setDocumentMode = vi.fn();
    const docStub = {
      removeComments,
      restoreComments,
      getEditor: vi.fn(() => ({ setDocumentMode })),
      getPresentationEditor: vi.fn(() => null),
    };
    (superdocStore.documents as unknown[]) = [docStub];

    const instance = new SuperDoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      role: 'editor',
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    (instance as { setDocumentMode: (mode: string) => void }).setDocumentMode('viewing');
    expect(removeComments).toHaveBeenCalledTimes(1);
    expect(setDocumentMode).toHaveBeenLastCalledWith('viewing');

    (instance as { setDocumentMode: (mode: string) => void }).setDocumentMode('editing');
    expect(restoreComments).toHaveBeenCalledTimes(1);
    expect(setDocumentMode).toHaveBeenLastCalledWith('editing');
  });

  it('skips rendering comments list when role is viewer', async () => {
    createAppHarness();

    const instance = new SuperDoc({
      selector: '#host',
      document: 'https://example.com/doc.docx',
      documents: [],
      modules: { comments: {}, toolbar: {} },
      colors: ['red'],
      role: 'viewer',
      user: { name: 'Jane', email: 'jane@example.com' },
      onException: vi.fn(),
    });
    await flushMicrotasks();

    const container = document.createElement('div');
    (instance as { addCommentsList: (container: HTMLElement) => void }).addCommentsList(container);

    expect(superCommentsConstructor).not.toHaveBeenCalled();
    expect(
      (instance.config as { modules: { comments: { element?: unknown } } }).modules.comments.element,
    ).toBeUndefined();
    expect((instance as { commentsList?: unknown }).commentsList).toBeUndefined();
  });

  it('applies CSP nonce to style tags when configured', async () => {
    createAppHarness();

    new SuperDoc({
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

  describe('SuperDoc document normalization', () => {
    describe('real-world document handling', () => {
      it('handles File from browser input', async () => {
        createAppHarness();

        // Real browser File object
        const file = new File(['content'], 'contract.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const instance = new SuperDoc({
          selector: '#host',
          document: file,
        });
        await flushMicrotasks();

        expect((instance.config as { documents: unknown[] }).documents).toHaveLength(1);
        expect(
          (instance.config as { documents: { id: string; type: string; name: string; isNewFile: boolean }[] })
            .documents[0],
        ).toMatchObject({
          id: expect.any(String),
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: 'contract.docx',
          isNewFile: true,
        });
        expect((instance.config as { documents: { data: File }[] }).documents[0].data).toBe(file);
      });

      it('handles Blob from fetch response', async () => {
        createAppHarness();

        // Simulates fetch().then(res => res.blob())
        const blob = new Blob(['content'], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const instance = new SuperDoc({
          selector: '#host',
          document: blob,
        });
        await flushMicrotasks();

        expect((instance.config as { documents: unknown[] }).documents).toHaveLength(1);
        expect(
          (instance.config as { documents: { id: string; type: string; name: string; isNewFile: boolean }[] })
            .documents[0],
        ).toMatchObject({
          id: expect.any(String),
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: 'document', // Default name for Blobs
          isNewFile: true,
        });
        // Blob should be wrapped as File
        expect((instance.config as { documents: { data: File }[] }).documents[0].data).toBeInstanceOf(File);
      });

      it('handles File with empty type (browser edge case)', async () => {
        createAppHarness();

        // Some browsers can't determine MIME type
        const file = new File(['content'], 'report.docx', { type: '' });

        const instance = new SuperDoc({
          selector: '#host',
          document: file,
        });
        await flushMicrotasks();

        expect((instance.config as { documents: unknown[] }).documents).toHaveLength(1);
        // Should infer type from filename
        expect((instance.config as { documents: { type: string }[] }).documents[0].type).toBe(DOCX);
      });

      it('handles Blob without type', async () => {
        createAppHarness();

        // Untyped Blob (edge case)
        const blob = new Blob(['content']);

        const instance = new SuperDoc({
          selector: '#host',
          document: blob,
        });
        await flushMicrotasks();

        expect((instance.config as { documents: unknown[] }).documents).toHaveLength(1);
        // Should default to DOCX
        expect((instance.config as { documents: { type: string; name: string }[] }).documents[0].type).toBe(DOCX);
        expect((instance.config as { documents: { type: string; name: string }[] }).documents[0].name).toBe('document');
      });
    });

    describe('ID generation', () => {
      it('generates IDs for all document types', async () => {
        createAppHarness();

        const testCases: { document: string | File | Blob | { data: Blob; name: string; type: string } }[] = [
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
          const instance = new SuperDoc({
            selector: '#host',
            ...config,
          });
          await flushMicrotasks();

          expect((instance.config as { documents: { id: string }[] }).documents[0].id).toBeDefined();
          expect((instance.config as { documents: { id: string }[] }).documents[0].id).toMatch(/^(uuid-1234|doc-)/);
        }
      });

      it('leaves non-object entries untouched when normalizing arrays', async () => {
        createAppHarness();

        const instance = new SuperDoc({
          selector: '#host',
          documents: [null, { type: DOCX, data: new Blob(['test'], { type: DOCX }), name: 'doc.docx' }],
        });
        await flushMicrotasks();

        expect(
          (instance.config as { documents: (null | { id: string; type: string; name: string })[] }).documents[0],
        ).toBeNull();
        expect(
          (instance.config as { documents: (null | { id: string; type: string; name: string })[] }).documents[1],
        ).toMatchObject({
          id: 'uuid-1234',
          type: DOCX,
          name: 'doc.docx',
        });
      });

      it('preserves existing IDs in documents array', async () => {
        createAppHarness();

        const instance = new SuperDoc({
          selector: '#host',
          documents: [
            { id: 'custom-id-1', type: DOCX, data: new Blob(['test']) },
            { type: DOCX, url: 'test.docx' }, // No ID
          ],
        });
        await flushMicrotasks();

        expect((instance.config as { documents: { id: string }[] }).documents[0].id).toBe('custom-id-1');
        expect((instance.config as { documents: { id: string }[] }).documents[1].id).toBeDefined();
        expect((instance.config as { documents: { id: string }[] }).documents[1].id).not.toBe('custom-id-1');
      });
    });

    describe('backward compatibility', () => {
      it('still handles document config objects', async () => {
        createAppHarness();

        const blob = new Blob(['test'], { type: DOCX });
        const instance = new SuperDoc({
          selector: '#host',
          document: {
            data: blob,
            name: 'custom.docx',
            type: DOCX,
          },
        });
        await flushMicrotasks();

        expect((instance.config as { documents: unknown[] }).documents).toHaveLength(1);
        expect(
          (instance.config as { documents: { id: string; type: string; name: string }[] }).documents[0],
        ).toMatchObject({
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
        const instance = new SuperDoc({
          selector: '#host',
          document: {
            data: blob,
            name: 'custom.docx',
            type: DOCX,
            isNewFile: true, // Explicitly set
          },
        });
        await flushMicrotasks();

        expect(
          (instance.config as { documents: { id: string; type: string; name: string; isNewFile: boolean }[] })
            .documents[0],
        ).toMatchObject({
          id: expect.any(String),
          type: DOCX,
          name: 'custom.docx',
          isNewFile: true,
        });
      });
    });
  });
});
