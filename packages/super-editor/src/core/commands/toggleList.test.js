import { schema as basic } from 'prosemirror-schema-basic';
import { Schema } from 'prosemirror-model';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state';
import { builders } from 'prosemirror-test-builder';
import { toggleList } from './toggleList';
import {
  nearestListAt,
  collectIntersectingTopLists,
  rebuildListNodeWithNewNum,
  setMappedSelectionSpan,
} from './toggleList';
import {
  listItemSpec,
  orderedListSpec,
  bulletListSpec,
  tableSpec,
  tableRowSpec,
  tableCellSpec,
} from './list-helpers/test-helpers.js';
import {
  createEditor,
  firstInlinePos,
  inlineSpanOf,
  applyCmd,
  getSelectionRange,
  lastInlinePos,
  selectionInsideFirstAndLastTextblocks,
  hasNestedListInsideParagraph,
} from './list-helpers/test-helpers.js';

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

export const nodes = basic.spec.nodes
  .update('paragraph', basic.spec.nodes.get('paragraph'))
  .addToEnd('listItem', listItemSpec)
  .addToEnd('orderedList', orderedListSpec)
  .addToEnd('bulletList', bulletListSpec)
  .addToEnd('table', tableSpec)
  .addToEnd('tableRow', tableRowSpec)
  .addToEnd('tableCell', tableCellSpec);

export const schema = new Schema({ nodes, marks: basic.spec.marks });

const {
  doc,
  p,
  bulletList,
  orderedList,
  li: listItem,
  table,
  tr,
  td,
} = builders(schema, {
  doc: { nodeType: 'doc' },
  p: { nodeType: 'paragraph' },
  bulletList: { nodeType: 'bulletList' },
  orderedList: { nodeType: 'orderedList' },
  li: { nodeType: 'listItem' },
  table: { nodeType: 'table' },
  tr: { nodeType: 'tableRow' },
  td: { nodeType: 'tableCell' },
});

