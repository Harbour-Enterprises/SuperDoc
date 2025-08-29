/**
 * Selection state
 * @typedef {Object} SelectionState
 * @property {boolean} focused - Whether editor is focused
 * @property {Object|null} preservedSelection - Stored selection
 * @property {boolean} showVisualSelection - Whether to show selection decoration
 */
/**
 * Plugin key for custom selection management
 * @private
 */
export const CustomSelectionPluginKey: PluginKey<any>;
/**
 * @module CustomSelection
 * @sidebarTitle Custom Selection
 * @snippetPath /snippets/extensions/custom-selection.mdx
 */
export const CustomSelection: Extension;
/**
 * Selection state
 */
export type SelectionState = {
    /**
     * - Whether editor is focused
     */
    focused: boolean;
    /**
     * - Stored selection
     */
    preservedSelection: any | null;
    /**
     * - Whether to show selection decoration
     */
    showVisualSelection: boolean;
};
import { PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';
