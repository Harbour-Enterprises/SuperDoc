// @ts-check
import { Node, Attribute } from '@core/index.js';
import { createCellBorders } from './helpers/createCellBorders.js';

/**
 * Cell margins configuration
 * @typedef {Object} CellMargins
 * @property {number} [top] - Top margin in pixels
 * @property {number} [right] - Right margin in pixels
 * @property {number} [bottom] - Bottom margin in pixels
 * @property {number} [left] - Left margin in pixels
 */

/**
 * Cell background configuration
 * @typedef {Object} CellBackground
 * @property {string} color - Background color (hex without #)
 */

/**
 * Configuration options for TableCell
 * @typedef {Object} TableCellOptions
 * @category Options
 * @property {Object} [htmlAttributes={'aria-label': 'Table cell node'}] - HTML attributes for table cells
 */

/**
 * Attributes for table cell nodes
 * @typedef {Object} TableCellAttributes
 * @category Attributes
 * @property {number} [colspan=1] - Number of columns this cell spans
 * @property {number} [rowspan=1] - Number of rows this cell spans
 * @property {number[]} [colwidth=[100]] - Column widths array in pixels
 * @property {CellBackground} [background] - Cell background color configuration
 * @property {string} [verticalAlign] - Vertical content alignment (top, middle, bottom)
 * @property {CellMargins} [cellMargins] - Internal cell padding
 * @property {import('./helpers/createCellBorders.js').CellBorders} [borders] - Cell border configuration
 * @property {string} [widthType='auto'] @internal - Internal width type
 * @property {string} [widthUnit='px'] @internal - Internal width unit
 */

/**
 * @module TableCell
 * @sidebarTitle Table Cell
 * @snippetPath /snippets/extensions/table-cell.mdx
 */
export const TableCell = Node.create({
  name: 'tableCell',

  content: 'block+',

  tableRole: 'cell',

  isolating: true,

  addOptions() {
    return {
      htmlAttributes: {
        'aria-label': 'Table cell node',
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
        default: [100],
        parseDOM: (elem) => {
          const colwidth = elem.getAttribute('data-colwidth');
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

      background: {
        renderDOM({ background }) {
          if (!background) return {};
          const { color } = background || {};
          const style = `background-color: ${color ? `#${color}` : 'transparent'}`;
          return { style };
        },
      },

      verticalAlign: {
        renderDOM({ verticalAlign }) {
          if (!verticalAlign) return {};
          const style = `vertical-align: ${verticalAlign}`;
          return { style };
        },
      },

      cellMargins: {
        renderDOM({ cellMargins }) {
          if (!cellMargins) return {};
          const sides = ['top', 'right', 'bottom', 'left'];
          const style = sides
            .map((side) => {
              const margin = cellMargins?.[side];
              if (margin) return `padding-${side}: ${margin}px;`;
              return '';
            })
            .join(' ');
          return { style };
        },
      },

      borders: {
        default: () => createCellBorders(),
        renderDOM({ borders }) {
          if (!borders) return {};
          const sides = ['top', 'right', 'bottom', 'left'];
          const style = sides
            .map((side) => {
              const border = borders?.[side];
              if (border && border.val === 'none') return `border-${side}: ${border.val};`;
              if (border) return `border-${side}: ${Math.ceil(border.size)}px solid ${border.color || 'black'};`;
              return '';
            })
            .join(' ');
          return { style };
        },
      },

      widthType: {
        default: 'auto',
        rendered: false,
      },

      widthUnit: {
        default: 'px',
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'td' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['td', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },
});
