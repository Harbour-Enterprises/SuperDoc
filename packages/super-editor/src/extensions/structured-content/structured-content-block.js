import { Node, Attribute } from '@core/index.js';

/**
 * Configuration options for StructuredContentBlock
 * @typedef {Object} StructuredContentBlockOptions
 * @category Options
 * @property {string} [structuredContentClass='sd-structured-content-block-tag'] - CSS class for the block
 * @property {Object} [htmlAttributes] - HTML attributes for structured content blocks
 */

/**
 * Attributes for structured content block nodes
 * @typedef {Object} StructuredContentBlockAttributes
 * @category Attributes
 * @property {Object} [sdtPr] @internal - Internal structured document tag properties
 */

/**
 * @module StructuredContentBlock
 * @sidebarTitle Structured Content Block
 * @snippetPath /snippets/extensions/structured-content-block.mdx
 */
export const StructuredContentBlock = Node.create({
  name: 'structuredContentBlock',

  group: 'block',

  content: 'block*',

  addOptions() {
    return {
      structuredContentClass: 'sd-structured-content-block-tag',
      htmlAttributes: {
        'aria-label': 'Structured content block node',
      },
    };
  },

  addAttributes() {
    return {
      sdtPr: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: `div.${this.options.structuredContentClass}` }];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        class: this.options.structuredContentClass,
      }),
      0,
    ];
  },
});
