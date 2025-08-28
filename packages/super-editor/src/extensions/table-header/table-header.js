// @ts-check
import { Node, Attribute } from '@core/index.js';

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
      /**
       * @category Attribute
       * @param {number} [colspan=1] - Number of columns this header spans
       */
      colspan: {
        default: 1,
      },

      /**
       * @category Attribute
       * @param {number} [rowspan=1] - Number of rows this header spans
       */
      rowspan: {
        default: 1,
      },

      /**
       * @category Attribute
       * @param {number[]} [colwidth] - Column widths array in pixels
       */
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
            'data-colwidth': attrs.colwidth.join(','),
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
