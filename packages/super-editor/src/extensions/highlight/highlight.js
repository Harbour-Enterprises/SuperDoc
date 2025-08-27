// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * @module Highlight
 * @sidebarTitle Highlight
 * @snippetPath /snippets/extensions/highlight.mdx
 * @shortcut Mod-Shift-h | toggleHighlight | Toggle highlighted formatting
 */
export const Highlight = Mark.create({
  name: 'highlight',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseDOM: (element) => element.getAttribute('data-color') || element.style.backgroundColor,
        renderDOM: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}; color: inherit`,
          };
        },
      },
    };
  },

  parseDOM() {
    return [{ tag: 'mark' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['mark', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addCommands() {
    return {
      /**
       * Apply highlight with specified color
       * @category Command
       * @param {string} color - CSS color value
       * @returns {Function} Command
       * @example
       * setHighlight('#FFEB3B')
       * setHighlight('rgba(255, 235, 59, 0.5)')
       */
      setHighlight:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),

      /**
       * Remove highlight formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * unsetHighlight()
       */
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),

      /**
       * Toggle highlight formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleHighlight()
       */
      toggleHighlight:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor.commands.toggleHighlight(),
    };
  },
});
