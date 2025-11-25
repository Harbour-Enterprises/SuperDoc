// @ts-check
import { Extension } from '@core/index.js';

/**
 * Configuration options for TextAlign
 * @typedef {Object} TextAlignOptions
 * @category Options
 * @property {string[]} [types=['heading', 'paragraph']] - Node types to apply alignment to
 * @property {string[]} [alignments=['left', 'center', 'right', 'justify']] - Available alignment options
 * @property {string} [defaultAlignment='left'] - Default text alignment
 */

/**
 * Attributes for text alignment
 * @typedef {Object} TextAlignAttributes
 * @category Attributes
 * @property {string} [textAlign='left'] - Text alignment value (left, center, right, justify)
 */

/**
 * @module TextAlign
 * @sidebarTitle Text Align
 * @snippetPath /snippets/extensions/text-align.mdx
 * @shortcut Mod-Shift-l | setTextAlign('left') | Align text left
 * @shortcut Mod-Shift-e | setTextAlign('center') | Align text center
 * @shortcut Mod-Shift-r | setTextAlign('right') | Align text right
 * @shortcut Mod-Shift-j | setTextAlign('justify') | Justify text
 */
export const TextAlign = Extension.create({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          /**
           * @category Attribute
           * @param {string} [textAlign='left'] - Text alignment value (left, center, right, justify)
           */
          textAlign: {
            default: this.options.defaultAlignment,
            parseDOM: (el) => {
              const alignment = el.style.textAlign || this.options.defaultAlignment;
              const containsAlignment = this.options.alignments.includes(alignment);
              return containsAlignment ? alignment : this.options.defaultAlignment;
            },
            renderDOM: (attrs) => {
              if (attrs.textAlign === this.options.defaultAlignment) return {};
              const textAlign = attrs.textAlign === 'both' ? 'justify' : attrs.textAlign;
              if (!textAlign) return {};
              return { style: `text-align: ${textAlign}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set text alignment
       * @category Command
       * @param {string} alignment - Alignment value (left, center, right, justify)
       * @example
       * editor.commands.setTextAlign('center')
       * editor.commands.setTextAlign('justify')
       * @note Applies to all configured node types (heading, paragraph by default)
       */
      setTextAlign:
        (alignment) =>
        ({ commands }) => {
          const containsAlignment = this.options.alignments.includes(alignment);
          if (!containsAlignment) return false;

          return this.options.types
            .map((type) => commands.updateAttributes(type, { textAlign: alignment }))
            .every((result) => result);
        },

      /**
       * Remove text alignment (reset to default)
       * @category Command
       * @example
       * editor.commands.unsetTextAlign()
       * @note Resets alignment to the default value
       */
      unsetTextAlign:
        () =>
        ({ commands }) => {
          return this.options.types
            .map((type) => commands.resetAttributes(type, 'textAlign'))
            .every((result) => result);
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-l': () => this.editor.commands.setTextAlign('left'),
      'Mod-Shift-e': () => this.editor.commands.setTextAlign('center'),
      'Mod-Shift-r': () => this.editor.commands.setTextAlign('right'),
      'Mod-Shift-j': () => this.editor.commands.setTextAlign('justify'),
    };
  },
});
