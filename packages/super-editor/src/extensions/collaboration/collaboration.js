import { Extension } from '@core/index.js';
import { PluginKey } from 'prosemirror-state';
import { encodeStateAsUpdate } from 'yjs';
import { ySyncPlugin, prosemirrorToYDoc } from 'y-prosemirror';
import { updateYdocDocxData } from '@extensions/collaboration/collaboration-helpers.js';

export const CollaborationPluginKey = new PluginKey('collaboration');

export const Collaboration = Extension.create({
  name: 'collaboration',

  priority: 1000,

  addOptions() {
    return {
      ydoc: null,
      field: 'supereditor',
      fragment: null,
      isReady: false,
    };
  },

  addPmPlugins() {
    if (!this.editor.options.ydoc) return [];
    this.options.ydoc = this.editor.options.ydoc;

    initSyncListener(this.options.ydoc, this.editor, this);
    initDocumentListener({ ydoc: this.options.ydoc, editor: this.editor });

    const [syncPlugin, fragment] = createSyncPlugin(this.options.ydoc, this.editor);
    this.options.fragment = fragment;

    const metaMap = this.options.ydoc.getMap('media');
    metaMap.observe((event) => {
      event.changes.keys.forEach((_, key) => {
        if (!(key in this.editor.storage.image.media)) {
          const fileData = metaMap.get(key);
          this.editor.storage.image.media[key] = fileData;
        }
      });
    });

    return [syncPlugin];
  },

  addCommands() {
    return {
      addImageToCollaboration:
        ({ mediaPath, fileData }) =>
        () => {
          if (!this.options.ydoc || !mediaPath || !fileData) return false;
          const mediaMap = this.options.ydoc.getMap('media');
          mediaMap.set(mediaPath, fileData);
          return true;
        },
    };
  },
});

export const createSyncPlugin = (ydoc, editor) => {
  const fragment = ydoc.getXmlFragment('supereditor');
  const onFirstRender = () => {
    if (!editor.options.isNewFile) return;
    initializeMetaMap(ydoc, editor);
  };

  return [ySyncPlugin(fragment, { onFirstRender }), fragment];
};

export const initializeMetaMap = (ydoc, editor) => {
  const metaMap = ydoc.getMap('meta');
  metaMap.set('docx', editor.options.content);
  metaMap.set('fonts', editor.options.fonts);

  const mediaMap = ydoc.getMap('media');
  Object.entries(editor.options.mediaFiles).forEach(([key, value]) => {
    mediaMap.set(key, value);
  });
};

const checkDocxChanged = (transaction) => {
  if (!transaction.changed) return false;

  for (const [, value] of transaction.changed.entries()) {
    if (value instanceof Set && value.has('docx')) {
      return true;
    }
  }

  return false;
};

const initDocumentListener = ({ ydoc, editor }) => {
  const debouncedUpdate = debounce((editor) => {
    updateYdocDocxData(editor);
  }, 1000);

  ydoc.on('afterTransaction', (transaction) => {
    const { local } = transaction;

    const hasChangedDocx = checkDocxChanged(transaction);
    if (!hasChangedDocx && transaction.changed?.size && local) {
      debouncedUpdate(editor);
    }
  });
};

const debounce = (fn, wait) => {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
};

const initSyncListener = (ydoc, editor, extension) => {
  const provider = editor.options.collaborationProvider;
  if (!provider) return;

  const emit = () => {
    extension.options.isReady = true;
    provider.off('synced', emit);
    editor.emit('collaborationReady', { editor, ydoc });
  };

  if (provider.synced) {
    setTimeout(() => {
      emit();
    }, 250);
    return;
  }
  provider.on('synced', emit);
};

export const generateCollaborationData = async (editor) => {
  const ydoc = prosemirrorToYDoc(editor.state.doc, 'supereditor');
  initializeMetaMap(ydoc, editor);
  await updateYdocDocxData(editor, ydoc);
  return encodeStateAsUpdate(ydoc);
};
