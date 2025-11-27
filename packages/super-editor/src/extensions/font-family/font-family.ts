import { Extension } from '@core/index.js';

/**
 * Font family value
 * @description CSS font-family string (e.g., 'Arial', 'Times New Roman', 'sans-serif')
 */
export type FontFamilyValue = string;

/**
 * Configuration options for FontFamily
 * @category Options
 */
export interface FontFamilyOptions extends Record<string, unknown> {
  /**
   * Mark types to add font family support to
   * @default ['textStyle']
   */
  types: string[];
}

/**
 * Attributes for font family marks
 * @category Attributes
 * @example
 * // Set font family on selected text
 * editor.commands.setFontFamily('Arial')
 *
 * // Change to serif font
 * editor.commands.setFontFamily('Georgia, serif')
 *
 * // Remove custom font
 * editor.commands.unsetFontFamily()
 */
export interface FontFamilyAttributes {
  /**
   * Font family for text
   */
  fontFamily?: FontFamilyValue;
}

/**
 * @module FontFamily
 * @sidebarTitle Font Family
 * @snippetPath /snippets/extensions/font-family.mdx
 */
export const FontFamily = Extension.create<FontFamilyOptions>({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseDOM: (el) => el.style.fontFamily?.replace(/['"]+/g, ''),
            renderDOM: (attrs) => {
              if (!attrs.fontFamily) return {};
              return { style: `font-family: ${attrs.fontFamily}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set font family
       * @category Command
       * @param {FontFamilyValue} fontFamily - Font family to apply
       * @example
       * // Set to Arial
       * editor.commands.setFontFamily('Arial')
       *
       * @example
       * // Set to serif font
       * editor.commands.setFontFamily('Georgia, serif')
       * @note Preserves other text styling attributes
       */
      setFontFamily:
        (fontFamily) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily }).run();
        },

      /**
       * Remove font family
       * @category Command
       * @example
       * editor.commands.unsetFontFamily()
       * @note Reverts to default document font
       */
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
