import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema as basic } from 'prosemirror-schema-basic';
import { builders } from 'prosemirror-test-builder';
import { toggleList } from './toggleList';

vi.mock('../helpers/findParentNode.js', () => {
  function findParentNode(predicate) {
    return (sel) => {
      const $pos = sel.$from;
      for (let d = $pos.depth; d >= 0; d--) {
        const node = $pos.node(d);
        if (predicate(node)) {
          const pos = $pos.before(d);
          return { node, pos, depth: d };
        }
      }
      return null;
    };
  }
  return { findParentNode };
});

let __id = 1;
const calls = {};
function track(name, payload) {
  calls[name] ??= [];
  calls[name].push(payload);
}

vi.mock('@helpers/list-numbering-helpers.js', () => {
  const ListHelpers = {
    getNewListId() {
      return __id++;
    },
    generateNewListDefinition({ numId, listType }) {
      track('generateNewListDefinition', { numId, listType: listType?.name || listType });
    },
    getListDefinitionDetails({ listType }) {
      const isOrdered = (typeof listType === 'string' ? listType : listType?.name) === 'orderedList';
      return {
        start: 1,
        numFmt: isOrdered ? 'decimal' : 'bullet',
        lvlText: isOrdered ? '%1.' : '•',
        listNumberingType: isOrdered ? 'decimal' : 'bullet',
        abstract: {},
        abstractId: '1',
      };
    },
    createListItemNodeJSON({ level, lvlText, numId, numFmt, listLevel, contentNode }) {
      const content = Array.isArray(contentNode) ? contentNode : [contentNode];
      return {
        type: 'listItem',
        attrs: { level, listLevel, numId, lvlText, numPrType: 'inline', listNumberingType: numFmt },
        content,
      };
    },
    createSchemaOrderedListNode({ level, numId, listType, editor, listLevel, contentNode }) {
      const isOrdered = (typeof listType === 'string' ? listType : listType?.name) === 'orderedList';
      const type = isOrdered ? 'orderedList' : 'bulletList';
      return editor.schema.nodeFromJSON({
        type,
        attrs: {
          listId: numId,
          ...(isOrdered ? { order: level, 'list-style-type': 'decimal' } : { 'list-style-type': 'bullet' }),
        },
        content: [
          ListHelpers.createListItemNodeJSON({
            level,
            numId,
            listLevel,
            contentNode,
            numFmt: isOrdered ? 'decimal' : 'bullet',
            lvlText: isOrdered ? '%1.' : '•',
          }),
        ],
      });
    },
    insertNewList: () => true,
    changeNumIdSameAbstract: vi.fn(),
    removeListDefinitions: vi.fn(),
    getListItemStyleDefinitions: vi.fn(),
    addInlineTextMarks: (_, marks) => marks || [],
    baseOrderedListDef: {},
    baseBulletList: {},
  };
  return { ListHelpers };
});

const listItemSpec = {
  content: 'paragraph block*',
  attrs: {
    level: { default: 0 },
    listLevel: { default: [1] },
    numId: { default: null },
    lvlText: { default: null },
    numPrType: { default: null },
    listNumberingType: { default: null },
  },
  renderDOM() {
    return ['li', 0];
  },
  parseDOM: () => [{ tag: 'li' }],
};

const orderedListSpec = {
  group: 'block',
  content: 'listItem+',
  attrs: {
    listId: { default: null },
    'list-style-type': { default: 'decimal' },
    order: { default: 0 },
  },
  renderDOM() {
    return ['ol', 0];
  },
  parseDOM: () => [{ tag: 'ol' }],
};

const bulletListSpec = {
  group: 'block',
  content: 'listItem+',
  attrs: {
    listId: { default: null },
    'list-style-type': { default: 'bullet' },
  },
  renderDOM() {
    return ['ul', 0];
  },
  parseDOM: () => [{ tag: 'ul' }],
};

const nodes = basic.spec.nodes
  .update('paragraph', basic.spec.nodes.get('paragraph'))
  .addToEnd('listItem', listItemSpec)
  .addToEnd('orderedList', orderedListSpec)
  .addToEnd('bulletList', bulletListSpec);

const schema = new Schema({ nodes, marks: basic.spec.marks });

const {
  doc,
  p,
  bulletList,
  orderedList,
  li: listItem,
} = builders(schema, {
  doc: { nodeType: 'doc' },
  p: { nodeType: 'paragraph' },
  bulletList: { nodeType: 'bulletList' },
  orderedList: { nodeType: 'orderedList' },
  li: { nodeType: 'listItem' },
});

function firstInlinePos(root) {
  let pos = null;
  root.descendants((node, p) => {
    if (node.isTextblock && node.content.size > 0 && pos == null) {
      pos = p + 1; // first position inside inline content
      return false;
    }
    return true;
  });
  return pos ?? 1;
}

