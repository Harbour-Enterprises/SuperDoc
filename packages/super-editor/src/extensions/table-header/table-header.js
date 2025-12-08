// @ts-nocheck

import { Node, Attribute } from '@core/index.js';

/**
 * Configuration options for TableHeader
 * @typedef {Object} TableHeaderOptions
 * @category Options
 * @property {Object} [htmlAttributes={'aria-label': 'Table head node'}] - HTML attributes for table headers
 */

/**
 * Attributes for table header nodes
 * @typedef {Object} TableHeaderAttributes
 * @category Attributes
 * @property {number} [colspan=1] - Number of columns this header spans
 * @property {number} [rowspan=1] - Number of rows this header spans
 * @property {number[]} [colwidth] - Column widths array in pixels
 */

/**
 * @module TableHeader
 * @sidebarTitle Table Header
 * @snippetPath /snippets/extensions/table-header.mdx
 */
export const TableHeader = Node.create({
  name: 'tableHeader',

  content: 'block+',

  tableRole: 'header_cell',

  isolating: true,

  addOptions() {
    return {
      htmlAttributes: {
        'aria-label': 'Table head node',
      },
    };
  },

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },

      rowspan: {
        default: 1,
      },

      colwidth: {
        default: null,
        parseDOM: (element) => {
          const colwidth = element.getAttribute('data-colwidth');
          const value = colwidth ? colwidth.split(',').map((width) => parseInt(width, 10)) : null;
          return value;
        },
        renderDOM: (attrs) => {
          if (!attrs.colwidth) return {};
          return {
            // @ts-expect-error - colwidth is known to be an array at runtime
            'data-colwidth': attrs.colwidth.join(','),
          };
        },
      },

      __placeholder: {
        default: null,
        parseDOM: (element) => {
          const value = element.getAttribute('data-placeholder');
          return value || null;
        },
        renderDOM({ __placeholder }) {
          if (!__placeholder) return {};
          return {
            'data-placeholder': __placeholder,
          };
        },
      },
    };
  },

  parseDOM() {
    return [{ tag: 'th' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['th', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },
});
