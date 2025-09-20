// @ts-check
import { Extension } from '@core/index.js';
import { parseSizeUnit } from '@core/utilities/index.js';

/**
 * Configuration options for TextIndent
 * @typedef {Object} TextIndentOptions
 * @category Options
 * @property {string[]} [types=['heading', 'paragraph']] - Node types to apply indentation to
 * @property {Object} [defaults] - Default indentation settings
 * @property {string} [defaults.unit='in'] - Default unit for indentation (in, cm, px, etc.)
 * @property {number} [defaults.increment=0.125] - Default increment/decrement value
 */

/**
 * Attributes for text indentation
 * @typedef {Object} TextIndentAttributes
 * @category Attributes
 * @property {string} [textIndent] - Text indentation value with unit (e.g., '0.5in')
 */

/**
 * @module TextIndent
 * @sidebarTitle Text Indent
 * @snippetPath /snippets/extensions/text-indent.mdx
 */
export const TextIndent = Extension.create({
  name: 'textIndent',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      defaults: {
        unit: 'in',
        increment: 0.125,
      },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          /**
           * @category Attribute
           * @param {string} [textIndent] - Text indentation value with unit (e.g., '0.5in')
           */
          textIndent: {
            default: null,
            parseDOM: (el) => el.style.textIndent,
            renderDOM: (attrs) => {
              if (!attrs.textIndent) return {};
              let [value, unit] = parseSizeUnit(attrs.textIndent);
              if (Number.isNaN(value) || !value) return {};
              unit = unit ? unit : this.options.defaults.unit;
              return { style: `margin-left: ${value}${unit}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set text indentation
       * @category Command
       * @param {string} indent - Indentation value with unit (e.g., '0.5in', '2cm')
       * @returns {Function} Command function
       * @example
       * // Set to 0.5 inches
       * setTextIndent('0.5in')
       *
       * // Set to 2 centimeters
       * setTextIndent('2cm')
       * @note Accepts any valid CSS unit (in, cm, px, em, etc.)
       */
      setTextIndent:
        (indent) =>
        ({ commands }) => {
          if (!indent) return false;

          return this.options.types
            .map((type) => commands.updateAttributes(type, { textIndent: indent }))
            .every((result) => result);
        },

      /**
       * Remove text indentation
       * @category Command
       * @returns {Function} Command function
       * @example
       * unsetTextIndent()
       * @note Removes all indentation from the selected nodes
       */
      unsetTextIndent:
        () =>
        ({ commands }) => {
          return this.options.types
            .map((type) => commands.resetAttributes(type, 'textIndent'))
            .every((result) => result);
        },

      /**
       * Increase text indentation
       * @category Command
       * @returns {Function} Command function
       * @example
       * increaseTextIndent()
       * @note Increments by the default value (0.125in by default)
       * @note Creates initial indent if none exists
       */
      increaseTextIndent:
        () =>
        ({ commands }) => {
          return this.options.types
            .map((type) => {
              let { textIndent } = this.editor.getAttributes(type);

              if (!textIndent) {
                let { increment, unit } = this.options.defaults;
                return commands.updateAttributes(type, {
                  textIndent: `${increment}${unit}`,
                });
              }

              let [value, unit] = parseSizeUnit(textIndent);
              value = Number(value) + this.options.defaults.increment;
              unit = unit ? unit : this.options.defaults.unit;

              if (Number.isNaN(value)) return false;

              return commands.updateAttributes(type, {
                textIndent: `${value}${unit}`,
              });
            })
            .every((result) => result);
        },

      /**
       * Decrease text indentation
       * @category Command
       * @returns {Function} Command function
       * @example
       * decreaseTextIndent()
       * @note Decrements by the default value (0.125in by default)
       * @note Removes indentation completely if it reaches 0 or below
       */
      decreaseTextIndent:
        () =>
        ({ commands }) => {
          return this.options.types
            .map((type) => {
              let { textIndent } = this.editor.getAttributes(type);

              if (!textIndent) return false;

              let [value, unit] = parseSizeUnit(textIndent);
              value = Number(value) - this.options.defaults.increment;
              unit = unit ? unit : this.options.defaults.unit;

              if (Number.isNaN(value)) return false;

              if (value <= 0) {
                return commands.unsetTextIndent();
              }

              return commands.updateAttributes(type, {
                textIndent: `${value}${unit}`,
              });
            })
            .every((result) => result);
        },
    };
  },
});