function lastInlinePos(root) {
  let pos = null;
  root.descendants((node, p) => {
    if (node.isTextblock && node.content.size > 0) {
      pos = p + node.content.size; // last position inside inline content
    }
    return true;
  });
  return pos ?? Math.max(1, root.nodeSize - 2);
}

function inlineSpanOf(root) {
  const from = firstInlinePos(root);
  const to = lastInlinePos(root);
  return [from, Math.max(from, to)];
}

function selectionInsideFirstAndLastTextblocks(root) {
  // Convenience for “inside first item to inside last item”
  return inlineSpanOf(root);
}

function createEditor(docNode) {
  const editor = {
    schema,
    converter: { numbering: { definitions: {}, abstracts: {} } },
    emit: () => {},
  };
  const [from, to] = inlineSpanOf(docNode);
  const state = EditorState.create({
    schema,
    doc: docNode,
    selection: TextSelection.create(docNode, from, to),
  });
  return { editor, state };
}

function applyCmd(state, editor, cmd) {
  let newState = state;
  cmd({
    editor,
    state,
    tr: state.tr,
    dispatch: (tr) => {
      newState = state.apply(tr);
    },
  });
  return newState;
}

function getSelectionRange(st) {
  return [st.selection.from, st.selection.to];
}

function hasNestedListInsideParagraph(root) {
  let nested = false;
  root.descendants((node) => {
    if (node.type.name === 'paragraph') {
      node.descendants((child) => {
        if (child.type.name === 'bulletList' || child.type.name === 'orderedList') nested = true;
      });
    }
  });
  return nested;
}

describe('toggleList', () => {
  beforeEach(() => {
    __id = 1;
    Object.keys(calls).forEach((k) => delete calls[k]);
  });

  it('wraps multiple paragraphs into ordered list and preserves selection span', () => {
    const d = doc(p('A'), p('B'), p('C'));
    const { editor, state } = createEditor(d);

    // Select from inside first paragraph to inside last paragraph
    const [from0, to0] = inlineSpanOf(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('orderedList'));

    const first = s2.doc.child(0);
    expect(first.type.name).toBe('orderedList');

    // Selection should still span the whole transformed region (rough heuristic)
    const [from, to] = getSelectionRange(s2);
    expect(from).toBeLessThanOrEqual(firstInlinePos(s2.doc));
    expect(to).toBeGreaterThan(lastInlinePos(s2.doc) - 1);
  });

  it('switches ordered: bullet in place (no nested lists)', () => {
    const d = doc(orderedList(listItem(p('One')), listItem(p('Two')), listItem(p('Three'))));
    const { editor, state } = createEditor(d);
    const [from0, to0] = selectionInsideFirstAndLastTextblocks(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('bulletList'));

    const top = s2.doc.child(0);
    expect(top.type.name).toBe('bulletList');
    expect(hasNestedListInsideParagraph(s2.doc)).toBe(false);
  });

  it('switches bullet: ordered using one shared numId for all items', () => {
    const d = doc(bulletList(listItem(p('a')), listItem(p('b')), listItem(p('c'))));
    const { editor, state } = createEditor(d);

    const [from0, to0] = selectionInsideFirstAndLastTextblocks(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('orderedList'));

    const list = s2.doc.child(0);
    expect(list.type.name).toBe('orderedList');

    const containerNumId = list.attrs.listId;
    const numIds = new Set();
    list.forEach((li) => {
      numIds.add(li.attrs.numId);
    });
    expect(numIds.size).toBe(1);
    expect(Array.from(numIds)[0]).toBe(containerNumId);
  });

  it('does not create a list inside another list when selection starts/ends inside items', () => {
    const base = doc(orderedList(listItem(p('x')), listItem(p('y')), listItem(p('z'))));
    const { editor, state } = createEditor(base);
    const [from0, to0] = selectionInsideFirstAndLastTextblocks(base);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(base, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('bulletList'));

    const top = s2.doc.child(0);
    expect(top.type.name).toBe('bulletList');
    expect(hasNestedListInsideParagraph(s2.doc)).toBe(false);
  });

  it('toggle-off unwraps list to paragraphs and preserves selection over unwrapped span', () => {
    const d = doc(bulletList(listItem(p('alpha')), listItem(p('beta'))));
    const { editor, state } = createEditor(d);
    const [from0, to0] = selectionInsideFirstAndLastTextblocks(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('bulletList')); // same type: unwrap

    expect(s2.doc.child(0).type.name).toBe('paragraph');
    expect(s2.doc.child(1).type.name).toBe('paragraph');

    const [from, to] = getSelectionRange(s2);
    // Spans more than one paragraph's content
    expect(to - from).toBeGreaterThan(s2.doc.child(0).nodeSize - 2);
  });
});
