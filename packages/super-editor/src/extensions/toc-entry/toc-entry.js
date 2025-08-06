import { Node, Attribute } from '@core/index.js';

export const TocEntry = Node.create({
  name: 'toc-entry',

  group: 'block',

  content: 'inline*',

  inline: false,

  addOptions() {
    return {
      htmlAttributes: {
        'data-id': 'toc-entry',
        'aria-label': 'Table of Contents entry',
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: 'div[data-id="toc-entry"]',
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['div', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      instruction: {
        default: null,
        rendered: false,
      },
      space: {
        default: null,
        rendered: false,
      },
      bookmark: {
        default: null,
        rendered: false,
      },
      pageNumber: {
        default: null,
        rendered: false,
      },
      attributes: {
        rendered: false,
      },
      styleId: {
        default: null,
        rendered: false,
      },
    };
  },
});