describe('toggleList', () => {
  beforeEach(() => {
    __id = 1;
    Object.keys(calls).forEach((k) => delete calls[k]);
  });

  it('wraps multiple paragraphs into ordered list and preserves selection span', () => {
    const d = doc(p('A'), p('B'), p('C'));
    const { editor, state } = createEditor(d, schema);

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
    const { editor, state } = createEditor(d, schema);
    const [from0, to0] = selectionInsideFirstAndLastTextblocks(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('bulletList'));

    const top = s2.doc.child(0);
    expect(top.type.name).toBe('bulletList');
    expect(hasNestedListInsideParagraph(s2.doc)).toBe(false);
  });

  it('switches bullet: ordered using one shared numId for all items', () => {
    const d = doc(bulletList(listItem(p('a')), listItem(p('b')), listItem(p('c'))));
    const { editor, state } = createEditor(d, schema);

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
    const { editor, state } = createEditor(base, schema);
    const [from0, to0] = selectionInsideFirstAndLastTextblocks(base);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(base, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('bulletList'));

    const top = s2.doc.child(0);
    expect(top.type.name).toBe('bulletList');
    expect(hasNestedListInsideParagraph(s2.doc)).toBe(false);
  });

  it('toggle-off unwraps list to paragraphs and preserves selection over unwrapped span', () => {
    const d = doc(bulletList(listItem(p('alpha')), listItem(p('beta'))));
    const { editor, state } = createEditor(d, schema);
    const [from0, to0] = selectionInsideFirstAndLastTextblocks(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('bulletList')); // same type: unwrap

    expect(s2.doc.child(0).type.name).toBe('paragraph');
    expect(s2.doc.child(1).type.name).toBe('paragraph');

    const [from, to] = getSelectionRange(s2);
    // Spans more than one paragraph's content
    expect(to - from).toBeGreaterThan(s2.doc.child(0).nodeSize - 2);
  });

  it('wraps multiple paragraphs into multiple BULLET list containers (one item each, shared numId)', () => {
    const d = doc(p('A'), p('B'), p('C'));
    const { editor, state } = createEditor(d, schema);

    const [from0, to0] = inlineSpanOf(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('bulletList'));

    // Old (broken) behavior would create a single <ul> with 3 <li>.
    // Correct behavior: 3 <ul> containers, each with 1 <li>, sharing the same numId/listId.
    expect(s2.doc.childCount).toBe(3);

    const listIds = new Set();
    const numIds = new Set();

    for (let i = 0; i < s2.doc.childCount; i++) {
      const node = s2.doc.child(i);
      expect(node.type.name).toBe('bulletList');
      expect(node.childCount).toBe(1);

      const li = node.child(0);
      expect(li.type.name).toBe('listItem');

      // Track ids to ensure they all match
      listIds.add(node.attrs.listId);
      numIds.add(li.attrs.numId);

      // container listId should match the item's numId
      expect(li.attrs.numId).toBe(node.attrs.listId);
      // bullet list should advertise bullet style
      expect(node.attrs['list-style-type']).toBe('bullet');
      expect(li.attrs.listNumberingType).toBe('bullet');
      expect(li.attrs.lvlText).toBe('•');
    }

    expect(listIds.size).toBe(1);
    expect(numIds.size).toBe(1);
  });

  it('wraps multiple paragraphs into multiple ORDERED list containers (one item each, shared numId)', () => {
    const d = doc(p('One'), p('Two'));
    const { editor, state } = createEditor(d, schema);

    const [from0, to0] = inlineSpanOf(d);
    const s1 = state.apply(state.tr.setSelection(TextSelection.create(d, from0, to0)));

    const s2 = applyCmd(s1, editor, toggleList('orderedList'));

    // Old (broken) behavior would create a single <ol> with 2 <li>.
    // Correct behavior: 2 <ol> containers, each with 1 <li>, sharing the same numId/listId.
    expect(s2.doc.childCount).toBe(2);

    const listIds = new Set();
    const numIds = new Set();

    for (let i = 0; i < s2.doc.childCount; i++) {
      const node = s2.doc.child(i);
      expect(node.type.name).toBe('orderedList');
      expect(node.childCount).toBe(1);

      const li = node.child(0);
      expect(li.type.name).toBe('listItem');

      // Track ids to ensure they all match
      listIds.add(node.attrs.listId);
      numIds.add(li.attrs.numId);

      // container listId should match the item's numId
      expect(li.attrs.numId).toBe(node.attrs.listId);

      // ordered lists should have decimal style and start at order 1
      expect(node.attrs['list-style-type']).toBe('decimal');
      expect(node.attrs.order).toBe(1);
      expect(li.attrs.listNumberingType).toBe('decimal');
      expect(li.attrs.lvlText).toBe('%1.');
    }

    expect(listIds.size).toBe(1);
    expect(numIds.size).toBe(1);
  });

  it('wraps a single paragraph when the paragraph itself is NodeSelection (BULLET)', () => {
    const d = doc(p('Single line'));
    // Find the paragraph's position (start of the node, not inside text)
    let paraPos = null;
    d.descendants((node, pos) => {
      if (paraPos == null && node.type.name === 'paragraph') {
        paraPos = pos;
        return false;
      }
      return true;
    });
    if (paraPos == null) throw new Error('Paragraph not found');

    // Create a NodeSelection on the paragraph node itself
    const state0 = EditorState.create({
      schema,
      doc: d,
      selection: NodeSelection.create(d, paraPos),
    });

    const { editor } = createEditor(d, schema);
    const s2 = applyCmd(state0, editor, toggleList('bulletList'));

    expect(s2.doc.childCount).toBe(1);
    const top = s2.doc.child(0);
    expect(top.type.name).toBe('bulletList');
    expect(top.childCount).toBe(1);
    expect(top.child(0).type.name).toBe('listItem');
  });

  it('wraps a single paragraph when NodeSelection (ORDERED)', () => {
    const d = doc(p('Only line'));
    let paraPos = null;
    d.descendants((node, pos) => {
      if (paraPos == null && node.type.name === 'paragraph') {
        paraPos = pos;
        return false;
      }
      return true;
    });

    if (paraPos == null) throw new Error('Paragraph not found');

    const state0 = EditorState.create({
      schema,
      doc: d,
      selection: NodeSelection.create(d, paraPos),
    });

    const { editor } = createEditor(d, schema);
    const s2 = applyCmd(state0, editor, toggleList('orderedList'));

    // EXPECTED (but currently failing): paragraph becomes an orderedList with one listItem
    expect(s2.doc.childCount).toBe(1);
    const top = s2.doc.child(0);
    expect(top.type.name).toBe('orderedList');
    expect(top.childCount).toBe(1);
    expect(top.child(0).type.name).toBe('listItem');
  });

  it('switches ORDERED to BULLET when the entire list container is NodeSelection', () => {
    const d = doc(orderedList(listItem(p('One')), listItem(p('Two')), listItem(p('Three'))));

    // Find the top-level orderedList node position
    let listPos = null;
    d.descendants((node, pos, parent) => {
      if (listPos == null && node.type.name === 'orderedList' && parent.type.name === 'doc') {
        listPos = pos;
        return false;
      }
      return true;
    });
    if (listPos == null) throw new Error('orderedList not found');

    // NodeSelection on the list container itself
    const state0 = EditorState.create({
      schema,
      doc: d,
      selection: NodeSelection.create(d, listPos),
    });

    const { editor } = createEditor(d, schema);
    const s2 = applyCmd(state0, editor, toggleList('bulletList'));

    const top = s2.doc.child(0);
    expect(top.type.name).toBe('bulletList');
    expect(top.childCount).toBe(3);
    expect(hasNestedListInsideParagraph(s2.doc)).toBe(false);
  });

  it('switches BULLET to ORDERED when the entire list container is NodeSelection', () => {
    const d = doc(bulletList(listItem(p('a')), listItem(p('b')), listItem(p('c')), listItem(p('d'))));

    let listPos = null;
    d.descendants((node, pos, parent) => {
      if (listPos == null && node.type.name === 'bulletList' && parent.type.name === 'doc') {
        listPos = pos;
        return false;
      }
      return true;
    });
    if (listPos == null) throw new Error('bulletList not found');

    // NodeSelection on the list container itself
    const state0 = EditorState.create({
      schema,
      doc: d,
      selection: NodeSelection.create(d, listPos),
    });

    const { editor } = createEditor(d, schema);
    const s2 = applyCmd(state0, editor, toggleList('orderedList'));

    const top = s2.doc.child(0);
    expect(top.type.name).toBe('orderedList');
    expect(top.childCount).toBe(4);
    expect(top.attrs['list-style-type']).toBe('decimal');
    expect(hasNestedListInsideParagraph(s2.doc)).toBe(false);
  });

  it('keeps caret inside the same table cell after toggling a list', () => {
    const d = doc(table(tr(td(p('A')), td(p('B')))));

    // caret inside the "A" paragraph
    let aPos = null;
    d.descendants((node, pos) => {
      if (aPos == null && node.type.name === 'paragraph' && node.textContent === 'A') {
        aPos = pos + 1;
        return false;
      }
      return true;
    });
    if (aPos == null) throw new Error('could not locate paragraph A');

    const { editor } = createEditor(d, schema);
    const state0 = EditorState.create({
      schema,
      doc: d,
      selection: TextSelection.create(d, aPos, aPos),
    });

    const s2 = applyCmd(state0, editor, toggleList('bulletList'));

    // First cell should now contain a bulletList
    const firstCellPos = (() => {
      let pos = null,
        nodeRef = null;
      s2.doc.descendants((node, p) => {
        if (pos == null && node.type.name === 'tableCell') {
          pos = p;
          nodeRef = node;
          return false;
        }
        return true;
      });
      if (pos == null) throw new Error('no first tableCell after toggle');
      return { pos, node: nodeRef };
    })();

    const cellNode = firstCellPos.node;
    const cellStart = firstCellPos.pos;
    const cellEnd = cellStart + cellNode.nodeSize;

    // selection must be inside the FIRST cell, not the second
    expect(s2.selection.from).toBeGreaterThan(cellStart);
    expect(s2.selection.from).toBeLessThan(cellEnd);

    // and it should be inside a paragraph under a listItem
    const $from = s2.selection.$from;
    let sawListItem = false,
      sawList = false;
    for (let d = $from.depth; d >= 0; d--) {
      const n = $from.node(d);
      if (n.type.name === 'listItem') sawListItem = true;
      if (n.type.name === 'bulletList' || n.type.name === 'orderedList') sawList = true;
    }
    expect(sawListItem && sawList).toBe(true);
    expect($from.parent.type.name).toBe('paragraph');
  });
});

