import { Node, Attribute, type AttributeValue } from '@core/index.js';
import type { Node as PmNode, DOMOutputSpec } from 'prosemirror-model';

/**
 * Configuration options for Mention
 */
export interface MentionOptions extends Record<string, unknown> {
  htmlAttributes: {
    class: string;
    'aria-label': string;
  };
}

/**
 * @module Mention
 * @sidebarTitle Mention
 * @snippetPath /snippets/extensions/mention.mdx
 */
export const Mention = Node.create<MentionOptions>({
  name: 'mention',

  group: 'inline',

  inline: true,

  selectable: false,

  excludeFromSummaryJSON: true,

  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-editor-mention',
        'aria-label': 'Mention node',
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
        getAttrs: (node: HTMLElement) => ({
          name: node.getAttribute('name') || null,
          email: node.getAttribute('email') || null,
        }),
      },
    ];
  },

  renderDOM({ node, htmlAttributes }: { node: PmNode; htmlAttributes?: Record<string, unknown> }): DOMOutputSpec {
    const { name, email } = node.attrs as { name?: string; email?: string };

    return [
      'span',
      Attribute.mergeAttributes(
        { 'data-type': this.name },
        this.options.htmlAttributes,
        (htmlAttributes as Record<string, AttributeValue>) ?? {},
      ),
      `@${name ? name : email}`,
    ];
  },

  addAttributes() {
    return {
      name: { default: null },
      email: { default: null },
    };
  },
});
