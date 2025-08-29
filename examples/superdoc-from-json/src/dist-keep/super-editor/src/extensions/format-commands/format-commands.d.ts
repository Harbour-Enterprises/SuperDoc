/**
 * Stored format style
 * @typedef {Object} StoredStyle
 * @property {string} name - Mark name
 * @property {Object} attrs - Mark attributes
 */
/**
 * @module FormatCommands
 * @sidebarTitle Format Commands
 * @snippetPath /snippets/extensions/format-commands.mdx
 * @shortcut Mod-Alt-c | clearFormat | Clear all formatting
 */
export const FormatCommands: Extension;
/**
 * Stored format style
 */
export type StoredStyle = {
    /**
     * - Mark name
     */
    name: string;
    /**
     * - Mark attributes
     */
    attrs: any;
};
import { Extension } from '@core/index.js';
