import { Schema } from 'prosemirror-model';
import { schema as baseSchema } from 'prosemirror-test-builder';

const nodes = {
  doc: { content: 'block+' },
  paragraph: {
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM() {
      return ['p', 0];
    },
  },
  text: { group: 'inline' },
  tab: {
    inline: true,
    group: 'inline',
    atom: true,
    selectable: false,
    parseDOM: [{ tag: 'span[data-tab]' }],
    toDOM() {
      return ['span', { 'data-tab': 'true' }, '\t'];
    },
  },
  orderedList: {
    group: 'block',
    content: 'listItem+',
    attrs: { order: { default: 1 } },
    parseDOM: [
      {
        tag: 'ol',
        getAttrs(dom) {
          return { order: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1 };
        },
      },
    ],
    toDOM(node) {
      return node.attrs.order === 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0];
    },
  },
  bulletList: {
    group: 'block',
    content: 'listItem+',
    parseDOM: [{ tag: 'ul' }],
    toDOM() {
      return ['ul', 0];
    },
  },
  listItem: {
    group: 'block',
    content: 'paragraph+',
    parseDOM: [{ tag: 'li' }],
    toDOM() {
      return ['li', 0];
    },
  },
};

export const schemaWithLists = new Schema({ nodes, marks: baseSchema.spec.marks });
