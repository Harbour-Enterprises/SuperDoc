// @ts-check

/**
 * Cell border configuration
 * @typedef {Object} CellBorder
 * @property {number} [size=1] - Border width in pixels
 * @property {string} [color='#000000'] - Border color
 * @property {string} [style='solid'] - Border style
 */

/**
 * Cell borders object
 * @typedef {Object} CellBorders
 * @property {CellBorder} [top] - Top border
 * @property {CellBorder} [right] - Right border
 * @property {CellBorder} [bottom] - Bottom border
 * @property {CellBorder} [left] - Left border
 */

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
 * Table cell attributes
 * @typedef {Object} TableCellAttributes
 * @property {number} [colspan=1] - Number of columns spanned
 * @property {number} [rowspan=1] - Number of rows spanned
 * @property {number[]} [colwidth=[100]] - Column widths array
 * @property {CellBackground} [background] - Background configuration
 * @property {string} [verticalAlign] - Vertical alignment (top, middle, bottom)
 * @property {CellMargins} [cellMargins] - Cell padding margins
 * @property {CellBorders} [borders] - Cell border configuration
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

  addHelpers() {
    return {
      /**
       * Create cell border configuration object
       * @category Helper
       * @param {Object} [options] - Border options
       * @param {number} [options.size=0.66665] - Border width in pixels
       * @param {string} [options.color='#000000'] - Border color (hex)
       * @returns {CellBorders} Complete borders object for all cell sides
       * @example
       *
       * // Using default values
       * const borders = createCellBorders()
       *
       * // Using custom values
       * const borders = createCellBorders({ size: 1, color: '#cccccc' })
       * @note Creates uniform borders for all four sides of a cell
       * @note Default size matches Word's default cell border width
       */
      createCellBorders: ({ size = 0.66665, color = '#000000' } = {}) => {
        return createCellBorders({ size, color });
      },
    };
  },
});
