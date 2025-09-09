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
      /**
       * Indicates that this row should not be split across pages when paginating/exporting.
       * @category Attribute
       * @param {boolean} [cantSplit]
       */
      cantSplit: {
        default: false,
        parseDOM() {
          return {};
        },
        renderDOM({ cantSplit }) {
          // Render as a data attribute so it can be inspected in the DOM, but it's optional.
          if (!cantSplit) return {};
          return { 'data-cant-split': 'true' };
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