describe('nearestListAt', () => {
  it('finds the nearest ordered list ancestor with correct pos', () => {
    const d = doc(p('before'), orderedList(listItem(p('one')), listItem(p('two'))), p('after'));

    const pos = firstInlinePos(d); // inside "before"
    // move to inside "one"
    let foundPos = null;
    d.descendants((node, p) => {
      if (node.type.name === 'paragraph' && node.textContent.includes('one') && foundPos == null) {
        foundPos = p + 1;
        return false;
      }
      return true;
    });

    const { state } = createEditor(d, schema);
    const $pos = state.doc.resolve(foundPos);

    const res = nearestListAt($pos, schema.nodes.orderedList, schema.nodes.bulletList);
    expect(res).not.toBeNull();
    expect(res.node.type.name).toBe('orderedList');

    const listAtPos = state.doc.nodeAt(res.pos);
    expect(listAtPos).toBe(res.node);
  });

  it('returns null when outside any list', () => {
    const d = doc(p('hello'), p('world'));
    const { state } = createEditor(d, schema);
    const $pos = state.doc.resolve(firstInlinePos(d));
    const res = nearestListAt($pos, schema.nodes.orderedList, schema.nodes.bulletList);
    expect(res).toBeNull();
  });

  it('prefers the inner list when nested (ol inside ul)', () => {
    const d = doc(bulletList(listItem(orderedList(listItem(p('deep'))))));
    // inside "deep"
    let inside = null;
    d.descendants((node, p) => {
      if (node.type.name === 'paragraph' && node.textContent.includes('deep') && inside == null) {
        inside = p + 1;
        return false;
      }
      return true;
    });
    const { state } = createEditor(d, schema);
    const $pos = state.doc.resolve(inside);
    const res = nearestListAt($pos, schema.nodes.orderedList, schema.nodes.bulletList);
    expect(res).not.toBeNull();
    expect(res.node.type.name).toBe('orderedList'); // inner list
  });
});

