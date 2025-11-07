// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./changeListLevel.js', () => ({
  updateNumberingProperties: vi.fn(),
}));

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  ListHelpers: {
    getNewListId: vi.fn(),
    generateNewListDefinition: vi.fn(),
  },
}));

import { toggleList } from './toggleList.js';
import { updateNumberingProperties } from './changeListLevel.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

const createParagraph = (attrs, pos) => ({
  node: {
    type: { name: 'paragraph' },
    attrs,
  },
  pos,
});

const createState = (paragraphs, { from = 1, to = 10, beforeNode = null, parentIndex = 0 } = {}) => {
  const parent = {
    child: vi.fn(() => beforeNode),
  };

  return {
    doc: {
      nodesBetween: vi.fn((_from, _to, callback) => {
        for (const { node, pos } of paragraphs) {
          callback(node, pos);
        }
      }),
      resolve: vi.fn(() => ({
        index: () => parentIndex,
        node: () => parent,
      })),
    },
    selection: { from, to },
  };
};

describe('toggleList', () => {
  let editor;
  let tr;
  let dispatch;

  beforeEach(() => {
    vi.clearAllMocks();
    editor = { converter: {} };
    tr = { docChanged: false };
    dispatch = vi.fn();
  });

  it('returns false for unsupported list type', () => {
    const handler = toggleList('fancyList');
    const state = createState([]);

    const result = handler({ editor, state, tr, dispatch });

    expect(result).toBe(false);
    expect(updateNumberingProperties).not.toHaveBeenCalled();
    expect(ListHelpers.getNewListId).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('removes numbering when every paragraph already uses the requested bullet list', () => {
    const sharedNumbering = { numId: 5, ilvl: 2 };
    const paragraphs = [
      createParagraph(
        {
          numberingProperties: sharedNumbering,
          paragraphProperties: { numberingProperties: sharedNumbering },
          listRendering: { numberingType: 'bullet' },
        },
        1,
      ),
      createParagraph(
        {
          numberingProperties: { numId: 5, ilvl: 3 },
          paragraphProperties: { numberingProperties: { numId: 5, ilvl: 3 } },
          listRendering: { numberingType: 'bullet' },
        },
        5,
      ),
    ];
    const state = createState(paragraphs);
    const handler = toggleList('bulletList');

    const result = handler({ editor, state, tr, dispatch });

    expect(result).toBe(true);
    expect(updateNumberingProperties).toHaveBeenCalledTimes(paragraphs.length);
    for (const [index, { node, pos }] of paragraphs.entries()) {
      expect(updateNumberingProperties).toHaveBeenNthCalledWith(index + 1, null, node, pos, editor, tr);
    }
    expect(ListHelpers.getNewListId).not.toHaveBeenCalled();
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(tr);
  });

  it('reuses existing numbering at level zero when selection mixes list and non-list paragraphs', () => {
    const existingNumbering = { numId: 12, ilvl: 4, start: 7 };
    const paragraphs = [
      createParagraph(
        {
          numberingProperties: existingNumbering,
          paragraphProperties: { numberingProperties: existingNumbering },
          listRendering: { numberingType: 'decimal' },
        },
        2,
      ),
      createParagraph(
        {
          paragraphProperties: {},
        },
        6,
      ),
    ];
    const state = createState(paragraphs);
    const handler = toggleList('orderedList');

    const result = handler({ editor, state, tr, dispatch: undefined });

    expect(result).toBe(true);
    expect(updateNumberingProperties).toHaveBeenCalledTimes(paragraphs.length);
    const expectedNumbering = { numId: 12, ilvl: 0, start: 7 };
    for (const [index, { node, pos }] of paragraphs.entries()) {
      expect(updateNumberingProperties).toHaveBeenNthCalledWith(index + 1, expectedNumbering, node, pos, editor, tr);
    }
  });

  it('creates a new list definition when no matching list exists in or before the selection', () => {
    ListHelpers.getNewListId.mockReturnValue('42');
    const paragraphs = [
      createParagraph({ paragraphProperties: {} }, 3),
      createParagraph({ paragraphProperties: {} }, 9),
    ];
    const state = createState(paragraphs);
    const handler = toggleList('orderedList');

    const result = handler({ editor, state, tr, dispatch: undefined });

    expect(result).toBe(true);
    expect(ListHelpers.getNewListId).toHaveBeenCalledWith(editor);
    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledWith({
      numId: 42,
      listType: 'orderedList',
      editor,
    });
    const expectedNumbering = { numId: 42, ilvl: 0 };
    for (const [index, { node, pos }] of paragraphs.entries()) {
      expect(updateNumberingProperties).toHaveBeenNthCalledWith(index + 1, expectedNumbering, node, pos, editor, tr);
    }
  });

  it('borrows numbering from the previous list paragraph when selection lacks one', () => {
    const beforeNumbering = { numId: 88, ilvl: 3, restart: true };
    const beforeNode = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: beforeNumbering,
        paragraphProperties: { numberingProperties: beforeNumbering },
        listRendering: { numberingType: 'decimal' },
      },
    };
    const paragraphs = [
      createParagraph({ paragraphProperties: {} }, 4),
      createParagraph({ paragraphProperties: {} }, 8),
    ];
    const state = createState(paragraphs, { beforeNode, parentIndex: 1 });
    const handler = toggleList('orderedList');

    const result = handler({ editor, state, tr, dispatch: undefined });

    expect(result).toBe(true);
    expect(ListHelpers.getNewListId).not.toHaveBeenCalled();
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();
    const expectedNumbering = { numId: 88, ilvl: 0, restart: true };
    for (const [index, { node, pos }] of paragraphs.entries()) {
      expect(updateNumberingProperties).toHaveBeenNthCalledWith(index + 1, expectedNumbering, node, pos, editor, tr);
    }
  });
});
