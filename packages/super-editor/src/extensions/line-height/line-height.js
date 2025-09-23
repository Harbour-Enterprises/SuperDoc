// @ts-check
import { Extension } from '@core/index.js';
import { getLineHeightValueString } from '@core/super-converter/helpers.js';

/**
 * Line height value
 * @typedef {string|number} LineHeightValue
 * @description Line height as number (1.5) or string with unit ('1.5em', '24px')
 */

/**
 * Configuration options for LineHeight
 * @typedef {Object} LineHeightOptions
 * @category Options
 * @property {string[]} [types=['heading', 'paragraph']] - Block types to add line height support to
 * @property {Object} [defaults] - Default configuration
 * @property {string} [defaults.unit=''] - Default unit for line height values
 */

/**
 * Attributes for line height
 * @typedef {Object} LineHeightAttributes
 * @category Attributes
 * @property {LineHeightValue} [lineHeight] - Line height value
 */

/**
 * @module LineHeight
 * @sidebarTitle Line Height
 * @snippetPath /snippets/extensions/line-height.mdx
 */
export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      defaults: {
        unit: '',
      },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseDOM: (el) => el.style.lineHeight,
            renderDOM: (attrs) => {
              if (!attrs.lineHeight) return {};
              const lineHeightStyle = getLineHeightValueString(
                attrs.lineHeight,
                this.options.defaults.unit,
                attrs.spacing?.lineRule,
              );
              return {
                style: `${lineHeightStyle}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set line height for blocks
       * @category Command
       * @param {LineHeightValue} lineHeight - Line height to apply
       * @example
       * editor.commands.setLineHeight(1.5)
       * editor.commands.setLineHeight('24px')
       * editor.commands.setLineHeight(2)
       * @note Applies to paragraphs and headings
       */
      setLineHeight:
        (lineHeight) =>
        ({ commands }) => {
          if (!lineHeight) return false;

          return this.options.types
            .map((type) => commands.updateAttributes(type, { lineHeight }))
            .every((result) => result);
        },

      /**
       * Remove line height
       * @category Command
       * @example
       * editor.commands.unsetLineHeight()
       * @note Reverts to default line spacing
       */
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types
            .map((type) => commands.resetAttributes(type, 'lineHeight'))
            .every((result) => result);
        },
    };
  },
});
