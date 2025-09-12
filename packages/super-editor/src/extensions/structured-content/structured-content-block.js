import { Node, Attribute } from '@core/index.js';

export const StructuredContentBlock = Node.create({
  name: 'structuredContentBlock',

  group: 'block',

  content: 'block*',

  addOptions() {
    return {
      structuredContentClass: 'sd-structured-content-block-tag',
      htmlAttributes: {
        'aria-label': 'Structured content block node',
      },
    };
  },

  addAttributes() {
    return {
      sdtPr: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: `div.${this.options.structuredContentClass}` }];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        class: this.options.structuredContentClass,
      }),
      0,
    ];
  },
});
