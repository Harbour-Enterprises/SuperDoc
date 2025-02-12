import { Node, Attribute } from '@core/index.js';

export const Table = Node.create({
  name: 'table',

  group: 'block',

  content: 'tableRow*',

  tableRole: 'table',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  parseDOM() {
    return [{ tag: 'table' }];
  },

  addAttributes() {
    return {
      tableWidth: {
        renderDOM: ({ tableWidth }) => {
          if (!tableWidth) return {};
          const { width, type = 'auto' } = tableWidth;
          return { style: `width: ${width}px;` };
        },
      },
      tableStyleId: { rendered: false },
      tableIndent: {
        renderDOM: ({ tableIndent }) => {
          if (!tableIndent) return {};

          const { width, type = 'dxa' } = tableIndent;
          let style = '';
          if (width) style += `margin-left: ${width}px;`;
          return { style };
        },
      },
      tableLayout: { rendered: false },
      borderCollapse: {
        default: null,
        rendered: false,
      },
      tableCellSpacing: {
        default: null,
        rendered: false,
      },
      borders: {
        default: () => ({}),
        renderDOM({ borders, borderCollapse }) {
          if (!borders) return {};
          const style = Object.entries(borders).reduce(
            (acc, [key, { size, color }]) => {
              return `${acc}border-${key}: ${size}px solid ${color || 'black'};`;
            },
            `border-collapse: ${borderCollapse || 'collapse'};`,
          );
          return { style };
        },
      },
    };
  },

  renderDOM({ htmlAttributes }) {
    const attributes = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    return ['table', attributes, 0];
  },
});
