import { describe, it, expect } from 'vitest';
import { findBreakPosInTable } from './find-break-pos-in-table.js';
import { createMockView } from './test-utils.js';

function makeTable(children) {
  const totalSize = children.reduce((sum, child) => sum + (child.nodeSize ?? 0), 0);
  return {
    childCount: children.length,
    children,
    child(i) {
      return this.children[i];
    },
    type: { name: 'table' },
    nodeSize: totalSize + 2,
  };
}

describe('findBreakPosInTable', () => {
  const baseState = {
    doc: {
      content: { size: 60 },
    },
  };

  it('returns null for non-table nodes or when rows fit', () => {
    const view = createMockView({ state: baseState });
    expect(findBreakPosInTable(view, 0, { childCount: 0 }, 50)).toBeNull();

    const calmRow = {
      type: { name: 'tableRow' },
      childCount: 1,
      child() {
        return { nodeSize: 2, type: { name: 'tableCell' } };
      },
      nodeSize: 4,
    };

    const calmView = createMockView({
      coordsMap: new Map([[3, { bottom: 40 }]]),
      state: baseState,
    });
    expect(findBreakPosInTable(calmView, 0, makeTable([calmRow]), 50)).toBeNull();
  });

  it('returns the first overflowing row start when the table exceeds the boundary', () => {
    const coordsMap = new Map([
      [2, { bottom: 45, top: 35 }],
      [3, { bottom: 70, top: 60 }],
      [6, { bottom: 45, top: 35 }],
      [
        7,
        (count) => {
          if (count === 0) return { bottom: 90, top: 80 };
          if (count === 1) return { bottom: 80, top: 70 };
          throw new Error('no coords');
        },
      ],
      [8, { bottom: 85, top: 75 }],
    ]);

    const row = {
      type: { name: 'tableRow' },
      nodeSize: 8,
      childCount: 3,
      children: [
        { nodeSize: 2, type: { name: 'tableCell' } },
        { nodeSize: 2, type: { name: 'ignored' } },
        { nodeSize: 2, type: { spec: { tableRole: 'cell' } } },
      ],
      child(i) {
        return this.children[i];
      },
    };

    const preciseView = createMockView({
      coordsMap,
      state: baseState,
      nodeDomResolver(pos) {
        if (pos === 0 || pos === 1) {
          return {
            getBoundingClientRect: () => ({
              top: 40,
              bottom: 90,
              left: 0,
              right: 100,
              width: 100,
              height: 50,
            }),
          };
        }
        return {
          getBoundingClientRect: () => ({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
          }),
        };
      },
    });
    const preciseResult = findBreakPosInTable(preciseView, 0, makeTable([row]), 50);
    expect(preciseResult).toEqual({
      primary: { pos: 1, top: 50, bottom: 50 },
      all: [{ pos: 1, top: 50, bottom: 50 }],
      diagnostics: expect.any(Array),
    });

    const fallbackView = createMockView({
      coordsMap: new Map([[6, { bottom: 90 }]]),
      state: baseState,
      nodeDomResolver(pos) {
        if (pos === 1) {
          return {
            getBoundingClientRect: () => ({
              top: 40,
              bottom: 90,
              left: 0,
              right: 100,
              width: 100,
              height: 50,
            }),
          };
        }
        return {
          getBoundingClientRect: () => ({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
          }),
        };
      },
    });
    const fallbackRowlessTable = makeTable([{ nodeSize: 6, type: { name: 'paragraph' }, childCount: 0 }]);

    expect(findBreakPosInTable(fallbackView, 0, fallbackRowlessTable, 50)).toEqual({
      primary: { pos: 1, top: 50, bottom: 50 },
      all: [{ pos: 1, top: 50, bottom: 50 }],
      diagnostics: expect.any(Array),
    });
  });
});
