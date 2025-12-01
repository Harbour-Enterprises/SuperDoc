import { Mark, Attribute } from '@core/index.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { DOMOutputSpec, Mark as PmMark } from 'prosemirror-model';
import { getUnderlineCssString } from '@extensions/linked-styles/index.js';
import { createCascadeToggleCommands } from '@extensions/shared/cascade-toggle.js';

/**
 * Configuration options for Underline
 * @category Options
 */
interface UnderlineOptions extends Record<string, unknown> {
  /** HTML attributes for underline elements */
  htmlAttributes: Record<string, AttributeValue>;
}

/**
 * @module Underline
 * @sidebarTitle Underline
 * @snippetPath /snippets/extensions/underline.mdx
 * @shortcut Mod-u | toggleUnderline | Toggle underline formatting
 * @shortcut Mod-U | toggleUnderline | Toggle underline formatting (uppercase)
 */
export const Underline = Mark.create<UnderlineOptions>({
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
      { style: 'text-decoration=auto', clearMark: (m: PmMark) => m.type.name === 'u' },
    ];
  },

  renderDOM(
    this: Mark<UnderlineOptions>,
    { htmlAttributes }: { htmlAttributes: Record<string, AttributeValue> },
  ): DOMOutputSpec {
    const merged = Attribute.mergeAttributes(
      this.options.htmlAttributes as Record<string, AttributeValue>,
      htmlAttributes,
    );
    const type = typeof merged?.underlineType === 'string' ? merged.underlineType : undefined;
    const color = typeof merged?.underlineColor === 'string' ? merged.underlineColor : null;
    const css = (getUnderlineCssString as (params: { type?: string; color?: string | null }) => string)({
      type,
      color,
    });

    // strip custom attribute and merge computed style
    const { style, ...rest } = merged || {};
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
    const { setUnderline, unsetUnderline, toggleUnderline } = createCascadeToggleCommands({
      markName: this.name,
      negationAttrs: { underlineType: 'none' },
      isNegation: (attrs) => attrs?.underlineType === 'none',
    });

    return {
      /**
       * Apply underline formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * setUnderline()
       */
      setUnderline,

      /**
       * Remove underline formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * unsetUnderline()
       */
      unsetUnderline,

      /**
       * Toggle underline formatting
       * @category Command
       * @returns {Function} Command
       * @example
       * toggleUnderline()
       */
      toggleUnderline,
    };
  },

  addShortcuts() {
    const editor = (this as unknown as { editor?: { commands?: { toggleUnderline: () => boolean } } }).editor;
    return {
      'Mod-u': () => editor?.commands?.toggleUnderline() ?? false,
      'Mod-U': () => editor?.commands?.toggleUnderline() ?? false,
    };
  },
});
