import { Mark, Attribute } from '@core/index.js';
import { createCascadeToggleCommands } from '@extensions/shared/cascade-toggle.js';
import type { ParseRule, DOMOutputSpec } from 'prosemirror-model';

/**
 * Configuration options for Italic
 * @category Options
 */
interface ItalicOptions extends Record<string, unknown> {
  /** HTML attributes for italic elements */
  htmlAttributes: Record<string, unknown>;
}

/**
 * @module Italic
 * @sidebarTitle Italic
 * @snippetPath /snippets/extensions/italic.mdx
 * @shortcut Mod-i | toggleItalic | Toggle italic formatting
 * @shortcut Mod-I | toggleItalic | Toggle italic formatting (uppercase)
 */
export const Italic = Mark.create<ItalicOptions>({
  name: 'italic',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param value - Italic toggle value ('0' renders as normal)
       */
      value: {
        default: null,
        renderDOM: (attrs: Record<string, unknown>) => {
          if (attrs.value == null) return {};
          if (attrs.value === '0' || !attrs.value) return { style: 'font-style: normal' };
          return {};
        },
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [
      { tag: 'i' },
      { tag: 'em' },
      { style: 'font-style=italic' },
      { style: 'font-style=normal', clearMark: (m) => m.type.name == 'em' },
    ];
  },

  renderDOM(
    this: { options: ItalicOptions },
    { htmlAttributes }: { htmlAttributes?: Record<string, unknown> } = {},
  ): DOMOutputSpec {
    const options = this.options;
    const merged = Attribute.mergeAttributes(options?.htmlAttributes ?? {}, htmlAttributes ?? {});
    const { value, ...rest } = merged || {};
    if (value === '0') {
      return ['span', rest, 0];
    }
    return ['em', rest, 0];
  },

  addCommands() {
    const { setItalic, unsetItalic, toggleItalic } = createCascadeToggleCommands({
      markName: this.name,
      negationAttrs: { value: '0' },
    });

    return {
      /**
       * Apply italic formatting
       * @category Command
       * @example
       * editor.commands.setItalic()
       */
      setItalic,

      /**
       * Remove italic formatting
       * @category Command
       * @example
       * editor.commands.unsetItalic()
       */
      unsetItalic,

      /**
       * Toggle italic formatting
       * @category Command
       * @example
       * editor.commands.toggleItalic()
       */
      toggleItalic,
    };
  },

  addShortcuts() {
    return {
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-I': () => this.editor.commands.toggleItalic(),
    };
  },
});
