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
export const History: Extension;
/**
 * History configuration
 */
export type HistoryConfig = {
    /**
     * - Maximum number of history events to store
     */
    depth?: number;
    /**
     * - Time in ms to group changes together
     */
    newGroupDelay?: number;
};
import { Extension } from '@core/Extension.js';