describe('collectIntersectingTopLists', () => {
  function posInsideText(docNode, needle) {
    let found = null;
    docNode.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.textContent.includes(needle) && found == null) {
        found = pos + 1; // first inline pos inside that paragraph
        return false; // stop at the first match
      }
      return true;
    });
    if (found == null) throw new Error(`Could not find paragraph containing "${needle}"`);
    return found;
  }

  it('collects deduped top-level lists intersecting the selection (sorted desc by pos)', () => {
    const d = doc(
      p('pre'),
      orderedList(listItem(p('A1')), listItem(p('A2'))),
      p('mid'),
      bulletList(listItem(p('B1')), listItem(p('B2'))),
      p('post'),
    );

    // from just inside A2: just inside B1
    const from = posInsideText(d, 'A2');
    const to = posInsideText(d, 'B1') + 1; // ensure the range reaches into list 2

    const state = EditorState.create({
      schema,
      doc: d,
      selection: TextSelection.create(d, from, to),
    });

    const result = collectIntersectingTopLists({
      doc: d,
      selection: state.selection,
      OrderedType: schema.nodes.orderedList,
      BulletType: schema.nodes.bulletList,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.node.type.name)).toEqual(['bulletList', 'orderedList']);
    result.forEach((r) => {
      const $pos = d.resolve(r.pos);
      expect($pos.depth).toBe(0);
      expect($pos.nodeAfter).toBe(r.node);
    });
  });

  it('returns only the single list when selection is within one', () => {
    const list = orderedList(listItem(p('X')), listItem(p('Y')));
    const d = doc(p('before'), list, p('after'));

    const from = posInsideText(d, 'X');
    const to = posInsideText(d, 'Y') + 1;

    const state = EditorState.create({
      schema,
      doc: d,
      selection: TextSelection.create(d, from, to),
    });

    const result = collectIntersectingTopLists({
      doc: d,
      selection: state.selection,
      OrderedType: schema.nodes.orderedList,
      BulletType: schema.nodes.bulletList,
    });

    expect(result.length).toBe(1);
    expect(result[0].node).toBe(list);
  });
});

