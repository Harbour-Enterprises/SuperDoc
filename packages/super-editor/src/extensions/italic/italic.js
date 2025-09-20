// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * Configuration options for Italic
 * @typedef {Object} ItalicOptions
 * @category Options
 * @property {Object} [htmlAttributes={}] - HTML attributes for italic elements
 */

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
       * @example
       * editor.commands.setItalic()
       */
      setItalic:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),

      /**
       * Remove italic formatting
       * @category Command
       * @example
       * editor.commands.unsetItalic()
       */
      unsetItalic:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),

      /**
       * Toggle italic formatting
       * @category Command
       * @example
       * editor.commands.toggleItalic()
       */
      toggleItalic:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addShortcuts() {
    return {
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-I': () => this.editor.commands.toggleItalic(),
    };
  },
});
