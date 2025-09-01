// @ts-check
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

import { Node, Attribute } from '@core/index.js';
import { createCellBorders } from './helpers/createCellBorders.js';

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
      /**
       * @category Attribute
       * @param {number} [colspan=1] - Number of columns this cell spans
       */
      colspan: {
        default: 1,
      },

      /**
       * @category Attribute
       * @param {number} [rowspan=1] - Number of rows this cell spans
       */
      rowspan: {
        default: 1,
      },

      /**
       * @category Attribute
       * @param {number[]} [colwidth=[100]] - Column widths array in pixels
       */
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

      /**
       * @category Attribute
       * @param {CellBackground} [background] - Cell background color configuration
       */
      background: {
        renderDOM({ background }) {
          if (!background) return {};
          const { color } = background || {};
          const style = `background-color: ${color ? `#${color}` : 'transparent'}`;
          return { style };
        },
      },

      /**
       * @category Attribute
       * @param {string} [verticalAlign] - Vertical content alignment (top, middle, bottom)
       */
      verticalAlign: {
        renderDOM({ verticalAlign }) {
          if (!verticalAlign) return {};
          const style = `vertical-align: ${verticalAlign}`;
          return { style };
        },
      },

      /**
       * @category Attribute
       * @param {CellMargins} [cellMargins] - Internal cell padding
       */
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

      /**
       * @category Attribute
       * @param {CellBorders} [borders] - Cell border configuration
       */
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

      /**
       * @private
       * @category Attribute
       * @param {string} [widthType='auto'] - Internal width type
       */
      widthType: {
        default: 'auto',
        rendered: false,
      },

      /**
       * @private
       * @category Attribute
       * @param {string} [widthUnit='px'] - Internal width unit
       */
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
