// @ts-check
import { Extension } from '@core/index.js';

/**
 * @module TextTransform
 * @sidebarTitle Text Transform
 * @snippetPath /snippets/extensions/text-transform.mdx
 */
export const TextTransform = Extension.create({
  name: 'textTransform',

  addOptions() {
    /**
     * @typedef {Object} TextTransformOptions
     * @category Options
     * @property {string[]} [types=['textStyle']] - Mark types to apply text transform to
     */
    return {
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
           * @param {string} [textTransform] - Text transform value (uppercase, none). Note: Only 'uppercase' and 'none' are supported for Word export
           */
          textTransform: {
            default: null,
            renderDOM: (attrs) => {
              if (!attrs.textTransform) return {};
              return {
                style: `text-transform: ${attrs.textTransform}`,
              };
            },
          },
        },
      },
    ];
  },
});
