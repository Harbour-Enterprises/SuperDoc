import { Mark, Attribute, type AttributeValue } from '@core/index.js';
import { createCascadeToggleCommands } from '@extensions/shared/cascade-toggle.js';
import type { DOMOutputSpec, Mark as PmMark } from 'prosemirror-model';

/**
 * Configuration options for Strike
 * @category Options
 */
interface StrikeOptions extends Record<string, unknown> {
  /** HTML attributes for strikethrough elements */
  htmlAttributes: Record<string, unknown>;
}

/**
 * @module Strike
 * @sidebarTitle Strike
 * @snippetPath /snippets/extensions/strike.mdx
 * @shortcut Mod-Shift-x | toggleStrike | Toggle strikethrough formatting
 */
export const Strike = Mark.create<StrikeOptions>({
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
      { style: 'text-decoration=auto', clearMark: (m: PmMark) => m.type.name === 's' },
    ];
  },

  renderDOM({ mark, htmlAttributes }: { mark: PmMark; htmlAttributes: Record<string, AttributeValue> }): DOMOutputSpec {
    const merged = Attribute.mergeAttributes(
      this.options.htmlAttributes as Record<string, AttributeValue>,
      htmlAttributes,
    );
    const { value } = mark.attrs as { value?: string | boolean | null };
    const { ...rest } = merged || {};
    if (value === '0' || value === false) {
      return ['span', rest, 0];
    }
    return ['s', rest, 0];
  },

  addCommands() {
    const { setStrike, unsetStrike, toggleStrike } = createCascadeToggleCommands({
      markName: this.name,
      negationAttrs: { value: '0' },
    });

    return {
      /**
       * Apply strikethrough formatting
       * @category Command
       * @example
       * editor.commands.setStrike()
       */
      setStrike,

      /**
       * Remove strikethrough formatting
       * @category Command
       * @example
       * editor.commands.unsetStrike()
       */
      unsetStrike,

      /**
       * Toggle strikethrough formatting
       * @category Command
       * @example
       * editor.commands.toggleStrike()
       */
      toggleStrike,
    };
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {string} [value] - Strike toggle value ('0' renders as normal)
       */
      value: {
        default: null,
        renderDOM: (attrs: { value?: string | boolean | null }) => {
          if (attrs.value == null) return {};
          if (attrs.value === '0' || !attrs.value) {
            return { style: 'text-decoration: none' };
          }
          return {};
        },
      },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-x': () => this.editor?.commands.toggleStrike() ?? false,
      'Mod-Shift-X': () => this.editor?.commands.toggleStrike() ?? false,
    };
  },
});
