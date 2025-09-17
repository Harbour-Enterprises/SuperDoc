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

const createYDocStub = () => {
  const metas = createYMap({ docx: [] });
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
