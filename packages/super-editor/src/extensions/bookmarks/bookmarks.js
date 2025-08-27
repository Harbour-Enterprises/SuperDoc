// @ts-check
import { Node, Attribute } from '@core/index.js';

/**
 * Bookmark configuration
 * @typedef {Object} BookmarkConfig
 * @property {string} name - Bookmark name for reference
 * @property {string} [id] - Optional unique identifier
 */

/**
 * @module BookmarkStart
 * @sidebarTitle Bookmarks
 * @snippetPath /snippets/extensions/bookmarks.mdx
 */
export const BookmarkStart = Node.create({
  name: 'bookmarkStart',
  group: 'inline',
  content: 'inline*',
  inline: true,

  addOptions() {
    return {
      /**
       * @typedef {Object} BookmarkOptions
       * @category Options
       * @property {Object} [htmlAttributes] - HTML attributes for the bookmark element
       */
      htmlAttributes: {
        style: 'height: 0; width: 0;',
        'aria-label': 'Bookmark start node',
        role: 'link',
      },
    };
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {string} [name] - Bookmark name for cross-references and navigation
       */
      name: {
        default: null,
        renderDOM: ({ name }) => {
          if (name) return { name };
          return {};
        },
      },

      /**
       * @category Attribute
       * @param {string} [id] - Unique identifier for the bookmark
       */
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
    return ['a', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  },
});
