// @ts-check
import { Extension } from '@core/index.js';

/**
 * Heading attributes
 * @typedef {Object} HeadingAttributes
 * @property {number} level - Heading level (1-6)
 */

/**
 * @module Heading
 * @sidebarTitle Heading
 * @snippetPath /snippets/extensions/heading.mdx
 * @shortcut Mod-Alt-1 | toggleHeading | Toggle heading level 1
 * @shortcut Mod-Alt-2 | toggleHeading | Toggle heading level 2
 * @shortcut Mod-Alt-3 | toggleHeading | Toggle heading level 3
 * @shortcut Mod-Alt-4 | toggleHeading | Toggle heading level 4
 * @shortcut Mod-Alt-5 | toggleHeading | Toggle heading level 5
 * @shortcut Mod-Alt-6 | toggleHeading | Toggle heading level 6
 */
export const Heading = Extension.create({
  name: 'heading',

  addOptions() {
    return {
      /**
       * @typedef {Object} HeadingOptions
       * @category Options
       * @property {number[]} [levels=[1,2,3,4,5,6]] - Supported heading levels
       */
      levels: [1, 2, 3, 4, 5, 6],
    };
  },

  addCommands() {
    return {
      /**
       * Set a heading with specified level
       * @category Command
       * @param {HeadingAttributes} attributes - Heading attributes including level
       * @returns {Function} Command function
       * @example
       * // Set heading level 2
       * setHeading({ level: 2 })
       * @note Converts current block to heading
       */
      setHeading:
        (attributes) =>
        ({ commands }) => {
          const containsLevel = this.options.levels.includes(attributes.level);
          if (!containsLevel) return false;
          return commands.setLinkedStyle({ id: `Heading${attributes.level}` });
        },

      /**
       * Toggle between heading and paragraph
       * @category Command
       * @param {HeadingAttributes} attributes - Heading attributes including level
       * @returns {Function} Command function
       * @example
       * // Toggle heading level 1
       * toggleHeading({ level: 1 })
       *
       * // Toggle heading level 3
       * toggleHeading({ level: 3 })
       * @note Switches between heading and paragraph for the same level
       */
      toggleHeading:
        (attributes) =>
        ({ commands }) => {
          const containsLevel = this.options.levels.includes(attributes.level);
          if (!containsLevel) return false;
          return commands.toggleLinkedStyle({ id: `Heading${attributes.level}` }, 'paragraph');
        },
    };
  },

  addShortcuts() {
    return this.options.levels.reduce(
      (items, level) => ({
        ...items,
        ...{
          [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level }),
        },
      }),
      {},
    );
  },
});
