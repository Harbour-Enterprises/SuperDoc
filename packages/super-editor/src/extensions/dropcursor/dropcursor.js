// @ts-check
import { Extension } from '@core/index.js';
import { dropCursor } from 'prosemirror-dropcursor';

/**
 * @module DropCursor
 * @sidebarTitle Drop Cursor
 * @snippetPath /snippets/extensions/dropcursor.mdx
 */
export const DropCursor = Extension.create({
  name: 'dropCursor',

  addOptions() {
    /**
     * @typedef {Object} DropCursorOptions
     * @category Options
     * @property {string} [color='currentColor'] - CSS color for the drop cursor indicator
     * @property {number} [width=2] - Width of the drop cursor line in pixels
     * @property {string} [class] - Optional CSS class to apply to the drop cursor element
     */
    return {
      color: 'currentColor',
      width: 2,
      class: undefined,
    };
  },

  addPmPlugins() {
    return [dropCursor(this.options)];
  },
});
