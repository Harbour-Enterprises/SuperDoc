import { Node, Attribute } from '@core/index.js';

export const ShapeTextbox = Node.create({
  name: 'shapeTextbox',

  group: 'block',

  content: 'paragraph* block*',

  isolating: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-editor-shape-textbox',
        'aria-label': 'Shape textbox node',
      },
    };
  },

  addAttributes() {
    return {
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
