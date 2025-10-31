import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

function makeRow(nodeSize = 4, childCount = 1) {
  return {
    type: { name: 'tableRow' },
    childCount,
    child() {
      return { nodeSize: 2, type: { name: 'tableCell' } };
    },
    nodeSize,
  };
}

function createTableView(coordsMap, stateOverride = {}) {
  const state = {
    doc: {
      content: { size: 60 },
    },
    ...stateOverride,
  };

  return createMockView({
    coordsMap,
    state,
    nodeDomResolver(pos) {
      const coords = coordsMap.get(pos);
      if (coords && coords.bottom !== undefined) {
        return {
          getBoundingClientRect: () => ({
            top: coords.top ?? 0,
            bottom: coords.bottom,
            left: 0,
            right: 100,
          }),
        };
      }
      return null;
    },
  });
}

const baseState = {
  doc: {
    content: { size: 60 },
  },
};

describe('findBreakPosInTable', () => {
  beforeEach(() => {
    delete globalThis.__paginationTableLogs;
  });

  afterEach(() => {
    delete globalThis.__paginationTableLogs;
  });

  describe('null and invalid input handling', () => {
    it('returns null for non-table nodes', () => {
      const view = createMockView({ state: baseState });
      const nonTableNode = { type: { name: 'paragraph' }, childCount: 0 };
      expect(findBreakPosInTable(view, 0, nonTableNode, 50)).toBeNull();
    });

    it('returns null for null tableNode', () => {
      const view = createMockView({ state: baseState });
      expect(findBreakPosInTable(view, 0, null, 50)).toBeNull();
    });

    it('returns null for undefined tableNode', () => {
      const view = createMockView({ state: baseState });
      expect(findBreakPosInTable(view, 0, undefined, 50)).toBeNull();
    });

    it('returns null for table with zero childCount', () => {
      const view = createMockView({ state: baseState });
      const emptyTable = { type: { name: 'table' }, childCount: 0 };
      expect(findBreakPosInTable(view, 0, emptyTable, 50)).toBeNull();
    });
  });

  describe('fitting content', () => {
    it('returns null when all rows fit within boundary', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 40, top: 10 }]]));

      expect(findBreakPosInTable(view, 0, makeTable([row]), 50)).toBeNull();
    });

    it('returns null when table has no measurable bottom coords', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { top: 10 }]])); // No bottom

      expect(findBreakPosInTable(view, 0, makeTable([row]), 50)).toBeNull();
    });

    it('returns null when row bottom equals boundary exactly', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 50, top: 10 }]]));

      // bottom <= boundaryY, so no overflow
      expect(findBreakPosInTable(view, 0, makeTable([row]), 50)).toBeNull();
    });
  });

  describe('overflow detection', () => {
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

    it('detects overflow in first row', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 60, top: 10 }]]));

      const result = findBreakPosInTable(view, 0, makeTable([row]), 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(1);
      expect(result.primary.bottom).toBe(50); // Clamped to boundary
      expect(result.all).toHaveLength(1);
    });

    it('skips fitting rows and finds first overflow', () => {
      const row1 = makeRow(4, 1);
      const row2 = makeRow(6, 1);
      const view = createTableView(
        new Map([
          [1, { bottom: 30, top: 10 }], // Fits
          [5, { bottom: 70, top: 50 }], // Overflows
        ]),
      );

      const result = findBreakPosInTable(view, 0, makeTable([row1, row2]), 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(5); // Start of second row
    });

    it('returns correct structure with primary, all, and diagnostics', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 60, top: 10 }]]));

      const result = findBreakPosInTable(view, 0, makeTable([row]), 50);
      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('all');
      expect(result).toHaveProperty('diagnostics');
      expect(Array.isArray(result.all)).toBe(true);
      expect(Array.isArray(result.diagnostics)).toBe(true);
    });
  });

  describe('minPos parameter', () => {
    it('skips rows that end before minPos', () => {
      const row1 = makeRow(4, 1);
      const row2 = makeRow(6, 1);
      const view = createTableView(
        new Map([
          [1, { bottom: 60, top: 10 }], // Would overflow but rowEnd < minPos
          [5, { bottom: 70, top: 50 }], // Also overflows
        ]),
      );

      // minPos = 5 means skip first row (rowEnd = 4)
      const result = findBreakPosInTable(view, 0, makeTable([row1, row2]), 50, 5);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(5); // Second row
    });

    it('clamps result position to minPos when needed', () => {
      const row = makeRow(8, 1);
      const view = createTableView(new Map([[1, { bottom: 60, top: 10 }]]));

      // Row starts at 1 but minPos is 3
      const result = findBreakPosInTable(view, 0, makeTable([row]), 50, 3);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(3); // Clamped to minPos
    });
  });

  describe('diagnostics logging', () => {
    it('includes diagnostics array in result', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTable(view, 0, makeTable([row]), 50);
      expect(result.diagnostics).toBeDefined();
      expect(Array.isArray(result.diagnostics)).toBe(true);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it('logs to globalThis.__paginationTableLogs when available', () => {
      globalThis.__paginationTableLogs = [];
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 70, top: 10 }]]));

      findBreakPosInTable(view, 0, makeTable([row]), 50);
      expect(globalThis.__paginationTableLogs.length).toBeGreaterThan(0);
      const stages = globalThis.__paginationTableLogs.map((log) => log.stage);
      expect(stages).toContain('row-metrics');
      expect(stages).toContain('row-overflow');
    });

    it('does not crash when globalThis.__paginationTableLogs is not an array', () => {
      globalThis.__paginationTableLogs = null;
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 70, top: 10 }]]));

      expect(() => {
        findBreakPosInTable(view, 0, makeTable([row]), 50);
      }).not.toThrow();
    });
  });

  describe('multiple rows', () => {
    it('processes all rows until overflow found', () => {
      const row1 = makeRow(4, 1);
      const row2 = makeRow(4, 1);
      const row3 = makeRow(4, 1);
      const view = createTableView(
        new Map([
          [1, { bottom: 20, top: 10 }],
          [5, { bottom: 40, top: 30 }],
          [9, { bottom: 70, top: 60 }], // Third row overflows
        ]),
      );

      const result = findBreakPosInTable(view, 0, makeTable([row1, row2, row3]), 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(9); // Third row
      expect(result.diagnostics.length).toBe(3); // All three rows in diagnostics
    });

    it('returns first overflow even with multiple overflowing rows', () => {
      const row1 = makeRow(4, 1);
      const row2 = makeRow(4, 1);
      const view = createTableView(
        new Map([
          [1, { bottom: 60, top: 50 }], // First overflow
          [5, { bottom: 90, top: 80 }], // Also overflows
        ]),
      );

      const result = findBreakPosInTable(view, 0, makeTable([row1, row2]), 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(1); // First row, not second
    });
  });

  describe('edge cases', () => {
    it('handles view with null state', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 70, top: 10 }]]), null);

      const result = findBreakPosInTable(view, 0, makeTable([row]), 50);
      // Should handle gracefully with maxDocPos = 0
      if (result) {
        expect(result.primary.pos).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles very large boundaryY', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTable(view, 0, makeTable([row]), 10000);
      expect(result).toBeNull(); // Nothing overflows
    });

    it('handles zero boundaryY', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTable(view, 0, makeTable([row]), 0);
      expect(result).toBeDefined(); // Everything overflows
      expect(result.primary.pos).toBe(1);
    });

    it('handles negative boundaryY', () => {
      const row = makeRow(4, 1);
      const view = createTableView(new Map([[1, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTable(view, 0, makeTable([row]), -10);
      expect(result).toBeDefined(); // Everything overflows
    });
  });
});
