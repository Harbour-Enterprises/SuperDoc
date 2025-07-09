import { Node, Attribute } from '@core/index.js';

export const ShapeContainer = Node.create({
  name: 'shapeContainer',

  group: 'block',

  content: 'block+',

  isolating: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-editor-shape-container',
        'aria-label': 'Shape container node',
      },
    };
  },

  addAttributes() {
    return {
      fillcolor: {
        renderDOM: (attrs) => {
          if (!attrs.fillcolor) return {};
          return {
            style: `background-color: ${attrs.fillcolor}`,
          };
        },
      },

      style: {
        renderDOM: (attrs) => {
          if (!attrs.style) return {};
          return {
            style: attrs.style,
          };
        },
      },

      wrapAttributes: {
        rendered: false,
      },

      attributes: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, { 'data-type': this.name }),
      0,
    ];
  },
});
