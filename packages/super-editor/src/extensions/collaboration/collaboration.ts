import { Extension } from '@core/index.js';
import { PluginKey } from 'prosemirror-state';
import { encodeStateAsUpdate } from 'yjs';
import type * as Y from 'yjs';
import { ySyncPlugin, prosemirrorToYDoc } from 'y-prosemirror';
import { updateYdocDocxData } from '@extensions/collaboration/collaboration-helpers.js';
import type { Editor } from '@core/Editor.js';

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
    if (!(this.editor.options as { ydoc?: Y.Doc }).ydoc) return [];
    this.options.ydoc = (this.editor.options as { ydoc: Y.Doc }).ydoc;

    initSyncListener(this.options.ydoc, this.editor, this);
    initDocumentListener({ ydoc: this.options.ydoc, editor: this.editor });

    const [syncPlugin, fragment] = createSyncPlugin(this.options.ydoc, this.editor);
    this.options.fragment = fragment;

    const metaMap = this.options.ydoc.getMap('media');
    metaMap.observe((event) => {
      event.changes.keys.forEach((_, key) => {
        if (!(key in (this.editor.storage.image as { media: Record<string, unknown> }).media)) {
          const fileData = metaMap.get(key);
          (this.editor.storage.image as { media: Record<string, unknown> }).media[key] = fileData;
        }
      });
    });

    return [syncPlugin];
  },

  addCommands() {
    return {
      addImageToCollaboration:
        ({ mediaPath, fileData }: { mediaPath: string; fileData: unknown }) =>
        () => {
          if (!this.options.ydoc || !mediaPath || !fileData) return false;
          const mediaMap = this.options.ydoc.getMap('media');
          mediaMap.set(mediaPath, fileData);
          return true;
        },
    };
  },
});

export const createSyncPlugin = (ydoc: Y.Doc, editor: Editor) => {
  const fragment = ydoc.getXmlFragment('supereditor');
  const onFirstRender = () => {
    if (!(editor.options as { isNewFile?: boolean }).isNewFile) return;
    initializeMetaMap(ydoc, editor);
  };

  return [ySyncPlugin(fragment, { onFirstRender }), fragment];
};

export const initializeMetaMap = (ydoc: Y.Doc, editor: Editor) => {
  const metaMap = ydoc.getMap('meta');
  metaMap.set('docx', editor.options.content);
  metaMap.set('fonts', (editor.options as { fonts?: unknown }).fonts);

  const mediaMap = ydoc.getMap('media');
  Object.entries((editor.options as { mediaFiles?: Record<string, unknown> }).mediaFiles || {}).forEach(
    ([key, value]) => {
      mediaMap.set(key, value);
    },
  );
};

const checkDocxChanged = (transaction: Y.Transaction) => {
  if (!transaction.changed) return false;

  for (const [, value] of transaction.changed.entries()) {
    if (value instanceof Set && value.has('docx')) {
      return true;
    }
  }

  return false;
};

const initDocumentListener = ({ ydoc, editor }: { ydoc: Y.Doc; editor: Editor }) => {
  const debouncedUpdate = debounce((editor: Editor) => {
    updateYdocDocxData(editor, ydoc);
  }, 1000);

  ydoc.on('afterTransaction', (transaction) => {
    const { local } = transaction;

    const hasChangedDocx = checkDocxChanged(transaction);
    if (!hasChangedDocx && transaction.changed?.size && local) {
      debouncedUpdate(editor);
    }
  });
};

const debounce = <T extends unknown[]>(fn: (...args: T) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: T) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const initSyncListener = (ydoc: Y.Doc, editor: Editor, extension: { options: { isReady: boolean } }) => {
  const provider = (
    editor.options as {
      collaborationProvider?: {
        synced: boolean;
        on: (event: string, callback: () => void) => void;
        off: (event: string, callback: () => void) => void;
      };
    }
  ).collaborationProvider;
  if (!provider) return;

  const emit = () => {
    extension.options.isReady = true;
    if (provider) provider.off('synced', emit);
    editor.emit('collaborationReady', { editor, ydoc });
  };

  if (provider?.synced) {
    setTimeout(() => {
      emit();
    }, 250);
    return;
  }
  provider?.on('synced', emit);
};

export const generateCollaborationData = async (editor: Editor): Promise<Uint8Array> => {
  const ydoc = prosemirrorToYDoc(editor.state.doc, 'supereditor');
  initializeMetaMap(ydoc, editor);
  await updateYdocDocxData(editor, ydoc);
  return encodeStateAsUpdate(ydoc);
};
