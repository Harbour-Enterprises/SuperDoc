// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * @module Strike
 * @sidebarTitle Strike
 * @snippetPath /snippets/extensions/strike.mdx
 * @shortcut Mod-Shift-s | toggleStrike | Toggle strikethrough formatting
 */
export const Strike = Mark.create({
  name: 'strike',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  parseDOM() {
    return [
      { tag: 's' },
      { style: 'text-decoration=line-through' },
      { style: 'text-decoration=auto', clearMark: (m) => m.type.name == 's' },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['s', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addCommands() {
    return {
      /**
       * Apply strikethrough formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * setStrike()
       */
      setStrike:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },

      /**
       * Remove strikethrough formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * unsetStrike()
       */
      unsetStrike:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },

      /**
       * Toggle strikethrough formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleStrike()
       */
      toggleStrike:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-s': () => this.editor.commands.toggleStrike(),
    };
  },
});
