import { Node, Attribute } from '@core/index.js';

export const LineBreak = Node.create({
  name: 'lineBreak',

  group: 'inline',

  inline: true,

  parseDOM() {
    return [{ tag: 'br' }];
  },

  renderDOM() {
    return ['br', {}, 0];
  },
});

export const HardBreak = Node.create({
  name: 'hardBreak',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        contentEditable: 'false',
        lineBreakType: 'page',
      },
    }
  },

  parseDOM() {
    return [{ tag: 'span' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  }
});