describe('rebuildListNodeWithNewNum', () => {
  beforeEach(() => {
    __id = 1;
    Object.keys(calls).forEach((k) => delete calls[k]);
  });

  it('builds a new ordered list with a fresh listId and remapped items', () => {
    const oldList = schema.node('orderedList', { listId: 'OLD' }, [
      schema.node('listItem', { level: 0 }, [p('a')]),
      schema.node('listItem', { level: 1 }, [p('b')]),
    ]);

    const { editor } = createEditor(doc(oldList), schema);
    const newList = rebuildListNodeWithNewNum({
      oldList,
      toType: schema.nodes.orderedList,
      editor,
      schema,
      fixedNumId: null,
    });

    expect(newList.type.name).toBe('orderedList');
    expect(newList.attrs.listId).toBe(1); // first id from mocked getNewListId()
    expect(newList.childCount).toBe(2);

    expect(calls.generateNewListDefinition).toBeTruthy();
    expect(calls.generateNewListDefinition[0].numId).toBe(1);
    expect(calls.generateNewListDefinition[0].listType).toBe('orderedList');
  });

  it('respects fixedNumId and does not allocate a new one', () => {
    const oldList = schema.node('bulletList', { listId: 'ANY' }, [
      schema.node('listItem', {}, [p('x')]),
      schema.node('listItem', {}, [p('y')]),
    ]);

    const { editor } = createEditor(doc(oldList), schema);
    const newList = rebuildListNodeWithNewNum({
      oldList,
      toType: schema.nodes.bulletList,
      editor,
      schema,
      fixedNumId: 'FIXED-7',
    });

    expect(newList.type.name).toBe('bulletList');
    expect(newList.attrs.listId).toBe('FIXED-7');
    // with fixedNumId, no new definition should be generated
    expect(calls.generateNewListDefinition).toBeUndefined();
  });
});

describe('setMappedSelectionSpan', () => {
  // Find the first inline position inside the paragraph that contains `needle`
  function posInsideText(docNode, needle) {
    let found = null;
    docNode.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.textContent.includes(needle) && found == null) {
        found = pos + 1; // first inline pos inside that paragraph
        return false;
      }
      return true;
    });
    if (found == null) throw new Error(`Could not find paragraph containing "${needle}"`);
    return found;
  }

  it('remaps selection after an insertion before it', () => {
    const d = doc(p('hello'), p('world'));
    const state = EditorState.create({ schema, doc: d });

    // Select within the SECOND paragraph to avoid boundary behavior at pos 1
    const fromBefore = posInsideText(d, 'world');
    const toBefore = fromBefore + 'world'.length;

    let tr = state.tr.setSelection(TextSelection.create(d, fromBefore, toBefore));

    // Insert at the very start of the doc (clearly before the selected span)
    tr = tr.insert(1, schema.text('X'));

    setMappedSelectionSpan(tr, fromBefore, toBefore);

    expect(tr.selection.from).toBe(fromBefore + 1);
    expect(tr.selection.to).toBe(toBefore + 1);
  });

  it('clamps mapped positions to valid doc bounds', () => {
    const d = doc(p('hi'));
    const state = EditorState.create({ schema, doc: d });

    const fromBefore = 10_000;
    const toBefore = 20_000;

    const tr = state.tr;
    setMappedSelectionSpan(tr, fromBefore, toBefore);

    expect(tr.selection.from).toBeGreaterThanOrEqual(1);
    expect(tr.selection.to).toBeLessThanOrEqual(tr.doc.content.size);
  });
});
