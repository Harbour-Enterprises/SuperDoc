import { Node, Attribute } from '@core/index.js';

export const PageNumber = Node.create({
  name: 'page-number',
  group: 'inline',
  inline: true,

  content: 'text*',

  addOptions() {
    return {
      htmlAttributes: {
        'data-id': 'auto-page-number',
      },
    };
  },

  parseDOM() {
    return [{ tag: 'span[data-id="auto-page-number"' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },
});

export const TotalPageCount = Node.create({
  name: 'total-page-number',
  group: 'inline',
  inline: true,

  content: 'text*',

  addOptions() {
    return {
      htmlAttributes: {
        'data-id': 'auto-total-pages',
      },
    };
  },

  parseDOM() {
    return [{ tag: 'span[data-id="auto-total-pages"' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },
});
