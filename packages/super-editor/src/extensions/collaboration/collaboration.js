import { Extension } from '@core/index.js';
import { PluginKey } from 'prosemirror-state';
import { ySyncPlugin, yUndoPlugin, yUndoPluginKey, undo, redo } from 'y-prosemirror';

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
    const undoPlugin = createUndoPlugin();

    // Listen for document lock changes
    initDocumentLockHandler(this.options.ydoc, this.editor);
    initSyncListener(this.options.ydoc, this.editor, this);

    const [syncPlugin, fragment] = createSyncPlugin(this.options.ydoc, this.editor);
    this.options.fragment = fragment;

    const metaMap = this.options.ydoc.getMap('media');
    metaMap.observe((event) => {
      event.changes.keys.forEach((change, key) => {
        if (!(key in this.editor.storage.image.media)) {
          const fileData = metaMap.get(key);
          this.editor.storage.image.media[key] = fileData;
        }
      });
    });

    return [syncPlugin, undoPlugin];
  },

  addCommands() {
    return {
      undo:
        () =>
        ({ tr, state, dispatch }) => {
          tr.setMeta('preventDispatch', true);
          tr.setMeta('inputType', 'historyUndo');
          const undoManager = yUndoPluginKey.getState(state).undoManager;
          if (undoManager.undoStack.length === 0) return false;
          if (!dispatch) return true;
          return undo(state);
        },
      redo:
        () =>
        ({ tr, state, dispatch }) => {
          tr.setMeta('preventDispatch', true);
          tr.setMeta('inputType', 'historyRedo');
          const undoManager = yUndoPluginKey.getState(state).undoManager;
          if (undoManager.redoStack.length === 0) return false;
          if (!dispatch) return true;
          return redo(state);
        },
      addImageToCollaboration:
        ({ mediaPath, fileData }) =>
        () => {
          if (!this.options.ydoc) return;
          const mediaMap = this.options.ydoc.getMap('media');
          mediaMap.set(mediaPath, fileData);
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-z': () => this.editor.commands.undo(),
      'Mod-Shift-z': () => this.editor.commands.redo(),
      'Mod-y': () => this.editor.commands.redo(),
    };
  },
});

const createSyncPlugin = (ydoc, editor) => {
  const fragment = ydoc.getXmlFragment('supereditor');

  const onFirstRender = () => {
    if (!editor.options.isNewFile) return;
    const metaMap = ydoc.getMap('meta');
    metaMap.set('docx', editor.options.content);
    metaMap.set('fonts', editor.options.fonts);
  };

  return [ySyncPlugin(fragment, { onFirstRender }), fragment];
};

const createUndoPlugin = () => {
  const yUndoPluginInstance = yUndoPlugin();
  return yUndoPluginInstance;
};

const initDocumentLockHandler = (ydoc, editor) => {
  const metaMap = ydoc.getMap('meta');
  metaMap.observe((event) => {
    const lockedBy = metaMap.get('lockedBy');
    const isLocked = metaMap.get('locked');
    if (!editor.options.user || !lockedBy) return;
    const emitEvent = lockedBy?.email !== editor.options.user?.email;

    // If the event was initiated by this user, don't emit anything
    const editableChanged = editor.options.editable !== !isLocked;
    if (!emitEvent || !editableChanged) return;

    // Otherwise, we need to emit the event for all other users
    if (isLocked) {
      console.debug('--- Locking editor ---', lockedBy, editor.options.user);
    } else {
      console.debug('--- Unlocking editor ---', lockedBy);
    }
    editor.setEditable(!isLocked);
    editor.emit('locked', { editor, isLocked, lockedBy });
  });
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
