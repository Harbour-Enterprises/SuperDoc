// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * @module Bold
 * @sidebarTitle Bold
 * @snippetPath /snippets/extensions/bold.mdx
 * @shortcut Mod-b | toggleBold | Toggle bold formatting
 * @shortcut Mod-B | toggleBold | Toggle bold formatting (uppercase)
 */
export const Bold = Mark.create({
  name: 'bold',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      value: {
        default: null,
        renderDOM: (attrs) => {
          if (!attrs.value) return {};

          if (attrs.value === '0') {
            return { style: 'font-weight: normal' };
          }
          return {};
        },
      },
    };
  },

  parseDOM() {
    return [
      { tag: 'strong' },
      { tag: 'b', getAttrs: (node) => node.style.fontWeight != 'normal' && null },
      { style: 'font-weight=400', clearMark: (m) => m.type.name == 'strong' },
      { style: 'font-weight', getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['strong', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addCommands() {
    return {
      /**
       * Apply bold formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * setBold()
       * @note '0' renders as normal weight
       */
      setBold:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),

      /**
       * Remove bold formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * unsetBold()
       */
      unsetBold:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),

      /**
       * Toggle bold formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleBold()
       */
      toggleBold:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-B': () => this.editor.commands.toggleBold(),
    };
  },
});
