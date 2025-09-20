// @ts-check
import { Node, Attribute } from '@core/index.js';

/**
 * Size configuration for content blocks
 * @typedef {Object} ContentBlockSize
 * @property {number} [top] - Top position in pixels
 * @property {number} [left] - Left position in pixels
 * @property {number|string} [width] - Width in pixels or percentage (e.g., "50%")
 * @property {number|string} [height] - Height in pixels or percentage
 */

/**
 * Content block configuration
 * @typedef {Object} ContentBlockConfig
 * @property {boolean} [horizontalRule] - Whether this is a horizontal rule
 * @property {ContentBlockSize} [size] - Size and position configuration
 * @property {string} [background] - Background color (hex, rgb, or named color)
 */

/**
 * Configuration options for ContentBlock
 * @typedef {Object} ContentBlockOptions
 * @category Options
 * @property {Object} [htmlAttributes] HTML attributes for the block element
 */

/**
 * Attributes for content blocks
 * @typedef {Object} ContentBlockAttributes
 * @category Attributes
 * @property {boolean} [horizontalRule=false] Whether this block is a horizontal rule
 * @property {ContentBlockSize} [size] Size and position of the content block
 * @property {string} [background] Background color for the block
 * @property {Object} [drawingContent] @internal Internal drawing data
 * @property {Object} [attributes] @internal Additional internal attributes
 * @example
 * // Insert a custom content block
 * editor.commands.insertContentBlock({
 *   size: { width: '100%', height: 2 },
 *   background: '#e5e7eb'
 * })
 */

/**
 * @module ContentBlock
 * @sidebarTitle Content Block
 * @snippetPath /snippets/extensions/content-block.mdx
 */
export const ContentBlock = Node.create({
  name: 'contentBlock',

  group: 'inline',

  content: '',

  isolating: true,
  atom: true,
  inline: true,

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
      },
    };
  },

  addAttributes() {
    return {
      horizontalRule: {
        default: false,
        renderDOM: ({ horizontalRule }) => {
          if (!horizontalRule) return {};
          return { 'data-horizontal-rule': 'true' };
        },
      },

      size: {
        default: null,
        renderDOM: ({ size }) => {
          if (!size) return {};

          let style = '';
          if (size.top) style += `top: ${size.top}px; `;
          if (size.left) style += `left: ${size.left}px; `;
          if (size.width) style += `width: ${size.width.toString().endsWith('%') ? size.width : `${size.width}px`}; `;
          if (size.height)
            style += `height: ${size.height.toString().endsWith('%') ? size.height : `${size.height}px`}; `;
          return { style };
        },
      },

      background: {
        default: null,
        renderDOM: (attrs) => {
          if (!attrs.background) return {};
          return {
            style: `background-color: ${attrs.background}`,
          };
        },
      },

      drawingContent: {
        rendered: false,
      },

      attributes: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['div', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, { 'data-type': this.name })];
  },

  addCommands() {
    return {
      /**
       * Insert a horizontal rule
       * @category Command
       * @example
       * editor.commands.insertHorizontalRule()
       * @note Creates a visual separator between content sections
       */
      insertHorizontalRule:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              horizontalRule: true,
              size: { width: '100%', height: 2 },
              background: '#e5e7eb',
            },
          });
        },

      /**
       * Insert a content block
       * @category Command
       * @param {ContentBlockConfig} config - Block configuration
       * @example
       * // Insert a spacer block
       * editor.commands.insertContentBlock({ size: { height: 20 } })
       *
       * @example
       * // Insert a colored divider
       * editor.commands.insertContentBlock({
       *   size: { width: '50%', height: 3 },
       *   background: '#3b82f6'
       * })
       * @note Used for spacing, dividers, and special inline content
       */
      insertContentBlock:
        (config) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: config,
          });
        },
    };
  },
});
