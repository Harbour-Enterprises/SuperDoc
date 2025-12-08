// @ts-nocheck
import { history, redo as originalRedo, undo as originalUndo } from 'prosemirror-history';
import { undo as yUndo, redo as yRedo, yUndoPlugin } from 'y-prosemirror';
import { Extension } from '@core/Extension.js';

/**
 * Configuration options for History
 * @typedef {Object} HistoryOptions
 * @category Options
 * @property {number} [depth=100] - Maximum undo/redo steps to remember
 * @property {number} [newGroupDelay=500] - Milliseconds to wait before starting a new history group
 */

/**
 * @module History
 * @sidebarTitle History
 * @snippetPath /snippets/extensions/history.mdx
 * @shortcut Mod-z | undo | Undo last action
 * @shortcut Mod-Shift-z | redo | Redo last action
 * @shortcut Mod-y | redo | Redo last action (alternative)
 */
export const History = Extension.create({
  name: 'history',

  addOptions() {
    // https://prosemirror.net/docs/ref/#history.history
    return {
      depth: 100,
      newGroupDelay: 500,
    };
  },

  addPmPlugins() {
    if (this.editor.options.collaborationProvider && this.editor.options.ydoc) {
      const undoPlugin = createUndoPlugin();
      return [undoPlugin];
    }
    const historyPlugin = history(this.options);
    return [historyPlugin];
  },

  //prettier-ignore
  addCommands() {
    return {
      /**
       * Undo the last action
       * @category Command
       * @example
       * editor.commands.undo()
       * @note Groups changes within the newGroupDelay window
       */
      undo: () => ({ state, dispatch, tr }) => {
        if (this.editor.options.collaborationProvider && this.editor.options.ydoc) {
          tr.setMeta('preventDispatch', true);
          return yUndo(state);
        }
        tr.setMeta('inputType', 'historyUndo');
        return originalUndo(state, dispatch);
      },

      /**
       * Redo the last undone action
       * @category Command
       * @example
       * editor.commands.redo()
       * @note Only available after an undo action
       */
      redo: () => ({ state, dispatch, tr }) => {
        if (this.editor.options.collaborationProvider && this.editor.options.ydoc) {
          tr.setMeta('preventDispatch', true);
          return yRedo(state);
        }
        tr.setMeta('inputType', 'historyRedo');
        return originalRedo(state, dispatch);
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

const createUndoPlugin = () => {
  const yUndoPluginInstance = yUndoPlugin();
  return yUndoPluginInstance;
};
