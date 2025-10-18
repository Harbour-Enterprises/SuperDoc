import { describe, it, expect } from 'vitest';
import { findBreakPosInTableRow } from './find-break-pos-in-table-row.js';
import { createMockView } from './test-utils.js';

function makeRow(children) {
  const totalSize = children.reduce((sum, child) => sum + (child.nodeSize ?? 0), 0);
  return {
    childCount: children.length,
    children,
    child(i) {
      return this.children[i];
    },
    type: { name: 'tableRow' },
    nodeSize: totalSize + 2,
  };
}

describe('findBreakPosInTableRow', () => {
  const baseState = {
    doc: {
      content: { size: 50 },
    },
  };

  it('returns null for non-row nodes or when nothing exceeds boundary', () => {
    const view = createMockView({ state: baseState });
    expect(findBreakPosInTableRow(view, 0, { childCount: 0 }, 10)).toBeNull();

    const calmRow = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
    const calmView = createMockView({
      coordsMap: new Map([[3, { bottom: 10 }]]),
      state: baseState,
    });
    expect(findBreakPosInTableRow(calmView, 0, calmRow, 50)).toBeNull();
  });

  it('returns row start when the row extends beyond the boundary', () => {
    const coordsMap = new Map([
      [1, { bottom: 40, top: 30 }],
      [2, { bottom: 65, top: 55 }],
      [5, { bottom: 45, top: 35 }],
      [
        6,
        (count) => {
          if (count === 0) return { bottom: 90, top: 80 };
          if (count === 1) return { bottom: 80, top: 70 };
          throw new Error('no coords');
        },
      ],
    ]);

    const row = makeRow([
      { nodeSize: 2, type: { name: 'tableCell' } },
      { nodeSize: 2, type: { name: 'ignored' } },
      { nodeSize: 2, type: { spec: { tableRole: 'cell' } } },
    ]);

    const view = createMockView({
      coordsMap,
      state: baseState,
      nodeDomResolver(pos) {
        if (pos === 0) {
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
    const result = findBreakPosInTableRow(view, 0, row, 50);

    expect(result?.primary).toEqual({ pos: 0, top: 50, bottom: 50 });
    expect(result?.all).toEqual([{ pos: 0, top: 50, bottom: 50 }]);
  });
});
