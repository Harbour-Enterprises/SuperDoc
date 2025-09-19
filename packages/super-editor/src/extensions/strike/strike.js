// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * Configuration options for Strike
 * @typedef {Object} StrikeOptions
 * @category Options
 * @property {Object} [htmlAttributes={}] - HTML attributes for strikethrough elements
 */

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
       * @example
       * editor.commands.setStrike()
       */
      setStrike:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },

      /**
       * Remove strikethrough formatting
       * @category Command
       * @example
       * editor.commands.unsetStrike()
       */
      unsetStrike:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },

      /**
       * Toggle strikethrough formatting
       * @category Command
       * @example
       * editor.commands.toggleStrike()
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
