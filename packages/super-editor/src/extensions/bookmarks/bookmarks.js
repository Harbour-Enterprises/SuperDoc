import { Node, Attribute } from '@core/index.js';

export const BookmarkStart = Node.create({
  name: 'bookmarkStart',
  group: 'inline',
  content: 'inline*',
  inline: true,

  addOptions() {
    return {
      htmlAttributes: {
        style: 'display: contents;',
        'aria-label': 'Bookmark start node',
        role: 'link',
      },
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        renderDOM: ({ name }) => {
          if (name) return { name };
          return {};
        },
      },
      id: {
        default: null,
        renderDOM: ({ id }) => {
          if (id) return { id };
          return {};
        },
      },
    };
  },

  renderDOM({ htmlAttributes }) {
    // The third argument (0) tells ProseMirror to place the node’s content inside the <a> element,
    // so the bookmark anchor wraps the text instead of sitting in front of it.
    return ['a', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },
});
