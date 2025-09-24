import { Node, Attribute } from '@core/index';
import { StructuredContentInlineView } from './StructuredContentInlineView';

export const structuredContentClass = 'sd-structured-content';
export const structuredContentInnerClass = 'sd-structured-content__content';

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

  group: 'inline structuredContent',

  inline: true,

  content: 'inline*',

  isolating: true,

  atom: false, // false - has editable content.

  draggable: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: structuredContentClass,
        'aria-label': 'Structured content node',
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-id'),
        renderDOM: (attrs) => {
          if (!attrs.id) return {};
          return { 'data-id': attrs.id };
        },
      },

      sdtPr: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'span[data-structured-content]' }];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'span',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        'data-structured-content': '',
      }),
      0,
    ];
  },

  addNodeView() {
    return (props) => {
      return new StructuredContentInlineView({ ...props });
    };
  },
});
