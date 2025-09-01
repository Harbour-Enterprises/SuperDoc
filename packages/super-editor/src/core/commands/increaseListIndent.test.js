// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { increaseListIndent } from './increaseListIndent.js';
import { ListHelpers } from '../helpers/list-numbering-helpers.js';

vi.mock('../helpers/list-numbering-helpers.js', () => {
  return {
    ListHelpers: {
      getCurrentListItem: undefined,
      getParentOrderedList: undefined,
      getParentBulletList: undefined,
      getNewListId: vi.fn(() => 999),
      generateNewListDefinition: vi.fn(),
    },
  };
});

/** @returns {Schema} */
function makeSchema() {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      text: {},
      paragraph: {
        group: 'block',
        content: 'text*',
        renderDOM: () => ['p', 0],
        parseDOM: [{ tag: 'p' }],
      },
      orderedList: {
        group: 'block',
        content: 'listItem+',
        attrs: {
          listId: { default: null }, // parent list may or may not have an ID
        },
        renderDOM: (node) => ['ol', { 'data-list-id': node.attrs.listId ?? '' }, 0],
      },
      bulletList: {
        group: 'block',
        content: 'listItem+',
        attrs: {
          listId: { default: null },
        },
        renderDOM: (node) => ['ul', { 'data-list-id': node.attrs.listId ?? '' }, 0],
      },
      listItem: {
        content: 'paragraph block*',
        attrs: {
          level: { default: 0 },
          // critical: allow "missing" numId by defaulting to null (so we can test minting/inheritance)
          numId: { default: null },
        },
        renderDOM: (node) => ['li', { 'data-level': node.attrs.level, 'data-num-id': node.attrs.numId ?? '' }, 0],
      },
    },
    marks: {},
  });
}

/**
 * Build a simple doc with a single list (ordered or bullet) and one listItem("one")
 * The selection is set inside that list item's text.
 * @param {'orderedList'|'bulletList'} listType
 * @param {{ level?: number, numId?: number|null }} itemAttrs
 * @param {{ listId?: number|null }} listAttrs
 */
function buildEditor(listType, itemAttrs = {}, listAttrs = {}) {
  const schema = makeSchema();

  const listItem = schema.node('listItem', { level: itemAttrs.level ?? 0, numId: itemAttrs.numId ?? null }, [
    schema.node('paragraph', null, [schema.text('one')]),
  ]);

  const list = schema.node(listType, { listId: listAttrs.listId ?? null }, [listItem]);
  const doc = schema.node('doc', null, [list]);

  // Find a pos inside the "one" text
  let textPos = 1;
  doc.descendants((node, pos) => {
    if (node.isText && node.text === 'one') {
      textPos = pos; // start of "one"
      return false;
    }
    return true;
  });

  const selection = TextSelection.create(doc, textPos + 1); // inside the text
  const state = EditorState.create({ schema, doc, selection });

  // utility: find first listItem pos in current doc
  const getListItemPos = (d = state.doc) => {
    let target = null;
    d.descendants((node, pos) => {
      if (node.type === schema.nodes.listItem && target == null) {
        target = { node, pos };
        return false;
      }
      return true;
    });
    if (!target) throw new Error('listItem not found');
    return target;
  };

  // utility: find the parent list node (ordered/bullet)
  const getParentList = (d = state.doc) => {
    let target = null;
    d.descendants((node, pos) => {
      if ((node.type === schema.nodes.orderedList || node.type === schema.nodes.bulletList) && target == null) {
        target = { node, pos };
        return false;
      }
      return true;
    });
    if (!target) throw new Error('parent list not found');
    return target;
  };

  const editor = { state, schema };
  const tr = state.tr;

  return { editor, tr, schema, getListItemPos, getParentList };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset helper overrides between tests
  ListHelpers.getCurrentListItem = undefined;
  ListHelpers.getParentOrderedList = undefined;
  ListHelpers.getParentBulletList = undefined;
});

