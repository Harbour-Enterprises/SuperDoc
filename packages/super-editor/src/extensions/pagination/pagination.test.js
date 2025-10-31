import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { getExtensionConfigField } from '../../core/helpers/getExtensionConfigField.js';

vi.mock('./plugin/helpers/create-measurement-engine.js', () => ({
  createMeasurementEngine: vi.fn(),
}));

vi.mock('./header-footer-repository.js', () => ({
  createHeaderFooterRepository: vi.fn(),
}));

let createMeasurementEngineMock;
let createHeaderFooterRepositoryMock;

const createTransactionStub = () => {
  const tr = {
    setMeta: vi.fn(function setMeta() {
      return this;
    }),
  };
  tr.setMeta.mockImplementation(function setMeta() {
    return tr;
  });
  return tr;
};

const createEditorStub = (storage, options = {}) => {
  const tr = createTransactionStub();
  const dom = globalThis.document?.createElement?.('div') ?? { parentNode: null };

  const editor = {
    options: { pagination: true, ...options },
    converter: { pageStyles: {} },
    storage: { pagination: storage },
    view: {
      dom,
      state: {
        tr,
      },
      dispatch: vi.fn(),
    },
    state: { tr },
    commands: {
      updatePagination: vi.fn(),
    },
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  return editor;
};

describe('pagination extension measurement integration', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ createMeasurementEngine: createMeasurementEngineMock } = await import(
      './plugin/helpers/create-measurement-engine.js'
    ));
    ({ createHeaderFooterRepository: createHeaderFooterRepositoryMock } = await import(
      './header-footer-repository.js'
    ));
    createMeasurementEngineMock.mockReset();
    createHeaderFooterRepositoryMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('instantiates the measurement engine when a repository becomes available', async () => {
    const mockEngine = {
      refreshHeaderFooterMeasurements: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      pageBreaks: [],
    };

    createMeasurementEngineMock.mockImplementation((editor) => {
      editor.storage.pagination.engine = mockEngine;
      return mockEngine;
    });
    createHeaderFooterRepositoryMock.mockImplementation(() => ({ list: vi.fn(() => []) }));

    const { Pagination } = await import('./pagination.js');
    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: null,
      repository: null,
      engineHandler: null,
    };
    const editor = createEditorStub(storage);

    const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', { editor, storage });
    onBeforeCreate?.();
    await Promise.resolve();

    expect(createHeaderFooterRepositoryMock).toHaveBeenCalledTimes(1);
    expect(createMeasurementEngineMock).toHaveBeenCalledTimes(1);
    expect(createMeasurementEngineMock).toHaveBeenCalledWith(
      editor,
      expect.objectContaining({ headerFooterRepository: expect.any(Object) }),
    );
    expect(storage.engine).toBe(mockEngine);
    expect(editor.emit).toHaveBeenCalledWith('pagination:engine-ready', { engine: mockEngine });
    expect(editor.emit).toHaveBeenCalledWith(
      'pagination:repository-ready',
      expect.objectContaining({ repository: expect.any(Object), engine: mockEngine }),
    );
  });

  it('passes a host-provided measurement element override to the measurement engine', async () => {
    const measurementElement = globalThis.document?.createElement('div') ?? { id: 'measurement-root' };
    if (typeof Element !== 'undefined' && measurementElement instanceof Element) {
      measurementElement.id = 'measurement-root';
    }
    const mockEngine = {
      refreshHeaderFooterMeasurements: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      pageBreaks: [],
    };

    createMeasurementEngineMock.mockImplementation((editor) => {
      editor.storage.pagination.engine = mockEngine;
      return mockEngine;
    });
    createHeaderFooterRepositoryMock.mockImplementation(() => ({ list: vi.fn(() => []) }));

    const { Pagination } = await import('./pagination.js');
    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: null,
      repository: null,
      engineHandler: null,
    };
    const editor = createEditorStub(storage, { paginationMeasurementElement: measurementElement });

    const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', { editor, storage });
    onBeforeCreate?.();
    await Promise.resolve();

    expect(createMeasurementEngineMock).toHaveBeenCalledWith(
      editor,
      expect.objectContaining({ element: measurementElement }),
    );
    expect(editor.emit).toHaveBeenCalledWith('pagination:engine-ready', { engine: mockEngine });
    expect(editor.emit).toHaveBeenCalledWith(
      'pagination:repository-ready',
      expect.objectContaining({ repository: expect.any(Object), engine: mockEngine }),
    );
  });

  it('skips measurement engine initialization until the editor view is ready', async () => {
    const mockEngine = {
      refreshHeaderFooterMeasurements: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      pageBreaks: [],
    };

    createMeasurementEngineMock.mockImplementation((editor) => {
      editor.storage.pagination.engine = mockEngine;
      return mockEngine;
    });
    createHeaderFooterRepositoryMock.mockImplementation(() => ({ list: vi.fn(() => []) }));

    const { Pagination } = await import('./pagination.js');
    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: null,
      repository: null,
      engineHandler: null,
    };

    const editorWithoutView = {
      options: { pagination: true },
      converter: { pageStyles: {} },
      storage: { pagination: storage },
      view: null,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', {
      editor: editorWithoutView,
      storage,
    });

    onBeforeCreate?.();

    expect(createHeaderFooterRepositoryMock).toHaveBeenCalledTimes(1);
    expect(createMeasurementEngineMock).not.toHaveBeenCalled();
    expect(editorWithoutView.emit).not.toHaveBeenCalled();

    const editorViewStub = createEditorStub(storage).view;
    editorWithoutView.view = editorViewStub;

    const onCreate = getExtensionConfigField(Pagination, 'onCreate', {
      editor: editorWithoutView,
      storage,
    });
    onCreate?.();

    expect(createMeasurementEngineMock).toHaveBeenCalledTimes(1);
    expect(storage.engine).toBe(mockEngine);
    expect(editorWithoutView.emit).toHaveBeenCalledWith('pagination:engine-ready', { engine: mockEngine });
    expect(editorWithoutView.emit).toHaveBeenCalledWith(
      'pagination:repository-ready',
      expect.objectContaining({ repository: expect.any(Object), engine: mockEngine }),
    );
  });

  it('destroys the measurement engine during extension teardown', async () => {
    const mockEngine = {
      refreshHeaderFooterMeasurements: vi.fn(),
      destroy: vi.fn(),
      pageBreaks: [],
    };

    createMeasurementEngineMock.mockImplementation((editor) => {
      editor.storage.pagination.engine = mockEngine;
      return mockEngine;
    });
    createHeaderFooterRepositoryMock.mockImplementation(() => ({ list: vi.fn(() => []) }));

    const { Pagination } = await import('./pagination.js');

    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: null,
      repository: null,
      engineHandler: null,
    };

    const editor = createEditorStub(storage);

    const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', { editor, storage });
    onBeforeCreate?.();
    await Promise.resolve();

    const onCreate = getExtensionConfigField(Pagination, 'onCreate', { editor, storage });
    onCreate?.();
    await Promise.resolve();

    expect(createMeasurementEngineMock).toHaveBeenCalled();
    expect(storage.engine).toBe(mockEngine);

    mockEngine.destroy.mockClear();

    const onDestroy = getExtensionConfigField(Pagination, 'onDestroy', { editor, storage });
    onDestroy?.();

    expect(mockEngine.destroy).toHaveBeenCalledTimes(1);
    expect(storage.engine).toBeNull();
    expect(storage.engineHandler).toBeNull();
    expect(editor.emit).toHaveBeenCalledWith('pagination:engine-destroyed', {
      engine: mockEngine,
      reason: 'extension-destroy',
    });
  });

  it('emits pagination:update when layout changes', async () => {
    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: null,
      repository: null,
      engineHandler: null,
    };

    const editor = createEditorStub(storage);
    storage.engine = {}; // ensure pagination treats the measurement engine as available

    const { onPageBreaksUpdate } = await import('./plugin/helpers/on-page-breaks-update.js');

    const layout = {
      pages: [
        {
          pageIndex: 0,
          break: { top: 100, pos: 10 },
          metrics: { marginTopPx: 10, pageHeightPx: 792 },
        },
      ],
    };

    onPageBreaksUpdate(editor, layout);

    expect(editor.view.dispatch).toHaveBeenCalledTimes(1);
    expect(editor.emit).toHaveBeenCalledWith(
      'pagination:update',
      expect.objectContaining({
        layout,
        pages: expect.any(Array),
        pageBreaks: expect.any(Array),
      }),
    );
  });

  it('applies manual layout updates through the measurement engine when available', async () => {
    const engineMock = {
      applyLayoutOverride: vi.fn(),
    };

    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: engineMock,
      repository: null,
      engineHandler: null,
    };

    const editor = createEditorStub(storage);

    const { Pagination } = await import('./pagination.js');
    const addCommands = getExtensionConfigField(Pagination, 'addCommands', { editor, storage });
    const commands = addCommands?.() ?? {};

    expect(typeof commands.applyManualPaginationLayout).toBe('function');

    const layout = { pages: [] };
    const command = commands.applyManualPaginationLayout(layout, { source: 'test-harness' });
    const applied = command({ editor });

    expect(applied).toBe(true);
    expect(engineMock.applyLayoutOverride).toHaveBeenCalledWith(layout, { source: 'test-harness' });
  });

  it('falls back to updatePagination when the measurement engine is unavailable', async () => {
    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: null,
      repository: null,
      engineHandler: null,
    };

    const editor = createEditorStub(storage);

    const { Pagination } = await import('./pagination.js');
    const addCommands = getExtensionConfigField(Pagination, 'addCommands', { editor, storage });
    const commands = addCommands?.() ?? {};

    const layout = { pages: [] };
    const command = commands.applyManualPaginationLayout(layout);
    const applied = command({ editor });

    expect(applied).toBe(true);
    expect(editor.commands.updatePagination).toHaveBeenCalledWith(layout);
  });

  it('keeps the measurement engine alive when the repository is temporarily unavailable', async () => {
    const mockEngine = {
      refreshHeaderFooterMeasurements: vi.fn(),
      destroy: vi.fn(),
      pageBreaks: [],
    };

    createMeasurementEngineMock.mockImplementation((editor) => {
      editor.storage.pagination.engine = mockEngine;
      return mockEngine;
    });
    createHeaderFooterRepositoryMock.mockImplementation(() => ({ list: vi.fn(() => []) }));

    const { Pagination } = await import('./pagination.js');

    const storage = {
      pendingInitMeta: false,
      lastInitReason: null,
      engine: null,
      repository: null,
      engineHandler: null,
    };

    const editor = createEditorStub(storage);

    const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', { editor, storage });
    onBeforeCreate?.();
    await Promise.resolve();

    expect(storage.engine).toBe(mockEngine);

    editor.emit.mockClear();
    mockEngine.destroy.mockClear();

    storage.repository = null;
    storage.repositoryConverter = null;
    createHeaderFooterRepositoryMock.mockImplementation(() => {
      throw new Error('repository unavailable');
    });

    const onTransaction = getExtensionConfigField(Pagination, 'onTransaction', { editor, storage });
    const handler = onTransaction?.();
    handler?.({ transaction: { getMeta: () => null } });

    expect(mockEngine.destroy).not.toHaveBeenCalled();
    expect(storage.engine).toBe(mockEngine);
    const emittedEvents = editor.emit.mock.calls.map(([eventName]) => eventName);
    expect(emittedEvents).not.toContain('pagination:repository-cleared');
    expect(emittedEvents).not.toContain('pagination:engine-destroyed');
  });

  it('falls back to converter page margins when slot offsets are missing', async () => {
    const { Pagination } = await import('./pagination.js');

    const mount = document.createElement('div');
    const viewContainer = document.createElement('div');
    const viewDom = document.createElement('div');
    viewContainer.appendChild(viewDom);
    mount.appendChild(viewContainer);
    document.body.appendChild(mount);

    const tr = {
      setMeta: vi.fn(function setMeta() {
        return this;
      }),
    };

    const storage = {
      pageChromeNodes: [],
      layout: null,
    };

    const editor = {
      options: { pagination: true, element: mount },
      converter: { pageStyles: { pageMargins: { left: 1, right: 1 } } },
      storage: { pagination: storage },
      view: {
        dom: viewDom,
        state: { tr },
        dispatch: vi.fn(),
      },
      state: { tr },
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const addCommands = getExtensionConfigField(Pagination, 'addCommands', { editor, storage });
      const commands = addCommands?.() ?? {};
      const updatePagination = commands.updatePagination?.({
        pages: [
          {
            pageIndex: 0,
            pageTopOffsetPx: 0,
            pageGapPx: 20,
            break: { startOffsetPx: 0, pos: 0, top: 60 },
            metrics: {
              marginLeftPx: null,
              marginRightPx: null,
            },
            headerFooterAreas: {
              header: {
                reservedHeightPx: 72,
                metrics: { offsetPx: 36, contentHeightPx: 24, effectiveHeightPx: 60 },
              },
              footer: null,
            },
          },
        ],
      });

      expect(typeof updatePagination).toBe('function');
      updatePagination?.({ editor });

      const slot = mount.querySelector('.super-editor-page-section-slot[data-pagination-section="header"]');
      expect(slot).toBeTruthy();
      expect(slot?.style.left).toBe('96px');
      expect(slot?.style.right).toBe('96px');
    } finally {
      consoleSpy.mockRestore();
      mount.remove();
    }
  });

  it('reuses a stored clip-path id when regenerating pagination chrome', async () => {
    const { Pagination } = await import('./pagination.js');

    const mount = document.createElement('div');
    const viewContainer = document.createElement('div');
    const viewDom = document.createElement('div');
    viewContainer.appendChild(viewDom);
    mount.appendChild(viewContainer);
    document.body.appendChild(mount);

    const tr = createTransactionStub();
    const storage = {
      pageChromeNodes: [],
      layout: null,
      clipPathId: null,
    };

    const editor = {
      options: { pagination: true, element: mount },
      converter: { pageStyles: {} },
      storage: { pagination: storage },
      view: {
        dom: viewDom,
        state: { tr },
        dispatch: vi.fn(),
      },
      state: { tr },
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    const addCommands = getExtensionConfigField(Pagination, 'addCommands', { editor, storage });
    const commands = addCommands?.() ?? {};
    const layout = {
      pages: [
        {
          pageIndex: 0,
          pageTopOffsetPx: 0,
          pageGapPx: 20,
          break: { startOffsetPx: 0, pos: 0, top: 60 },
          metrics: {
            pageHeightPx: 1056,
            pageWidthPx: 816,
          },
        },
      ],
    };

    const command = commands.updatePagination?.(layout);
    expect(typeof command).toBe('function');
    command?.({ editor });

    expect(typeof storage.clipPathId).toBe('string');
    const firstClipPathId = storage.clipPathId;
    expect(firstClipPathId).toMatch(/^pagination-content-clip-/);
    expect(viewDom.style.clipPath).toBe(`url(#${firstClipPathId})`);

    const initialClipPath = mount.querySelector('clipPath');
    expect(initialClipPath?.id).toBe(firstClipPathId);

    const secondLayout = {
      pages: [
        {
          pageIndex: 0,
          pageTopOffsetPx: 0,
          pageGapPx: 20,
          break: { startOffsetPx: 0, pos: 0, top: 60 },
          metrics: {
            pageHeightPx: 1056,
            pageWidthPx: 816,
          },
        },
        {
          pageIndex: 1,
          pageTopOffsetPx: 1200,
          pageGapPx: 20,
          break: { startOffsetPx: 0, pos: 200, top: 60 },
          metrics: {
            pageHeightPx: 1056,
            pageWidthPx: 816,
          },
        },
      ],
    };

    const secondCommand = commands.updatePagination?.(secondLayout);
    expect(typeof secondCommand).toBe('function');
    secondCommand?.({ editor });

    expect(storage.clipPathId).toBe(firstClipPathId);
    expect(viewDom.style.clipPath).toBe(`url(#${firstClipPathId})`);
    const regeneratedClipPath = mount.querySelector('clipPath');
    expect(regeneratedClipPath?.id).toBe(firstClipPathId);

    mount.remove();
  });

  it('assigns unique clip-path ids for separate editors', async () => {
    const { Pagination } = await import('./pagination.js');

    const createEditorWithMount = () => {
      const mount = document.createElement('div');
      const viewContainer = document.createElement('div');
      const viewDom = document.createElement('div');
      viewContainer.appendChild(viewDom);
      mount.appendChild(viewContainer);
      document.body.appendChild(mount);

      const tr = createTransactionStub();
      const storage = {
        pageChromeNodes: [],
        layout: null,
        clipPathId: null,
      };

      const editor = {
        options: { pagination: true, element: mount },
        converter: { pageStyles: {} },
        storage: { pagination: storage },
        view: {
          dom: viewDom,
          state: { tr },
          dispatch: vi.fn(),
        },
        state: { tr },
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };

      return { editor, storage, mount, viewDom };
    };

    const layout = {
      pages: [
        {
          pageIndex: 0,
          pageTopOffsetPx: 0,
          pageGapPx: 20,
          break: { startOffsetPx: 0, pos: 0, top: 60 },
          metrics: {
            pageHeightPx: 1056,
            pageWidthPx: 816,
          },
        },
      ],
    };

    const firstContext = createEditorWithMount();
    const firstAddCommands = getExtensionConfigField(Pagination, 'addCommands', {
      editor: firstContext.editor,
      storage: firstContext.storage,
    });
    const firstCommands = firstAddCommands?.() ?? {};
    expect(typeof firstCommands.updatePagination).toBe('function');
    const firstCommand = firstCommands.updatePagination?.(layout);
    expect(typeof firstCommand).toBe('function');
    firstCommand?.({ editor: firstContext.editor });

    const secondContext = createEditorWithMount();
    const secondAddCommands = getExtensionConfigField(Pagination, 'addCommands', {
      editor: secondContext.editor,
      storage: secondContext.storage,
    });
    const secondCommands = secondAddCommands?.() ?? {};
    expect(typeof secondCommands.updatePagination).toBe('function');
    const secondCommand = secondCommands.updatePagination?.(layout);
    expect(typeof secondCommand).toBe('function');
    secondCommand?.({ editor: secondContext.editor });

    expect(typeof firstContext.storage.clipPathId).toBe('string');
    expect(typeof secondContext.storage.clipPathId).toBe('string');
    expect(firstContext.storage.clipPathId).not.toBe(secondContext.storage.clipPathId);

    expect(firstContext.viewDom.style.clipPath).toBe(`url(#${firstContext.storage.clipPathId})`);
    expect(secondContext.viewDom.style.clipPath).toBe(`url(#${secondContext.storage.clipPathId})`);

    expect(firstContext.mount.querySelector(`clipPath#${firstContext.storage.clipPathId}`)).toBeTruthy();
    expect(secondContext.mount.querySelector(`clipPath#${secondContext.storage.clipPathId}`)).toBeTruthy();

    firstContext.mount.remove();
    secondContext.mount.remove();
  });

  describe('commands', () => {
    it('insertPageBreak inserts a hard break', async () => {
      const { Pagination } = await import('./pagination.js');
      const storage = {};
      const editor = {
        commands: {
          insertContent: vi.fn(() => true),
        },
        storage: { pagination: storage },
      };

      const addCommands = getExtensionConfigField(Pagination, 'addCommands', { editor, storage });
      const commands = addCommands?.() ?? {};

      expect(typeof commands.insertPageBreak).toBe('function');
      const command = commands.insertPageBreak();
      const result = command({ commands: editor.commands });

      expect(result).toBe(true);
      expect(editor.commands.insertContent).toHaveBeenCalledWith({ type: 'hardBreak' });
    });

    it('togglePaginationSpacingDebug toggles the debug flag', async () => {
      const { Pagination } = await import('./pagination.js');
      const tr = createTransactionStub();
      const storage = { showSpacingDebug: false };
      const editor = {
        storage: { pagination: storage },
        state: { tr },
        view: {
          state: { tr },
          dispatch: vi.fn(),
        },
      };

      const addCommands = getExtensionConfigField(Pagination, 'addCommands', { editor, storage });
      const commands = addCommands?.() ?? {};

      expect(typeof commands.togglePaginationSpacingDebug).toBe('function');

      // Toggle ON
      let command = commands.togglePaginationSpacingDebug();
      let result = command({ editor });

      expect(result).toBe(true);
      expect(storage.showSpacingDebug).toBe(true);
      expect(tr.setMeta).toHaveBeenCalledWith(expect.any(Object), { forceDecorationsUpdate: true });
      expect(editor.view.dispatch).toHaveBeenCalledWith(tr);

      // Toggle OFF
      tr.setMeta.mockClear();
      editor.view.dispatch.mockClear();

      command = commands.togglePaginationSpacingDebug();
      result = command({ editor });

      expect(result).toBe(true);
      expect(storage.showSpacingDebug).toBe(false);
      expect(tr.setMeta).toHaveBeenCalledWith(expect.any(Object), { forceDecorationsUpdate: true });
      expect(editor.view.dispatch).toHaveBeenCalledWith(tr);
    });
  });

  describe('shortcuts', () => {
    it('registers Mod-Enter for insertPageBreak', async () => {
      const { Pagination } = await import('./pagination.js');
      const editor = {
        commands: {
          insertPageBreak: vi.fn(() => true),
        },
      };

      const addShortcuts = getExtensionConfigField(Pagination, 'addShortcuts', { editor });
      const shortcuts = addShortcuts?.() ?? {};

      expect(typeof shortcuts['Mod-Enter']).toBe('function');
      const result = shortcuts['Mod-Enter']();

      expect(result).toBe(true);
      expect(editor.commands.insertPageBreak).toHaveBeenCalled();
    });
  });

  describe('shouldInitializePagination', () => {
    it('returns false when pagination option is disabled', async () => {
      const { Pagination } = await import('./pagination.js');
      const storage = {};
      const editor = createEditorStub(storage, { pagination: false });

      const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', { editor, storage });
      onBeforeCreate?.();

      // Should not attempt to create repository when pagination is disabled
      expect(createHeaderFooterRepositoryMock).not.toHaveBeenCalled();
    });

    it('returns false when editor is headless', async () => {
      const { Pagination } = await import('./pagination.js');
      const storage = {};
      const editor = createEditorStub(storage, { pagination: true, isHeadless: true });

      const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', { editor, storage });
      onBeforeCreate?.();

      expect(createHeaderFooterRepositoryMock).not.toHaveBeenCalled();
    });

    it('returns false when editor is a header/footer editor', async () => {
      const { Pagination } = await import('./pagination.js');
      const storage = {};
      const editor = createEditorStub(storage, { pagination: true, isHeaderOrFooter: true });

      const onBeforeCreate = getExtensionConfigField(Pagination, 'onBeforeCreate', { editor, storage });
      onBeforeCreate?.();

      expect(createHeaderFooterRepositoryMock).not.toHaveBeenCalled();
    });
  });

  describe('onDestroy', () => {
    it('skips engine destruction when destroying a header/footer editor', async () => {
      const mockEngine = {
        destroy: vi.fn(),
      };

      const { Pagination } = await import('./pagination.js');
      const storage = { engine: mockEngine };
      const editor = createEditorStub(storage, { isHeaderOrFooter: true });
      storage[Symbol('paginationRepositoryInitTimer')] = null;

      const onDestroy = getExtensionConfigField(Pagination, 'onDestroy', { editor, storage });
      onDestroy?.();

      expect(mockEngine.destroy).not.toHaveBeenCalled();
      expect(storage.engine).toBe(mockEngine); // Engine should still exist
    });
  });

  describe('transaction handling', () => {
    it('skips processing transactions with PAGINATION_INIT_SOURCE meta', async () => {
      createHeaderFooterRepositoryMock.mockImplementation(() => ({ list: vi.fn(() => []) }));

      const { Pagination, PaginationPluginKey } = await import('./pagination.js');
      const storage = { repository: null };
      const editor = createEditorStub(storage);

      const onTransaction = getExtensionConfigField(Pagination, 'onTransaction', { editor, storage });
      const handler = onTransaction?.();

      const transaction = {
        getMeta: vi.fn((key) => {
          if (key === PaginationPluginKey) {
            return { source: 'pagination-extension-init' };
          }
          return null;
        }),
      };

      editor.emit.mockClear();
      handler?.({ transaction });

      // Should not emit any pagination events when source is pagination-extension-init
      const emittedEvents = editor.emit.mock.calls.map(([eventName]) => eventName);
      expect(emittedEvents).not.toContain('pagination:repository-ready');
    });

    it('handles transaction processing gracefully', async () => {
      createHeaderFooterRepositoryMock.mockImplementation(() => ({ list: vi.fn(() => []) }));

      const { Pagination } = await import('./pagination.js');
      const storage = { repository: null, pendingInitMeta: false };
      const editor = createEditorStub(storage);

      const onTransaction = getExtensionConfigField(Pagination, 'onTransaction', { editor, storage });
      const handler = onTransaction?.();

      const transaction = {
        getMeta: vi.fn(() => null),
      };

      // Should not throw when processing a normal transaction
      expect(() => handler?.({ transaction })).not.toThrow();
    });
  });

  describe('plugin state', () => {
    it('initializes with empty decorations', async () => {
      const { Pagination } = await import('./pagination.js');
      const editor = createEditorStub({});

      const addPmPlugins = getExtensionConfigField(Pagination, 'addPmPlugins', { editor });
      const plugins = addPmPlugins?.() ?? [];

      expect(plugins).toHaveLength(1);
      const plugin = plugins[0];
      expect(plugin).toBeDefined();

      const state = plugin.spec.state;
      const initialState = state.init();

      expect(initialState.decorations).toBeDefined();
      expect(initialState.layout).toBeNull();
    });

    it('maps decorations through transaction', async () => {
      const { Pagination } = await import('./pagination.js');
      const editor = createEditorStub({});

      const addPmPlugins = getExtensionConfigField(Pagination, 'addPmPlugins', { editor });
      const plugins = addPmPlugins?.() ?? [];
      const plugin = plugins[0];

      const state = plugin.spec.state;
      const initialState = state.init();

      // Simulate transaction without layout change
      const mockDoc = { nodeSize: 10 };
      const mockMapping = { map: vi.fn((decorations) => decorations) };
      const tr = { mapping: mockMapping, doc: mockDoc, getMeta: vi.fn(() => null) };

      const newState = state.apply(tr, initialState);
      expect(newState.decorations).toBeDefined();
    });

    it('rebuilds decorations when layout meta is provided', async () => {
      const { Pagination } = await import('./pagination.js');
      const storage = { showSpacingDebug: false };
      const editor = createEditorStub(storage);

      const addPmPlugins = getExtensionConfigField(Pagination, 'addPmPlugins', { editor });
      const plugins = addPmPlugins?.() ?? [];
      const plugin = plugins[0];

      const state = plugin.spec.state;
      const initialState = state.init();

      const layout = {
        pages: [
          {
            pageIndex: 0,
            break: { pos: 10 },
            spacingAfterPx: 50,
            spacingSegments: [10],
          },
        ],
      };

      const mockDoc = { nodeSize: 100 };
      const tr = {
        mapping: { map: vi.fn((deco) => deco) },
        doc: mockDoc,
        getMeta: vi.fn((key) => ({ layout })),
      };

      const newState = state.apply(tr, initialState);
      expect(newState.layout).toEqual(layout);
      expect(newState.decorations).toBeDefined();
    });
  });

  describe('storage initialization', () => {
    it('initializes storage with default values', async () => {
      const { Pagination } = await import('./pagination.js');

      const addStorage = getExtensionConfigField(Pagination, 'addStorage');
      const storage = addStorage?.() ?? {};

      expect(storage.height).toBe(0);
      expect(storage.sectionData).toBeNull();
      expect(storage.headerFooterEditors).toBeInstanceOf(Map);
      expect(storage.headerFooterDomCache).toBeInstanceOf(Map);
      expect(storage.breakOverlayContainer).toBeNull();
      expect(storage.pendingOverlayRaf).toBeNull();
      expect(storage.repository).toBeNull();
      expect(storage.repositoryConverter).toBeNull();
      expect(storage.pendingInitMeta).toBe(false);
      expect(storage.lastInitReason).toBeNull();
      expect(Array.isArray(storage.pageBreaks)).toBe(true);
      expect(storage.engine).toBeNull();
      expect(storage.engineHandler).toBeNull();
      expect(storage.headerFooterSummary).toBeNull();
      expect(storage.pageViewElement).toBeNull();
      expect(Array.isArray(storage.pageChromeNodes)).toBe(true);
      expect(typeof storage.layout).toBe('object');
      expect(storage.showSpacingDebug).toBe(false);
      expect(storage.clipPathId).toBeNull();
    });
  });
});
