// @ts-check
import { Node, Attribute } from '@core/index.js';

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
export const Heading = Node.create({
  name: 'heading',

  group: 'block',

  content: 'inline*',

  defining: true,

  addOptions() {
    return {
      /**
       * @typedef {Object} HeadingOptions
       * @category Options
       * @property {number[]} [levels=[1,2,3,4,5,6]] - Supported heading levels
       * @property {Object} [htmlAttributes] - HTML attributes for heading elements
       */
      levels: [1, 2, 3, 4, 5, 6],
      htmlAttributes: {
        'aria-label': 'Heading node',
      },
    };
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {number} [level=1] - Heading level from 1 (largest) to 6 (smallest)
       */
      level: {
        default: 1,
        rendered: false,
      },

      /**
       * @private
       * @category Attribute
       * @param {Object} [tabStops] - Internal tab stop configuration
       */
      tabStops: { rendered: false },

      /**
       * @private
       * @category Attribute
       * @param {string} [sdBlockId] - Internal block tracking ID
       */
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },
    };
  },

  parseDOM() {
    return this.options.levels.map((level) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },

  renderDOM({ node, htmlAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];
    return [`h${level}`, Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
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
          return commands.setNode(this.name, attributes);
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
          return commands.toggleNode(this.name, 'paragraph', attributes);
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
