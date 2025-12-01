import { Mark, Attribute, type AttributeValue } from '@core/index.js';

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
        parseDOM: (element: HTMLElement) => element.getAttribute('data-color') || element.style.backgroundColor,
        renderDOM: (attributes: { color?: string | null }) => {
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

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, AttributeValue> }) {
    return [
      'mark',
      Attribute.mergeAttributes(this.options.htmlAttributes as Record<string, AttributeValue>, htmlAttributes),
      0,
    ];
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
        (color: string) =>
        ({ commands }: { commands: { setMark: (name: string, attrs: Record<string, unknown>) => boolean } }) =>
          commands.setMark(this.name, { color }),

      /**
       * Remove highlight formatting
       * @category Command
       * @example
       * editor.commands.unsetHighlight()
       */
      unsetHighlight:
        () =>
        ({ commands }: { commands: { unsetMark: (name: string) => boolean } }) =>
          commands.unsetMark(this.name),

      /**
       * Toggle highlight formatting
       * @category Command
       * @example
       * editor.commands.toggleHighlight()
       */
      toggleHighlight:
        () =>
        ({ commands }: { commands: { toggleMark: (name: string) => boolean } }) =>
          commands.toggleMark(this.name),
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor?.commands.toggleHighlight() ?? false,
    };
  },
});
