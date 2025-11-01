// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { ListHelpers } from '../helpers/list-numbering-helpers.js';
import { decreaseListIndent } from './decreaseListIndent.js';

vi.mock('../helpers/list-numbering-helpers.js', () => {
  const fns = {
    getCurrentListItem: vi.fn(),
    getParentOrderedList: vi.fn(),
    getParentBulletList: vi.fn(),
    getNewListId: vi.fn(),
    generateNewListDefinition: vi.fn(),
  };
  return { ListHelpers: fns };
});

vi.mock('../helpers/index.js', () => {
  // The command falls back to findParentNode(...) only if the ListHelpers returns null.
  // We'll default to returning null so ListHelpers drive the tests.
  return {
    findParentNode: () => () => null,
  };
});

describe('decreaseListIndent', () => {
  /** @type {{ state: any }} */
  let editor;
  /** @type {{ setNodeMarkup: ReturnType<typeof vi.fn> }} */
  let tr;

  const OrderedListType = { name: 'orderedList' };
  const BulletListType = { name: 'bulletList' };

  beforeEach(() => {
    vi.clearAllMocks();
    editor = { state: { selection: {} } };
    tr = { setNodeMarkup: vi.fn() };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns false when no current list item is found', () => {
    ListHelpers.getCurrentListItem.mockReturnValue(null);
    ListHelpers.getParentOrderedList.mockReturnValue(null);
    ListHelpers.getParentBulletList.mockReturnValue(null);

    const result = decreaseListIndent()({ editor, tr });
    expect(result).toBe(false);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('returns false when no parent list is found', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { level: 2, numId: 123 } },
      pos: 10,
    };
    ListHelpers.getCurrentListItem.mockReturnValue(currentItem);
    ListHelpers.getParentOrderedList.mockReturnValue(null);
    ListHelpers.getParentBulletList.mockReturnValue(null);

    const result = decreaseListIndent()({ editor, tr });
    expect(result).toBe(false);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('no-ops (returns true) at level 0 and does not mutate the doc', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { level: 0 /* no numId */ } },
      pos: 5,
    };
    const parentList = {
      node: { type: OrderedListType, attrs: { listId: 777 } },
    };

    ListHelpers.getCurrentListItem.mockReturnValue(currentItem);
    ListHelpers.getParentOrderedList.mockReturnValue(parentList);
    ListHelpers.getParentBulletList.mockReturnValue(null);

    const result = decreaseListIndent()({ editor, tr });
    expect(result).toBe(true);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
  });

  it('decreases level by 1 and ADOPTS parent listId when parent has one; does NOT re-generate definition', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { level: 2, numId: 123, foo: 'bar' } },
      pos: 42,
    };
    const parentList = {
      node: { type: OrderedListType, attrs: { listId: 777 } },
    };

    ListHelpers.getCurrentListItem.mockReturnValue(currentItem);
    ListHelpers.getParentOrderedList.mockReturnValue(parentList);
    ListHelpers.getParentBulletList.mockReturnValue(null);

    const result = decreaseListIndent()({ editor, tr });

    expect(result).toBe(true);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(1);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(42, null, {
      foo: 'bar',
      level: 1, // 2 -> 1
      numId: 777, // adopts parent's listId, not the stale 123
    });

    // No re-generation for an existing id
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
  });

  it('uses parent list listId when current item has no numId (no re-generation)', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { level: 3 } },
      pos: 7,
    };
    const parentList = {
      node: { type: BulletListType, attrs: { listId: 888 } },
    };

    ListHelpers.getCurrentListItem.mockReturnValue(currentItem);
    ListHelpers.getParentOrderedList.mockReturnValue(null);
    ListHelpers.getParentBulletList.mockReturnValue(parentList);

    const result = decreaseListIndent()({ editor, tr });

    expect(result).toBe(true);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(7, null, {
      level: 2, // 3 -> 2
      numId: 888, // inherited from parent
    });

    // Do not re-generate for an existing id
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
  });

  it('falls back to ListHelpers.getNewListId when neither item nor parent have ids, and generates a definition', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { level: 1 } },
      pos: 11,
    };
    const parentList = {
      node: {
        type: OrderedListType,
        attrs: {
          /* no listId */
        },
      },
    };

    ListHelpers.getCurrentListItem.mockReturnValue(currentItem);
    ListHelpers.getParentOrderedList.mockReturnValue(parentList);
    ListHelpers.getParentBulletList.mockReturnValue(null);
    ListHelpers.getNewListId.mockReturnValue(9999);

    const result = decreaseListIndent()({ editor, tr });

    expect(result).toBe(true);
    expect(ListHelpers.getNewListId).toHaveBeenCalledWith(editor);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(11, null, {
      level: 0, // 1 -> 0
      numId: 9999, // minted
    });

    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledWith({
      numId: 9999,
      listType: OrderedListType,
      editor,
    });
  });

  it('does not generate a list definition if resolved numId is null/undefined', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { level: 2 } },
      pos: 21,
    };
    const parentList = {
      node: { type: OrderedListType, attrs: {} }, // no listId
    };

    ListHelpers.getCurrentListItem.mockReturnValue(currentItem);
    ListHelpers.getParentOrderedList.mockReturnValue(parentList);
    ListHelpers.getParentBulletList.mockReturnValue(null);
    ListHelpers.getNewListId.mockReturnValue(null); // still no id

    const result = decreaseListIndent()({ editor, tr });

    expect(result).toBe(true);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(21, null, {
      level: 1,
      numId: null, // command writes what it resolved
    });
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
  });

  it('bullet list: adopts parent listId and does NOT re-generate definition', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { level: 2 /* no numId */ } },
      pos: 13,
    };
    const parentList = {
      node: { type: BulletListType, attrs: { listId: 888 } },
    };

    ListHelpers.getCurrentListItem.mockReturnValue(currentItem);
    ListHelpers.getParentOrderedList.mockReturnValue(null);
    ListHelpers.getParentBulletList.mockReturnValue(parentList);

    const result = decreaseListIndent()({ editor, tr });

    expect(result).toBe(true);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(1);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(13, null, {
      level: 1, // 2 -> 1
      numId: 888, // bullets carry numId; adopt parent
    });

    // No re-generation for existing id
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
  });

  it('outdents each list item covered by a multi-selection', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: {},
        paragraph: {
          group: 'block',
          content: 'text*',
          parseDOM: [{ tag: 'p' }],
          toDOM: () => ['p', 0],
        },
        orderedList: {
          group: 'block',
          content: 'listItem+',
          attrs: {
            listId: { default: null },
          },
          toDOM: (node) => ['ol', { 'data-list-id': node.attrs.listId ?? '' }, 0],
        },
        bulletList: {
          group: 'block',
          content: 'listItem+',
          attrs: {
            listId: { default: null },
          },
          toDOM: (node) => ['ul', { 'data-list-id': node.attrs.listId ?? '' }, 0],
        },
        listItem: {
          content: 'paragraph block*',
          attrs: {
            level: { default: 0 },
            numId: { default: null },
          },
          toDOM: (node) => ['li', { 'data-level': node.attrs.level, 'data-num-id': node.attrs.numId ?? '' }, 0],
        },
      },
      marks: {},
    });

    const first = schema.node('listItem', { level: 3, numId: 900 }, [
      schema.node('paragraph', null, [schema.text('first')]),
    ]);
    const second = schema.node('listItem', { level: 2, numId: 900 }, [
      schema.node('paragraph', null, [schema.text('second')]),
    ]);
    const list = schema.node('orderedList', { listId: 900 }, [first, second]);
    const doc = schema.node('doc', null, [list]);

    let anchor = 1;
    let head = 1;
    doc.descendants((node, pos) => {
      if (!node.isText) return true;
      if (node.text === 'first') anchor = pos + 1;
      if (node.text === 'second') head = pos + node.nodeSize;
      return true;
    });

    const selection = TextSelection.create(doc, anchor, head);
    const state = EditorState.create({ schema, doc, selection });
    const pmTr = state.tr;
    const richEditor = { state, schema };

    const cmd = decreaseListIndent();
    const result = cmd({ editor: richEditor, tr: pmTr });

    expect(result).toBe(true);
    expect(ListHelpers.getNewListId).not.toHaveBeenCalled();
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();

    const levels = [];
    const numIds = [];
    pmTr.doc.descendants((node) => {
      if (node.type === schema.nodes.listItem) {
        levels.push(node.attrs.level);
        numIds.push(node.attrs.numId);
        return false;
      }
      return true;
    });

    expect(levels).toEqual([2, 1]);
    expect(numIds).toEqual([900, 900]);
  });
});
