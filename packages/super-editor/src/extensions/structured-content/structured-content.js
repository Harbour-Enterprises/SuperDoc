import { Node, Attribute } from '@core/index.js';

/**
 * Configuration options for StructuredContent
 * @typedef {Object} StructuredContentOptions
 * @category Options
 * @property {string} [structuredContentClass='sd-structured-content-tag'] - CSS class for the inline element
 * @property {Object} [htmlAttributes] - HTML attributes for structured content elements
 */

/**
 * Attributes for structured content nodes
 * @typedef {Object} StructuredContentAttributes
 * @category Attributes
 * @property {Object} [sdtPr] @internal - Internal structured document tag properties
 */

/**
 * @module StructuredContent
 * @sidebarTitle Structured Content
 * @snippetPath /snippets/extensions/structured-content.mdx
 */
export const StructuredContent = Node.create({
  name: 'structuredContent',

  group: 'inline',

  inline: true,

  content: 'inline*',

  addOptions() {
    return {
      structuredContentClass: 'sd-structured-content-tag',
      htmlAttributes: {
        'aria-label': 'Structured content node',
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
    return [{ tag: `span.${this.options.structuredContentClass}` }];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'span',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        class: this.options.structuredContentClass,
      }),
      0,
    ];
  },
});
