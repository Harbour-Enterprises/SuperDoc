import { Node, Attribute } from '@core/index.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { DOMOutputSpec, ParseRule } from 'prosemirror-model';

interface DocumentPartObjectOptions extends Record<string, unknown> {
  htmlAttributes: Record<string, AttributeValue>;
}

interface DocumentPartObjectAttrs {
  sdBlockId?: string | null;
  id?: string | null;
  docPartGallery?: unknown;
  docPartUnique?: boolean;
}

export const DocumentPartObject = Node.create<DocumentPartObjectOptions>({
  name: 'documentPartObject',
  group: 'block',
  content: 'block*',
  isolating: true,
  excludeFromSummaryJSON: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-document-part-object-block',
        'aria-label': 'Structured document part block',
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [
      {
        tag: 'div.sd-document-part-object-block',
        priority: 60,
      },
    ];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, AttributeValue> }): DOMOutputSpec {
    return ['div', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem: Element) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs: DocumentPartObjectAttrs) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },
      id: { default: null },
      docPartGallery: { default: null },
      docPartUnique: {
        default: true,
      },
    };
  },
});
