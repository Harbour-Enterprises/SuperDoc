// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * @module Italic
 * @sidebarTitle Italic
 * @snippetPath /snippets/extensions/italic.mdx
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
