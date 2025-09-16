// @ts-check
/**
 * Underline style configuration
 * @typedef {Object} UnderlineConfig
 * @property {'single'|'double'|'thick'|'dotted'|'dashed'|'wavy'} value - Style variant
 */

import { Mark, Attribute } from '@core/index.js';
import { getUnderlineCssString } from '@extensions/linked-styles/index.js';

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
    const merged = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    const type = merged?.underlineType;
    const color = merged?.underlineColor;
    const css = getUnderlineCssString({ type, color });

    // strip custom attribute and merge computed style
    const { underlineType, underlineColor, style, ...rest } = merged || {};
    const styleString = [style, css].filter(Boolean).join('; ');

    if (type === 'none') {
      return ['span', { ...rest, ...(styleString ? { style: styleString } : {}) }, 0];
    }
    return ['u', { ...rest, ...(styleString ? { style: styleString } : {}) }, 0];
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {UnderlineConfig} [underlineType='single'] - Style of underline
       */
      underlineType: {
        default: 'single',
      },
      underlineColor: {
        default: null,
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
          // Cascade-aware toggle with explicit negation detector for underline
          commands.toggleMarkCascade(this.name, {
            negationAttrs: { underlineType: 'none' },
            isNegation: (attrs) => attrs?.underlineType === 'none',
          }),
    };
  },

  addShortcuts() {
    return {
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-U': () => this.editor.commands.toggleUnderline(),
    };
  },
});
