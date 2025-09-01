// @ts-check
import { Node, Attribute } from '@core/index.js';

/**
 * @module TableRow
 * @sidebarTitle Table Row
 * @snippetPath /snippets/extensions/table-row.mdx
 */
export const TableRow = Node.create({
  name: 'tableRow',

  content: '(tableCell | tableHeader)*',

  tableRole: 'row',

  addOptions() {
    return {
      htmlAttributes: {
        'aria-label': 'Table row node',
      },
    };
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {number} [rowHeight] - Fixed row height in pixels
       */
      rowHeight: {
        renderDOM({ rowHeight }) {
          if (!rowHeight) return {};
          const style = `height: ${rowHeight}px`;
          return { style };
        },
      },
    };
  },

  parseDOM() {
    return [{ tag: 'tr' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['tr', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },
});
