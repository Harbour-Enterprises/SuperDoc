import { Node, Attribute } from '@core/index.js';

export const TableCell = Node.create({
  name: 'tableCell',

  content: 'block+',

  tableRole: 'cell',

  isolating: true,

  parseDOM() {
    return [{ tag: 'td' }];
  },

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  renderDOM({ htmlAttributes }) {
    return ['td', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      width: {
        renderDOM: ({ width, widthType, widthUnit }) => {
          if (!width) return {};
          let unit = widthUnit === 'px' ? widthUnit : 'in';
          if (widthType === 'pct') unit = '%';
          const style = `width: ${width}${unit};`;
          return { style };
        },
      },
      widthType: { default: 'auto', rendered: false },
      widthUnit: { default: null, rendered: false },
      colspan: { default: 1 },
      rowspan: {
        default: 1,
      },
      background: {
        renderDOM({ background }) {
          if (!background) return {};
          const { color } = background || {};
          const style = `background-color: #${color || 'transparent'}`;
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
        renderDOM({ borders }) {
          if (!borders) return {};
          const sides = ['top', 'right', 'bottom', 'left'];
          const style = sides
            .map((side) => {
              const border = borders?.[side];
              if (border && border.val === 'none') return `border-${side}: ${border.val};`;
              if (border) return `border-${side}: ${border.size}px solid ${border.color || 'black'};`;
              return '';
            })
            .join(' ');
          return { style };
        },
      },
      mergedCells: {
        rendered: false,
        default: [],
      },
      vMerge: {
        rendered: false,
      },
    };
  },
});
