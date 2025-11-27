import { Extension } from '@core/index.js';
import { dropCursor } from 'prosemirror-dropcursor';

/**
 * Configuration options for DropCursor
 */
export interface DropCursorOptions extends Record<string, unknown> {
  /**
   * CSS color for the drop cursor indicator
   * @default 'currentColor'
   */
  color: string;
  /**
   * Width of the drop cursor line in pixels
   * @default 2
   */
  width: number;
  /**
   * Optional CSS class to apply to the drop cursor element
   */
  class?: string;
}

/**
 * @module DropCursor
 * @sidebarTitle Drop Cursor
 * @snippetPath /snippets/extensions/dropcursor.mdx
 * @example
 * // Customize drop cursor appearance
 * const ConfiguredDropCursor = DropCursor.configure({
 *   color: '#3b82f6',
 *   width: 3,
 *   class: 'custom-drop-cursor'
 * });
 *
 * // Use in SuperDoc
 * new SuperDoc({
 *   selector: '#editor',
 *   document: 'document.docx',
 *   editorExtensions: [ConfiguredDropCursor]
 * });
 */
export const DropCursor = Extension.create<DropCursorOptions>({
  name: 'dropCursor',

  addOptions() {
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
