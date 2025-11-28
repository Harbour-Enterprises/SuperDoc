import { Node, Attribute } from '@core/index.js';
import type { AttributeValue, RenderNodeContext } from '@core/index.js';
import type { DOMOutputSpec, ParseRule } from 'prosemirror-model';

interface TableOfContentsOptions extends Record<string, AttributeValue> {
  htmlAttributes: Record<string, AttributeValue>;
}

export const TableOfContents = Node.create<TableOfContentsOptions>({
  name: 'tableOfContents',

  group: 'block',

  content: 'paragraph+',

  inline: false,

  addOptions() {
    return {
      htmlAttributes: {
        'data-id': 'table-of-contents',
        'aria-label': 'Table of Contents',
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [
      {
        tag: 'div[data-id="table-of-contents"]',
      },
    ];
  },

  renderDOM({ htmlAttributes }: RenderNodeContext): DOMOutputSpec {
    return [
      'div',
      Attribute.mergeAttributes(this.options?.htmlAttributes ?? {}, htmlAttributes as Record<string, AttributeValue>),
      0,
    ];
  },

  addAttributes() {
    return {
      instruction: {
        default: null,
        rendered: false,
      },
      /**
       * @private
       * @category Attribute
       * @param {string} [sdBlockId] - Internal block tracking ID (not user-configurable)
       */
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem: Element) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs: { sdBlockId?: string | null }) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },
    };
  },
});