describe('increaseListIndent', () => {
  it('returns false when selection is not inside a list', () => {
    const schema = makeSchema();
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')])]);
    const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 2) });
    const editor = { state, schema };
    const tr = state.tr;

    const cmd = increaseListIndent();
    const res = cmd({ editor, tr });

    expect(res).toBe(false);
    expect(tr.steps.length).toBe(0);
  });

  it('increases level by 1 and preserves existing numId for ordered lists', () => {
    const { editor, tr, schema, getListItemPos } = buildEditor('orderedList', { level: 0, numId: 555 }, { listId: 10 });

    const before = getListItemPos().node.attrs;
    expect(before.level).toBe(0);
    expect(before.numId).toBe(555);

    const cmd = increaseListIndent();
    const res = cmd({ editor, tr });

    expect(res).toBe(true);
    // apply and re-read
    const nextDoc = tr.doc;
    const nextItem = (() => {
      let found = null;
      nextDoc.descendants((node, pos) => {
        if (node.type === schema.nodes.listItem && found == null) {
          found = { node, pos };
          return false;
        }
        return true;
      });
      return found;
    })();

    expect(nextItem.node.attrs.level).toBe(1); // incremented
    expect(nextItem.node.attrs.numId).toBe(555); // preserved
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
  });

  it('inherits numId from parent ordered list when missing, and registers a definition', () => {
    const { editor, tr, schema } = buildEditor('orderedList', { level: 0, numId: null }, { listId: 123 });

    const cmd = increaseListIndent();
    const res = cmd({ editor, tr });
    expect(res).toBe(true);

    // Read back updated listItem
    let updated = null;
    tr.doc.descendants((node, pos) => {
      if (node.type === schema.nodes.listItem && updated == null) {
        updated = node;
        return false;
      }
      return true;
    });

    expect(updated).toBeTruthy();
    expect(updated.attrs.level).toBe(1);
    expect(updated.attrs.numId).toBe(123); // inherited

    // generateNewListDefinition is a safe no-op if already exists, but should still be invoked
    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledTimes(1);
    const [args] = ListHelpers.generateNewListDefinition.mock.calls[0];
    expect(args.numId).toBe(123);
    expect(args.listType.name).toBe('orderedList');
    expect(args.editor).toBe(editor);
  });

  it('mints a new numId when parent bullet list has no listId, and registers a bullet definition', () => {
    // Force a specific new id for this test
    ListHelpers.getNewListId.mockReturnValueOnce(777);

    const { editor, tr, schema } = buildEditor('bulletList', { level: 2, numId: null }, { listId: null });

    const cmd = increaseListIndent();
    const res = cmd({ editor, tr });
    expect(res).toBe(true);

    // Read back
    let updated = null;
    tr.doc.descendants((node) => {
      if (node.type === schema.nodes.listItem && updated == null) {
        updated = node;
        return false;
      }
      return true;
    });

    expect(updated).toBeTruthy();
    expect(updated.attrs.level).toBe(3); // 2 -> 3
    expect(updated.attrs.numId).toBe(777); // minted via helper

    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledTimes(1);
    const [args] = ListHelpers.generateNewListDefinition.mock.calls[0];
    expect(args.numId).toBe(777);
    expect(args.listType.name).toBe('bulletList');
    expect(args.editor).toBe(editor);
  });

  it('works when helper shortcuts are provided (getCurrentListItem / getParentOrderedList)', () => {
    const { editor, tr, schema } = buildEditor('orderedList', { level: 5, numId: 42 }, { listId: 999 });

    // Provide helper shortcuts so the command takes the "helper" path instead of the generic findParentNode
    ListHelpers.getCurrentListItem = (state) => {
      let hit = null;
      state.doc.descendants((node, pos) => {
        if (node.type === schema.nodes.listItem && hit == null) {
          hit = { node, pos };
          return false;
        }
        return true;
      });
      return hit;
    };

    ListHelpers.getParentOrderedList = (state) => {
      let hit = null;
      state.doc.descendants((node, pos) => {
        if (node.type === schema.nodes.orderedList && hit == null) {
          hit = { node, pos };
          return false;
        }
        return true;
      });
      return hit;
    };

    const cmd = increaseListIndent();
    const res = cmd({ editor, tr });
    expect(res).toBe(true);

    let updated = null;
    tr.doc.descendants((node) => {
      if (node.type === schema.nodes.listItem && updated == null) {
        updated = node;
        return false;
      }
      return true;
    });

    expect(updated.attrs.level).toBe(6); // 5 -> 6
    expect(updated.attrs.numId).toBe(42); // preserved
  });
});
