// @ts-nocheck

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

  // @ts-expect-error - Command signatures will be fixed in TS migration
  addCommands() {
    return {
      /**
       * Insert a bookmark at the current position
       * @category Command
       * @param {BookmarkConfig} config - Bookmark configuration
       * @returns {Function} Command function
       * @example
       * // Insert a named bookmark
       * insertBookmark({ name: 'chapter1' })
       *
       * // Insert with ID
       * insertBookmark({ name: 'introduction', id: 'intro-001' })
       * @note Bookmarks are invisible markers for navigation and cross-references
       */
      insertBookmark:
        (config) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: config,
          });
        },

      /**
       * Navigate to a bookmark by name
       * @category Command
       * @param {string} name - Bookmark name to navigate to
       * @returns {Function} Command function
       * @example
       * goToBookmark('chapter1')
       * @note Scrolls the document to the bookmark position
       */
      goToBookmark:
        (name) =>
        ({ editor, tr }) => {
          const { doc } = tr;
          let targetPos = null;

          doc.descendants((node, pos) => {
            if (node.type.name === 'bookmarkStart' && node.attrs.name === name) {
              targetPos = pos;
              return false; // Stop iteration
            }
          });

          if (targetPos !== null) {
            editor.commands.focus(targetPos);
            return true;
          }
          return false;
        },
    };
  },
});
