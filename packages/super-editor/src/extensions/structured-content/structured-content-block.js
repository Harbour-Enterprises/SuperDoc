import { Node, Attribute } from '@core/index.js';

export const StructuredContentBlock = Node.create({
  name: 'structuredContentBlock',

  group: 'block',

  content: 'block*',

  addOptions() {
    return {
      structuredContentClass: 'sd-structured-content-tag',
      htmlAttributes: {
        'aria-label': 'Structured content block node',
      },
    };
  },

  parseDOM() {
    return [{ tag: `div.${this.options.structuredContentClass}` }];
  },

  renderDOM({ htmlAttributes }) {
    return ['div', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      sdtPr: {
        rendered: false,
      },
    };
  },
});
