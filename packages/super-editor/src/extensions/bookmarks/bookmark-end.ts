import { Node, Attribute } from '@core/index.js';
import type { DOMOutputSpec } from 'prosemirror-model';

/**
 * Bookmark end options
 * @category Options
 */
export interface BookmarkEndOptions extends Record<string, unknown> {
  /**
   * HTML attributes for the bookmark end element
   */
  htmlAttributes: Record<string, string>;
}

/**
 * @module BookmarkEnd
 * @sidebarTitle Bookmarks
 */
export const BookmarkEnd = Node.create<BookmarkEndOptions>({
  name: 'bookmarkEnd',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        style: 'height: 0; width: 0; display: none;',
        'aria-label': 'Bookmark end node',
        role: 'none',
      },
    };
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {string} [id] - Unique identifier matching the corresponding bookmarkStart
       */
      id: {
        default: null,
        renderDOM: ({ id }) => {
          if (id) return { 'data-bookmark-end-id': id };
          return {};
        },
      },

      /**
       * @category Attribute
       * @param {string} [displacedByCustomXml] - Indicates if bookmark was displaced by custom XML
       */
      displacedByCustomXml: {
        default: null,
        renderDOM: ({ displacedByCustomXml }) => {
          if (displacedByCustomXml) return { 'data-displaced-by-custom-xml': displacedByCustomXml };
          return {};
        },
      },

      // Pass-through attributes that may not be used in rendering but should be preserved
      colFirst: {
        default: null,
      },
      colLast: {
        default: null,
      },
    };
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, unknown> }): DOMOutputSpec {
    return ['span', Attribute.mergeAttributes((this.options as BookmarkEndOptions).htmlAttributes, htmlAttributes)];
  },

  addCommands() {
    return {
      /**
       * Insert a bookmark end marker at the current position
       * @category Command
       * @param {string} id - The bookmark ID to match with bookmarkStart
       * @returns {Function} Command function
       * @example
       * // Insert bookmark end
       * insertBookmarkEnd('bookmark-001')
       */
      insertBookmarkEnd:
        (id: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { id },
          });
        },
    };
  },
});
