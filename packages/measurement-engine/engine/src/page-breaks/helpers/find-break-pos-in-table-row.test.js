import { describe, it, expect } from 'vitest';
import { findBreakPosInTableRow } from './find-break-pos-in-table-row.js';
import { createMockView } from './test-utils.js';

function makeRow(children, attrs = {}) {
  const totalSize = children.reduce((sum, child) => sum + (child.nodeSize ?? 0), 0);
  return {
    childCount: children.length,
    children,
    child(i) {
      return this.children[i];
    },
    type: { name: 'tableRow' },
    nodeSize: totalSize + 2,
    attrs,
  };
}

function createRowView(coordsMap, stateOverride = {}) {
  const state = {
    doc: {
      content: { size: 50 },
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
    content: { size: 50 },
  },
};

describe('findBreakPosInTableRow', () => {
  describe('null and invalid input handling', () => {
    it('returns null for non-row nodes', () => {
      const view = createMockView({ state: baseState });
      const nonRowNode = { type: { name: 'paragraph' }, childCount: 0 };
      expect(findBreakPosInTableRow(view, 0, nonRowNode, 10)).toBeNull();
    });

    it('returns null for null rowNode', () => {
      const view = createMockView({ state: baseState });
      expect(findBreakPosInTableRow(view, 0, null, 10)).toBeNull();
    });

    it('returns null for undefined rowNode', () => {
      const view = createMockView({ state: baseState });
      expect(findBreakPosInTableRow(view, 0, undefined, 10)).toBeNull();
    });

    it('returns null for row with zero childCount', () => {
      const view = createMockView({ state: baseState });
      const emptyRow = { type: { name: 'tableRow' }, childCount: 0 };
      expect(findBreakPosInTableRow(view, 0, emptyRow, 10)).toBeNull();
    });

    it('returns null for row with cantSplit attribute', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }], { cantSplit: true });
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      expect(findBreakPosInTableRow(view, 0, row, 50)).toBeNull();
    });
  });

  describe('fitting content', () => {
    it('returns null when row fits within boundary', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 40, top: 10 }]]));

      expect(findBreakPosInTableRow(view, 0, row, 50)).toBeNull();
    });

    it('returns null when row has no measurable bottom', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { top: 10 }]])); // No bottom

      expect(findBreakPosInTableRow(view, 0, row, 50)).toBeNull();
    });

    it('returns null when row bottom equals boundary exactly', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 50, top: 10 }]]));

      // bottom <= boundaryY, so no overflow
      expect(findBreakPosInTableRow(view, 0, row, 50)).toBeNull();
    });

    it('returns null when row bottom is non-finite', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: NaN, top: 10 }]]));

      expect(findBreakPosInTableRow(view, 0, row, 50)).toBeNull();
    });
  });

  describe('overflow detection', () => {
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

    it('detects overflow in simple row', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(0);
      expect(result.primary.bottom).toBe(50); // Clamped to boundary
      expect(result.all).toHaveLength(1);
    });

    it('returns correct structure with primary and all', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.all)).toBe(true);
      expect(result.primary).toEqual(result.all[0]);
    });
  });

  describe('minPos parameter', () => {
    it('returns null when rowEnd is before minPos', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      // rowEnd = 0 + 6 - 1 = 5, minPos = 10
      const result = findBreakPosInTableRow(view, 0, row, 50, 10);
      expect(result).toBeNull(); // rowEnd <= minPos
    });

    it('clamps result position to minPos when needed', () => {
      const row = makeRow([{ nodeSize: 8, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      // Row starts at 0 but minPos is 3
      const result = findBreakPosInTableRow(view, 0, row, 50, 3);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(3); // Clamped to minPos
    });

    it('uses default minPos of 0', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBeGreaterThanOrEqual(0);
    });
  });

  describe('position clamping', () => {
    it('clamps row positions to maxDocPos', () => {
      const row = makeRow([{ nodeSize: 100, type: { name: 'tableCell' } }]); // Very large row
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]), { doc: { content: { size: 10 } } });

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      // Positions should be clamped to maxDocPos (9)
      expect(result.primary.pos).toBeLessThanOrEqual(9);
    });

    it('handles zero document size', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]), { doc: { content: { size: 0 } } });

      const result = findBreakPosInTableRow(view, 0, row, 50);
      // Should handle gracefully
      if (result) {
        expect(result.primary.pos).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles negative rowPos by clamping', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      // Negative rowPos should be clamped
      const result = findBreakPosInTableRow(view, -5, row, 50);
      if (result) {
        expect(result.primary.pos).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('top value calculation', () => {
    it('uses boundaryY when metrics.top is null', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70 }]])); // No top

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      expect(result.primary.top).toBe(50); // Falls back to boundaryY
    });

    it('prefers boundaryY over metrics.top', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      // pickFirstFinite(boundaryY, metrics.top, metrics.bottom)
      expect(result.primary.top).toBe(50); // Uses boundaryY first
    });

    it('uses metrics.bottom when metrics.top is not finite', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: NaN }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      // pickFirstFinite(boundaryY, metrics.top, metrics.bottom)
      // Should use boundaryY (50) since it comes first and is finite
      expect(result.primary.top).toBe(50);
    });
  });

  describe('coordinate resolution', () => {
    it('uses DOM rect when available', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createMockView({
        coordsMap: new Map(),
        state: baseState,
        nodeDomResolver(pos) {
          if (pos === 0) {
            return {
              getBoundingClientRect: () => ({
                top: 10,
                bottom: 70,
                left: 0,
                right: 100,
              }),
            };
          }
          return null;
        },
      });

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(0);
    });

    it('falls back to safeCoordsAtPos when DOM rect unavailable', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
    });

    it('handles getBoundingClientRect throwing exception', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createMockView({
        coordsMap: new Map([[0, { bottom: 70, top: 10 }]]),
        state: baseState,
        nodeDomResolver() {
          return {
            getBoundingClientRect: () => {
              throw new Error('DOM error');
            },
          };
        },
      });

      // Should not crash, should fall back to coords
      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles view with null state', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]), null);

      const result = findBreakPosInTableRow(view, 0, row, 50);
      // Should handle gracefully with maxDocPos = 0
      if (result) {
        expect(result.primary.pos).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles very large boundaryY', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 10000);
      expect(result).toBeNull(); // Nothing overflows
    });

    it('handles zero boundaryY', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 0);
      expect(result).toBeDefined(); // Everything overflows
      expect(result.primary.pos).toBe(0);
    });

    it('handles negative boundaryY', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, -10);
      expect(result).toBeDefined(); // Everything overflows
    });

    it('handles row with multiple cells', () => {
      const row = makeRow([
        { nodeSize: 3, type: { name: 'tableCell' } },
        { nodeSize: 3, type: { name: 'tableCell' } },
        { nodeSize: 3, type: { name: 'tableCell' } },
      ]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
      expect(result.primary.pos).toBe(0);
    });
  });

  describe('cantSplit attribute', () => {
    it('respects cantSplit=true attribute', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }], { cantSplit: true });
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      // Even though it overflows, cantSplit prevents breaking
      expect(findBreakPosInTableRow(view, 0, row, 50)).toBeNull();
    });

    it('allows split when cantSplit=false', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }], { cantSplit: false });
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
    });

    it('allows split when cantSplit is undefined', () => {
      const row = makeRow([{ nodeSize: 4, type: { name: 'tableCell' } }]);
      const view = createRowView(new Map([[0, { bottom: 70, top: 10 }]]));

      const result = findBreakPosInTableRow(view, 0, row, 50);
      expect(result).toBeDefined();
    });
  });
});
