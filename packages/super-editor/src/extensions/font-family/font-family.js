// @ts-check
import { Extension } from '@core/index.js';

/**
 * Font family value
 * @typedef {string} FontFamilyValue
 * @description CSS font-family string (e.g., 'Arial', 'Times New Roman', 'sans-serif')
 */

/**
 * @module FontFamily
 * @sidebarTitle Font Family
 * @snippetPath /snippets/extensions/font-family.mdx
 */
export const FontFamily = Extension.create({
  name: 'fontFamily',

  addOptions() {
    return {
      /**
       * @typedef {Object} FontFamilyOptions
       * @category Options
       * @property {string[]} [types=['textStyle']] - Mark types to add font family support to
       */
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          /**
           * @category Attribute
           * @param {FontFamilyValue} [fontFamily] - Font family for text
           */
          fontFamily: {
            default: null,
            parseDOM: (el) => el.style.fontFamily?.replace(/['"]+/g, ''),
            renderDOM: (attrs) => {
              if (!attrs.fontFamily) return {};
              return { style: `font-family: Arial` };
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
       * @returns {Function} Command function
       * @example
       * // Set to Arial
       * setFontFamily('Arial')
       *
       * // Set to serif font
       * setFontFamily('Georgia, serif')
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
       * @returns {Function} Command function
       * @example
       * unsetFontFamily()
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
