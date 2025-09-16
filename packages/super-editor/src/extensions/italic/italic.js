// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * @module Italic
 * @sidebarTitle Italic
 * @snippetPath /snippets/extensions/italic.mdx
 * @shortcut Mod-i | toggleItalic | Toggle italic formatting
 * @shortcut Mod-I | toggleItalic | Toggle italic formatting (uppercase)
 */
export const Italic = Mark.create({
  name: 'italic',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {string} [value] - Italic toggle value ('0' renders as normal)
       */
      value: {
        default: null,
        renderDOM: (attrs) => {
          if (!attrs.value) return {};
          if (attrs.value === '0') return { style: 'font-style: normal' };
          return {};
        },
      },
    };
  },

  parseDOM() {
    return [
      { tag: 'i' },
      { tag: 'em' },
      { style: 'font-style=italic' },
      { style: 'font-style=normal', clearMark: (m) => m.type.name == 'em' },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['em', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addCommands() {
    return {
      /**
       * Apply italic formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * setItalic()
       */
      setItalic:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),

      /**
       * Remove italic formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * unsetItalic()
       */
      unsetItalic:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),

      /**
       * Toggle italic formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleItalic()
       */
      toggleItalic:
        () =>
        ({ commands }) =>
          commands.toggleMarkCascade(this.name, { negationAttrs: { value: '0' } }),
    };
  },

  addShortcuts() {
    return {
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-I': () => this.editor.commands.toggleItalic(),
    };
  },
});
