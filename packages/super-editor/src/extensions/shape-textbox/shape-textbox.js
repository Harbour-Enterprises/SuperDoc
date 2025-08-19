import { Node, Attribute } from '@core/index.js';
import { generateBlockUniqueId } from '@core/utilities/sdBlockUniqueId.js';

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
      sdBlockId: {
        default: () => generateBlockUniqueId(this.name),
        parseHTML: (elem) => elem.getAttribute('sd-block-id'),
        renderHTML: (attrs) => {
          return attrs.sdBlockId ? { 'sd-block-id': attrs.sdBlockId } : {};
        },
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
