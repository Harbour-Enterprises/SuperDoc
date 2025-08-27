// @ts-check
/**
 * Underline style types
 * @typedef {'single'|'double'|'thick'|'dotted'|'dashed'|'wavy'} UnderlineType
 */

import { Mark, Attribute } from '@core/index.js';

/**
 * @module Underline
 * @sidebarTitle Underline
 * @snippetPath /snippets/extensions/underline.mdx
 * @shortcut Mod-u | toggleUnderline | Toggle underline formatting
 * @shortcut Mod-U | toggleUnderline | Toggle underline formatting (uppercase)
 */
export const Underline = Mark.create({
  name: 'underline',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  parseDOM() {
    return [
      { tag: 'u' },
      { style: 'text-decoration=underline' },
      { style: 'text-decoration=auto', clearMark: (m) => m.type.name == 'u' },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['u', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      underlineType: {
        default: 'single',
      },
    };
  },

  addCommands() {
    return {
      /**
       * Apply underline formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * setUnderline()
       */
      setUnderline:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),

      /**
       * Remove underline formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * unsetUnderline()
       */
      unsetUnderline:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),

      /**
       * Toggle underline formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleUnderline()
       */
      toggleUnderline:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addShortcuts() {
    return {
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-U': () => this.editor.commands.toggleUnderline(),
    };
  },
});
