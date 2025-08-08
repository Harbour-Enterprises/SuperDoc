import { Node, Attribute } from '@core/index.js';

export const TocWrapper = Node.create({
  name: 'toc-wrapper',

  group: 'block',

  content: 'block*',

  inline: false,

  addOptions() {
    return {
      htmlAttributes: {
        'data-id': 'toc-wrapper',
        contenteditable: 'false',
        'aria-label': 'Table of Contents wrapper',
        class: 'sd-toc-wrapper',
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: 'div[data-id="toc-wrapper"]',
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
      attributes: {
        rendered: false,
      },
    };
  },
});
