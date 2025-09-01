// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListHelpers } from '../helpers/list-numbering-helpers.js';
import { decreaseListIndent } from './decreaseListIndent.js';

// Mock the helper modules used by the command
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

  it('decreases level by 1 and keeps existing numId; ensures list definition', () => {
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
      numId: 123, // keeps existing
    });

    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledTimes(1);
    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledWith({
      numId: 123,
      listType: OrderedListType,
      editor,
    });
  });

  it('uses parent list listId when current item has no numId', () => {
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

    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledWith({
      numId: 888,
      listType: BulletListType,
      editor,
    });
  });

  it('falls back to ListHelpers.getNewListId when neither item nor parent have ids', () => {
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
      numId: 9999, // fallback
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
      numId: null, // explicit null is fine; command should still set it
    });
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
  });
});
