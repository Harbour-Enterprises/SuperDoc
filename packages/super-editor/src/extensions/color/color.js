// @ts-check
import { Extension } from '@core/index.js';

/**
 * Color value format
 * @typedef {string} ColorValue
 * @description Accepts hex colors (#ff0000), rgb(255,0,0), or named colors (red)
 */

/**
 * @module Color
 * @sidebarTitle Color
 * @snippetPath /snippets/extensions/color.mdx
 */
export const Color = Extension.create({
  name: 'color',

  addOptions() {
    return {
      /**
       * @typedef {Object} ColorOptions
       * @category Options
       * @property {string[]} [types=['textStyle']] - Mark types to add color support to
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
           * @param {ColorValue} [color] - Text color value
           */
          color: {
            default: null,
            parseDOM: (el) => el.style.color?.replace(/['"]+/g, ''),
            renderDOM: (attrs) => {
              if (!attrs.color) return {};
              return { style: `color: ${attrs.color}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set text color
       * @category Command
       * @param {ColorValue} color - Color value to apply
       * @returns {Function} Command function
       * @example
       * // Set to red using hex
       * setColor('#ff0000')
       *
       * // Set using rgb
       * setColor('rgb(255, 0, 0)')
       *
       * // Set using named color
       * setColor('blue')
       * @note Preserves other text styling attributes
       */
      setColor:
        (color) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { color: color }).run();
        },

      /**
       * Remove text color
       * @category Command
       * @returns {Function} Command function
       * @example
       * unsetColor()
       * @note Removes color while preserving other text styles
       */
      unsetColor:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { color: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
