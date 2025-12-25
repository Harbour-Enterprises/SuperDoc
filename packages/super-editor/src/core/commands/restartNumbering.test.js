// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restartNumbering } from './restartNumbering.js';
import { findParentNode } from '@helpers/index.js';
import { isList } from '@core/commands/list-helpers';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { updateNumberingProperties } from './changeListLevel.js';

vi.mock(import('@helpers/index.js'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    findParentNode: vi.fn(),
  };
});

vi.mock('@core/commands/list-helpers', () => ({
  isList: vi.fn(),
}));

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  ListHelpers: {
    getNewListId: vi.fn(),
    generateNewListDefinition: vi.fn(),
  },
}));

vi.mock('./changeListLevel.js', () => ({
  updateNumberingProperties: vi.fn(),
}));

vi.mock('@extensions/paragraph/resolvedPropertiesCache.js', () => ({
  getResolvedParagraphProperties: vi.fn((node) => {
    return node?.attrs?.paragraphProperties || { numberingProperties: null };
  }),
}));

describe('restartNumbering', () => {
  /** @type {ReturnType<typeof vi.fn>} */
  let resolveParent;
  /** @type {{ doc: { nodesBetween: (from: number, to: number, cb: Function) => void, content: { size: number } }, selection: any }} */
  let state;
  /** @type {any} */
  let tr;
  /** @type {Record<string, unknown>} */
  let editor;
  /** @type {ReturnType<typeof vi.fn>} */
  let dispatch;
  /** @type {Array<{ node: any, pos: number, shouldStop?: boolean }>} */
  let nodesBetweenSequence;

  const createParagraph = ({ numId, numberingType = 'decimal', addParagraphProps = true, ilvl = 0 }) => ({
    type: { name: 'paragraph' },
    attrs: {
      paragraphProperties: addParagraphProps ? { numberingProperties: { numId, ilvl } } : undefined,
      listRendering: { numberingType },
    },
    nodeSize: 4,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    resolveParent = vi.fn();
    findParentNode.mockReturnValue(resolveParent);

    nodesBetweenSequence = [];
    state = {
      doc: {
        content: { size: 100 },
        nodesBetween: (_start, _end, cb) => {
          for (const entry of nodesBetweenSequence) {
            cb(entry.node, entry.pos);
            if (entry.shouldStop) break;
          }
        },
      },
      selection: {},
    };

    tr = {};
    editor = {};
    dispatch = vi.fn();

    ListHelpers.getNewListId.mockReturnValue('42');
    isList.mockReturnValue(true);
  });

  it('returns false when no list paragraph is found', () => {
    resolveParent.mockReturnValue(null);

    const result = restartNumbering({ editor, tr, state, dispatch });

    expect(result).toBe(false);
    expect(ListHelpers.getNewListId).not.toHaveBeenCalled();
    expect(updateNumberingProperties).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('restarts numbering for the current ordered list chain', () => {
    const firstParagraph = createParagraph({ numId: 7, numberingType: 'decimal' });
    resolveParent.mockReturnValue({ node: firstParagraph, pos: 5 });

    nodesBetweenSequence = [
      {
        node: createParagraph({ numId: 7, numberingType: 'decimal' }),
        pos: 10,
      },
      {
        node: createParagraph({ numId: 7, numberingType: 'decimal' }),
        pos: 15,
      },
      // different numId should stop aggregation
      {
        node: createParagraph({ numId: 99, numberingType: 'decimal', addParagraphProps: true }),
        pos: 20,
        shouldStop: true,
      },
    ];

    const result = restartNumbering({ editor, tr, state, dispatch });

    expect(result).toBe(true);
    expect(ListHelpers.getNewListId).toHaveBeenCalledTimes(1);
    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledWith({
      numId: 42,
      listType: 'orderedList',
      editor,
    });
    expect(updateNumberingProperties).toHaveBeenCalledTimes(3);
    const [firstCall, secondCall, thirdCall] = updateNumberingProperties.mock.calls;
    expect(firstCall[0]).toEqual({ numId: 42, ilvl: 0 });
    expect(firstCall[1]).toBe(firstParagraph);
    expect(firstCall[2]).toBe(5);
    expect(firstCall[3]).toBe(editor);
    expect(firstCall[4]).toBe(tr);

    expect(secondCall[0]).toEqual({ numId: 42, ilvl: 0 });
    expect(secondCall[2]).toBe(10);
    expect(thirdCall[0]).toEqual({ numId: 42, ilvl: 0 });
    expect(thirdCall[2]).toBe(15);
    expect(dispatch).toHaveBeenCalledWith(tr);
  });

  it('applies bullet list type and stops when encountering a non-list node', () => {
    const firstParagraph = createParagraph({ numId: 3, numberingType: 'bullet' });
    resolveParent.mockReturnValue({ node: firstParagraph, pos: 2 });

    const matchingParagraph = createParagraph({ numId: 3, numberingType: 'bullet' });
    const nonListParagraph = {
      type: { name: 'paragraph' },
      attrs: { paragraphProperties: { numberingProperties: { numId: 3 } } },
    };
    nodesBetweenSequence = [
      { node: matchingParagraph, pos: 6 },
      // simulate a non-list paragraph followed by another matching entry that should be ignored
      { node: nonListParagraph, pos: 12, shouldStop: true },
      { node: createParagraph({ numId: 3, numberingType: 'bullet' }), pos: 18 },
    ];

    isList.mockImplementation((node) => {
      if (node === matchingParagraph || node === firstParagraph) return true;
      if (node === nonListParagraph) return false;
      return true;
    });

    const result = restartNumbering({ editor, tr, state, dispatch });

    expect(result).toBe(true);
    expect(ListHelpers.generateNewListDefinition).toHaveBeenCalledWith({
      numId: 42,
      listType: 'bulletList',
      editor,
    });
    expect(updateNumberingProperties).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(tr);
    expect(isList).toHaveBeenCalledWith(nonListParagraph);
  });
});
