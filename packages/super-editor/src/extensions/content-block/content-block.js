import { Node, Attribute, Schema } from '@core/index.js';
import { getSpacingStyleString, getMarksStyle } from '@extensions/linked-styles/index.js';

export const ContentBlock = Node.create({
  name: 'contentBlock',

  priority: 1000,

  group: 'block',

  content: '',

  inline: false,

  addOptions() {
    return {
      htmlAttributes: {
        style: 'position: absolute; outline: none; user-select: none; z-index: 0;',
        contentEditable: 'false',
      },
    };
  },

  addAttributes() {
    return {
      size: {
        default: null,
        parseDOM: (element) => element.getAttribute('size'),
        renderDOM: ({ size }) => {
          if (!size) return {};

          let style = '';
          if (size.top) style += `top: ${size.top}px; `;
          if (size.left) style += `left: ${size.left}px; `;
          if (size.width) style += `width: ${size.width}px; `;
          if (size.height) style += `height: ${size.height}px; `;
          if (size.backgroundColor) style += `background-color: ${size.backgroundColor}; `;
          return { style };
        },
      },
    };
  },

  parseDOM() {
    return [{ tag: 'content' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['content', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },
});
