import { gapCursor } from 'prosemirror-gapcursor';
import { Extension } from '@core/index.js';
import { callOrGet } from '@core/utilities/callOrGet.js';
import { getExtensionConfigField } from '@core/helpers/getExtensionConfigField.js';

/**
 * Configuration options for Gapcursor
 */
export type GapcursorOptions = Record<string, never>;

/**
 * @module Gapcursor
 * @sidebarTitle Gap Cursor
 * @snippetPath /snippets/extensions/gapcursor.mdx
 */
export const Gapcursor = Extension.create<GapcursorOptions>({
  name: 'gapCursor',

  addOptions() {
    return {};
  },

  addPmPlugins() {
    return [gapCursor()];
  },

  /**
   * Extend node schema to allow gap cursor positioning
   * @returns Schema extension with allowGapCursor property
   */
  extendNodeSchema(extension: { name: string; options: unknown; storage: unknown }) {
    return {
      /**
       * Whether to allow gap cursor before/after this node
       * Set to false on nodes where gap cursor shouldn't appear
       */
      allowGapCursor:
        callOrGet(
          getExtensionConfigField(extension, 'allowGapCursor', {
            name: extension.name,
            options: extension.options,
            storage: extension.storage,
          }),
        ) ?? null,
    };
  },
});
