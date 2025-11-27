import { Mark, Attribute } from '@core/index.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { DOMOutputSpec, Mark as PmMark } from 'prosemirror-model';
import { createCascadeToggleCommands } from '@extensions/shared/cascade-toggle.js';

/**
 * Configuration options for Bold
 * @category Options
 */
interface BoldOptions extends Record<string, unknown> {
  /** HTML attributes for the strong element */
  htmlAttributes: Record<string, AttributeValue>;
}

/**
 * @module Bold
 * @sidebarTitle Bold
 * @snippetPath /snippets/extensions/bold.mdx
 * @shortcut Mod-b | toggleBold | Toggle bold formatting
 * @shortcut Mod-B | toggleBold | Toggle bold formatting (uppercase)
 */
export const Bold = Mark.create<BoldOptions>({
  name: 'bold',

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      value: {
        default: null,
        renderDOM: (attrs: { value?: string | null }) => {
          if (attrs.value == null) return {};
          if (attrs.value === '0' || !attrs.value) {
            return { style: 'font-weight: normal' };
          }
          return {};
        },
      },
    };
  },

  parseDOM() {
    return [
      { tag: 'strong' },
      {
        tag: 'b',
        getAttrs: (node: HTMLElement | string) => (node as HTMLElement).style?.fontWeight !== 'normal' && null,
      },
      { style: 'font-weight=400', clearMark: (m: PmMark) => m.type.name === 'strong' },
      {
        style: 'font-weight',
        getAttrs: (value: string | HTMLElement) => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      },
    ];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, unknown> }): DOMOutputSpec {
    const options = this.options as BoldOptions;
    const merged = Attribute.mergeAttributes(options.htmlAttributes, htmlAttributes);
    const { value, ...rest } = merged || {};
    if (value === '0') {
      return ['span', rest, 0] as const;
    }
    return ['strong', rest, 0] as const;
  },

  addCommands() {
    const { setBold, unsetBold, toggleBold } = createCascadeToggleCommands({
      markName: this.name,
      negationAttrs: { value: '0' },
    });

    return {
      /**
       * Apply bold formatting
       * @category Command
       * @example
       * editor.commands.setBold()
       * @note '0' renders as normal weight
       */
      setBold,

      /**
       * Remove bold formatting
       * @category Command
       * @example
       * editor.commands.unsetBold()
       */
      unsetBold,

      /**
       * Toggle bold formatting
       * @category Command
       * @example
       * editor.commands.toggleBold()
       */
      toggleBold,
    };
  },

  addShortcuts() {
    return {
      'Mod-b': () => (this.editor as { commands: { toggleBold: () => boolean } }).commands.toggleBold(),
      'Mod-B': () => (this.editor as { commands: { toggleBold: () => boolean } }).commands.toggleBold(),
    };
  },
});
