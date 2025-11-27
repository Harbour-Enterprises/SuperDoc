import { Mark, Attribute } from '@core/index.js';

/**
 * Configuration options for Highlight
 * @category Options
 */
export interface HighlightOptions extends Record<string, unknown> {
  /** HTML attributes for highlight elements */
  htmlAttributes: Record<string, unknown>;
}

/**
 * @module Highlight
 * @sidebarTitle Highlight
 * @snippetPath /snippets/extensions/highlight.mdx
 * @shortcut Mod-Shift-h | toggleHighlight | Toggle highlighted formatting
 */
export const Highlight = Mark.create<HighlightOptions>({
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
       * @example
       * editor.commands.setHighlight('#FFEB3B')
       * editor.commands.setHighlight('rgba(255, 235, 59, 0.5)')
       */
      setHighlight:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),

      /**
       * Remove highlight formatting
       * @category Command
       * @example
       * editor.commands.unsetHighlight()
       */
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),

      /**
       * Toggle highlight formatting
       * @category Command
       * @example
       * editor.commands.toggleHighlight()
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
