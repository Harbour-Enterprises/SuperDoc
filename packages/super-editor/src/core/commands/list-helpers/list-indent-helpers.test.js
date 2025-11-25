// @ts-check
import { describe, it, expect, vi } from 'vitest';
import { parseLevel, resolveParentList, collectTargetListItemPositions } from './list-indent-helpers.js';

describe('parseLevel', () => {
  it('returns numeric values unchanged', () => {
    expect(parseLevel(2)).toBe(2);
    expect(parseLevel(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(parseLevel('3')).toBe(3);
    expect(parseLevel('08')).toBe(8);
  });

  it('falls back to 0 for invalid values', () => {
    expect(parseLevel(undefined)).toBe(0);
    expect(parseLevel('not-a-number')).toBe(0);
  });
});

describe('resolveParentList', () => {
  const makePos = (nodes) => {
    return {
      depth: nodes.length - 1,
      node: vi.fn((depth) => nodes[depth]),
    };
  };

  it('walks up the depth chain until it finds a list container', () => {
    const bulletList = { type: { name: 'bulletList' }, attrs: { listId: 42 } };
    const listItem = { type: { name: 'listItem' } };
    const paragraph = { type: { name: 'paragraph' } };

    const $pos = makePos([paragraph, listItem, bulletList]);
    const result = resolveParentList($pos);
    expect(result).toBe(bulletList);
    expect($pos.node).toHaveBeenCalledTimes(1);
  });

  it('returns null when no list container is present', () => {
    const paragraph = { type: { name: 'paragraph' } };
    const heading = { type: { name: 'heading' } };
    const $pos = makePos([paragraph, heading]);

    expect(resolveParentList($pos)).toBeNull();
  });

  it('returns null when $pos is missing', () => {
    expect(resolveParentList(null)).toBeNull();
    expect(resolveParentList(undefined)).toBeNull();
  });
});

describe('collectTargetListItemPositions', () => {
  const listItemType = { name: 'listItem' };
  const paragraphType = { name: 'paragraph' };

  const makeState = ({ nodes, selection }) => {
    return {
      doc: {
        nodesBetween(from, to, callback) {
          nodes.forEach(({ node, pos }) => {
            if (pos < from || pos > to) return;
            callback(node, pos);
          });
        },
      },
      schema: {
        nodes: {
          listItem: listItemType,
        },
      },
      selection,
    };
  };

  it('collects and sorts positions for listItem nodes within the selection range', () => {
    const state = makeState({
      selection: { from: 5, to: 12 },
      nodes: [
        { node: { type: paragraphType }, pos: 4 },
        { node: { type: listItemType, nodeSize: 4 }, pos: 6 },
        { node: { type: listItemType, nodeSize: 5 }, pos: 10 },
        { node: { type: paragraphType }, pos: 15 },
      ],
    });

    const positions = collectTargetListItemPositions(state);
    expect(positions).toEqual([6, 10]);
  });

  it('deduplicates positions and ignores non list items', () => {
    const state = makeState({
      selection: { from: 0, to: 20 },
      nodes: [
        { node: { type: listItemType, nodeSize: 3 }, pos: 2 },
        { node: { type: listItemType, nodeSize: 3 }, pos: 2 }, // duplicate
        { node: { type: paragraphType }, pos: 8 },
        { node: { type: listItemType, nodeSize: 4 }, pos: 12 },
      ],
    });

    expect(collectTargetListItemPositions(state)).toEqual([2, 12]);
  });

  it('falls back to provided position when document or schema data is missing', () => {
    expect(collectTargetListItemPositions(null, 42)).toEqual([42]);
    expect(collectTargetListItemPositions({}, 99)).toEqual([99]);
  });

  it('includes fallback when no list items are found in the selection', () => {
    const state = makeState({
      selection: { from: 1, to: 5 },
      nodes: [{ node: { type: paragraphType }, pos: 2 }],
    });

    expect(collectTargetListItemPositions(state, 17)).toEqual([17]);
  });

  it('returns only the deepest list items within a nested selection', () => {
    const state = makeState({
      selection: { from: 1, to: 20 },
      nodes: [
        { node: { type: listItemType, nodeSize: 15 }, pos: 2 },
        { node: { type: paragraphType }, pos: 4 },
        { node: { type: listItemType, nodeSize: 6 }, pos: 6 },
        { node: { type: listItemType, nodeSize: 4 }, pos: 9 },
      ],
    });

    expect(collectTargetListItemPositions(state)).toEqual([9]);
  });
});
