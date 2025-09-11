import { Node, Attribute } from '@core/index.js';

export const StructuredContent = Node.create({
  name: 'structuredContent',

  group: 'inline',

  inline: true,

  content: 'inline*',

  addOptions() {
    return {
      structuredContentClass: 'sd-structured-content-tag',
      htmlAttributes: {
        'aria-label': 'Structured content node',
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
    return [{ tag: `span.${this.options.structuredContentClass}` }];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'span',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        class: this.options.structuredContentClass,
      }),
      0,
    ];
  },
});
