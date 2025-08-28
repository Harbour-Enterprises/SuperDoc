// @ts-check
import { history, redo as originalRedo, undo as originalUndo } from 'prosemirror-history';
import { Extension } from '@core/Extension.js';

/**
 * History configuration
 * @typedef {Object} HistoryConfig
 * @property {number} [depth=100] - Maximum number of history events to store
 * @property {number} [newGroupDelay=500] - Time in ms to group changes together
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
      /**
       * @typedef {Object} HistoryOptions
       * @category Options
       * @property {number} [depth=100] - Maximum undo/redo steps to remember
       * @property {number} [newGroupDelay=500] - Milliseconds to wait before starting a new history group
       */
      depth: 100,
      newGroupDelay: 500,
    };
  },

  addPmPlugins() {
    const historyPlugin = history(this.options);
    return [historyPlugin];
  },

  //prettier-ignore
  addCommands() {
    return {
      /**
       * Undo the last action
       * @category Command
       * @returns {Function} Command function
       * @example
       * undo()
       * @note Groups changes within the newGroupDelay window
       */
      undo: () => ({ state, dispatch, tr }) => {
        tr.setMeta('inputType', 'historyUndo');
        return originalUndo(state, dispatch);
      },

      /**
       * Redo the last undone action
       * @category Command
       * @returns {Function} Command function
       * @example
       * redo()
       * @note Only available after an undo action
       */
      redo: () => ({ state, dispatch, tr }) => {
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
