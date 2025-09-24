import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('y-prosemirror', () => ({
  ySyncPlugin: vi.fn(() => 'y-sync-plugin'),
  prosemirrorToYDoc: vi.fn(),
}));

vi.mock('yjs', () => ({
  encodeStateAsUpdate: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

import * as YProsemirror from 'y-prosemirror';
import * as Yjs from 'yjs';

import * as CollaborationModule from './collaboration.js';
import * as CollaborationHelpers from './collaboration-helpers.js';

const { Collaboration, CollaborationPluginKey, createSyncPlugin, initializeMetaMap, generateCollaborationData } =
  CollaborationModule;
const { updateYdocDocxData } = CollaborationHelpers;

const createYMap = (initial = {}) => {
  const store = new Map(Object.entries(initial));
  let observer;
  return {
    set: vi.fn((key, value) => {
      store.set(key, value);
    }),
    get: vi.fn((key) => store.get(key)),
    observe: vi.fn((fn) => {
      observer = fn;
    }),
    _trigger(keys) {
      observer?.({ changes: { keys } });
    },
    store,
  };
};

const createYDocStub = ({ docxValue, hasDocx = true } = {}) => {
  const initialMetaEntries = hasDocx ? { docx: docxValue ?? [] } : {};
  const metas = createYMap(initialMetaEntries);
  if (!hasDocx) metas.store.delete('docx');
  const media = createYMap();
  const listeners = {};
  return {
    getXmlFragment: vi.fn(() => ({ fragment: true })),
    getMap: vi.fn((name) => (name === 'meta' ? metas : media)),
    on: vi.fn((event, handler) => {
      listeners[event] = handler;
    }),
    transact: vi.fn((fn, meta) => fn(meta)),
    _maps: { metas, media },
    _listeners: listeners,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('collaboration helpers', () => {
  it('updates docx payloads inside the ydoc meta map', async () => {
    const ydoc = createYDocStub();
    const metas = ydoc._maps.metas;
    metas.store.set('docx', [{ name: 'word/document.xml', content: '<old />' }]);

    const editor = {
      options: { ydoc, user: { id: 'user-1' } },
      exportDocx: vi.fn().mockResolvedValue({ 'word/document.xml': '<new />', 'word/styles.xml': '<styles />' }),
    };

    await updateYdocDocxData(editor);

    expect(editor.exportDocx).toHaveBeenCalledWith({ getUpdatedDocs: true });
    expect(metas.set).toHaveBeenCalledWith('docx', [
      { name: 'word/document.xml', content: '<new />' },
      { name: 'word/styles.xml', content: '<styles />' },
    ]);
    expect(ydoc.transact).toHaveBeenCalledWith(expect.any(Function), {
      event: 'docx-update',
      user: editor.options.user,
    });
  });

  it('returns early when neither explicit ydoc nor editor.options.ydoc exist', async () => {
    const editor = {
      options: { ydoc: null, user: { id: 'user-1' }, content: [] },
      exportDocx: vi.fn(),
    };

    await updateYdocDocxData(editor);

    expect(editor.exportDocx).not.toHaveBeenCalled();
  });

  it('normalizes docx arrays via toArray when meta map stores a Y.Array-like structure', async () => {
    const docxSource = {
      toArray: vi.fn(() => [{ name: 'word/document.xml', content: '<old />' }]),
    };
    const ydoc = createYDocStub({ docxValue: docxSource });
    const metas = ydoc._maps.metas;

    const editor = {
      options: { ydoc, user: { id: 'user-2' }, content: [] },
      exportDocx: vi.fn().mockResolvedValue({
        'word/document.xml': '<new />',
        'word/styles.xml': '<styles />',
      }),
    };

    await updateYdocDocxData(editor);

    expect(docxSource.toArray).toHaveBeenCalled();
    expect(metas.set).toHaveBeenCalledWith('docx', [
      { name: 'word/document.xml', content: '<new />' },
      { name: 'word/styles.xml', content: '<styles />' },
    ]);
  });

  it('normalizes docx payloads when meta map stores an iterable collection', async () => {
    const docxSet = new Set([
      { name: 'word/document.xml', content: '<old />' },
      { name: 'word/numbering.xml', content: '<numbers />' },
    ]);
    const ydoc = createYDocStub({ docxValue: docxSet });
    const metas = ydoc._maps.metas;

    const editor = {
      options: { ydoc, user: { id: 'user-3' }, content: [] },
      exportDocx: vi.fn().mockResolvedValue({ 'word/document.xml': '<new />' }),
    };

    await updateYdocDocxData(editor);

    expect(metas.set).toHaveBeenCalledWith('docx', [
      { name: 'word/numbering.xml', content: '<numbers />' },
      { name: 'word/document.xml', content: '<new />' },
    ]);
  });

  it('falls back to editor options content when no docx entry exists in the meta map', async () => {
    const initialContent = [
      { name: 'word/document.xml', content: '<initial />' },
      { name: 'word/footnotes.xml', content: '<foot />' },
    ];
    const ydoc = createYDocStub({ hasDocx: false });
    const metas = ydoc._maps.metas;

    const editor = {
      options: { ydoc, user: { id: 'user-4' }, content: initialContent },
      exportDocx: vi.fn().mockResolvedValue({ 'word/document.xml': '<updated />' }),
    };

    await updateYdocDocxData(editor);

    expect(metas.set).toHaveBeenCalledWith('docx', [
      { name: 'word/footnotes.xml', content: '<foot />' },
      { name: 'word/document.xml', content: '<updated />' },
    ]);
    const originalDocEntry = initialContent.find((entry) => entry.name === 'word/document.xml');
    expect(originalDocEntry.content).toBe('<initial />');
  });

  it('prefers the explicit ydoc argument over editor options', async () => {
    const optionsYdoc = createYDocStub();
    const explicitYdoc = createYDocStub();
    explicitYdoc._maps.metas.store.set('docx', [{ name: 'word/document.xml', content: '<old explicit />' }]);

    const editor = {
      options: { ydoc: optionsYdoc, user: { id: 'user-5' } },
      exportDocx: vi.fn().mockResolvedValue({ 'word/document.xml': '<new explicit />' }),
    };

    await updateYdocDocxData(editor, explicitYdoc);

    expect(explicitYdoc._maps.metas.set).toHaveBeenCalledWith('docx', [
      { name: 'word/document.xml', content: '<new explicit />' },
    ]);
    expect(optionsYdoc._maps.metas.set).not.toHaveBeenCalled();
  });
});

describe('collaboration extension', () => {
  it('skips plugin registration when no ydoc present', () => {
    const result = Collaboration.config.addPmPlugins.call({ editor: { options: {} } });
    expect(result).toEqual([]);
  });

  it('configures sync plugin and listeners when ydoc exists', () => {
    const ydoc = createYDocStub();
    const editorState = { doc: {} };
    const provider = { synced: false, on: vi.fn(), off: vi.fn() };
    const editor = {
      options: {
        isHeadless: false,
        ydoc,
        collaborationProvider: provider,
      },
      storage: { image: { media: {} } },
      emit: vi.fn(),
      view: { state: editorState, dispatch: vi.fn() },
    };

    const context = { editor, options: {} };

    const [plugin] = Collaboration.config.addPmPlugins.call(context);

    expect(plugin).toBe('y-sync-plugin');
    expect(YProsemirror.ySyncPlugin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ onFirstRender: expect.any(Function) }),
    );
    expect(provider.on).toHaveBeenCalledWith('synced', expect.any(Function));
    expect(ydoc.on).toHaveBeenCalledWith('afterTransaction', expect.any(Function));

    const mediaObserver = ydoc._maps.media.observe.mock.calls[0][0];
    ydoc._maps.media.get.mockReturnValue({ blob: true });
    mediaObserver({ changes: { keys: new Map([['word/media/image.png', {}]]) } });
    expect(editor.storage.image.media['word/media/image.png']).toEqual({ blob: true });
  });

  it('creates sync plugin fragment via helper', () => {
    const ydoc = createYDocStub();
    const editor = {
      options: {
        isNewFile: true,
        content: { 'word/document.xml': '<doc />' },
        fonts: { font1: 'binary' },
        mediaFiles: { 'word/media/img.png': new Uint8Array([1]) },
      },
    };

    const [plugin, fragment] = createSyncPlugin(ydoc, editor);
    expect(plugin).toBe('y-sync-plugin');
    expect(fragment).toEqual({ fragment: true });

    const { onFirstRender } = YProsemirror.ySyncPlugin.mock.calls[0][1];
    onFirstRender();
    expect(ydoc._maps.metas.set).toHaveBeenCalledWith('docx', editor.options.content);
  });

  it('initializes meta map with content, fonts, and media', () => {
    const ydoc = createYDocStub();
    const editor = {
      options: {
        content: { 'word/document.xml': '<doc />' },
        fonts: { 'font1.ttf': new Uint8Array([1]) },
        mediaFiles: { 'word/media/img.png': new Uint8Array([5]) },
      },
    };

    initializeMetaMap(ydoc, editor);

    const metaStore = ydoc._maps.metas.store;
    expect(metaStore.get('docx')).toEqual(editor.options.content);
    expect(metaStore.get('fonts')).toEqual(editor.options.fonts);
    expect(ydoc._maps.media.set).toHaveBeenCalledWith('word/media/img.png', new Uint8Array([5]));
  });

  it('generates collaboration data and encodes ydoc update', async () => {
    const ydoc = createYDocStub();
    const doc = { type: 'doc' };
    YProsemirror.prosemirrorToYDoc.mockReturnValue(ydoc);
    const editor = {
      state: { doc },
      options: {
        content: [{ name: 'word/document.xml', content: '<doc />' }],
        fonts: {},
        mediaFiles: {},
        user: { id: 'user' },
      },
      exportDocx: vi.fn().mockResolvedValue({ 'word/document.xml': '<updated />' }),
    };

    const data = await generateCollaborationData(editor);

    expect(YProsemirror.prosemirrorToYDoc).toHaveBeenCalledWith(doc, 'supereditor');
    expect(Yjs.encodeStateAsUpdate).toHaveBeenCalledWith(ydoc);
    expect(editor.exportDocx).toHaveBeenCalled();
    expect(data).toBeInstanceOf(Uint8Array);
  });
});
