// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../page-breaks/helpers/index.js', () => ({
  findBreakPosInBlock: vi.fn(),
  safeCoordsAtPos: vi.fn(),
}));

const { findBreakPosInBlock, safeCoordsAtPos } = await import('../../../page-breaks/helpers/index.js');
const { findTableRowOverflow } = await import('./table-overflow.js');

describe('findTableRowOverflow', () => {
  beforeEach(() => {
    findBreakPosInBlock.mockReset();
    safeCoordsAtPos.mockReset();
  });

  it('falls back to a boundary-aligned break inside an oversized row', () => {
    const paragraphNode = {
      nodeSize: 300,
      childCount: 0,
      type: { name: 'paragraph' },
    };

    const cellNode = {
      nodeSize: 400,
      childCount: 1,
      child: () => paragraphNode,
      type: { name: 'tableCell' },
    };

    const rowNode = {
      nodeSize: 500,
      childCount: 1,
      child: () => cellNode,
      type: { name: 'tableRow' },
    };

    const doc = {
      content: { size: 2000 },
      descendants: (cb) => {
        cb(rowNode, 0);
      },
    };

    const rowDom = {
      getBoundingClientRect: () => ({ top: 100, bottom: 1200 }),
    };
    const cellDom = {
      getBoundingClientRect: () => ({ top: 120, bottom: 1180 }),
    };

    const view = {
      state: { doc },
      nodeDOM: (pos) => {
        if (pos === 0) return rowDom;
        if (pos === 1) return cellDom;
        return null;
      },
    };

    findBreakPosInBlock.mockReturnValue(null);
    safeCoordsAtPos.mockImplementation((_view, pos) => {
      const top = 100 + pos * 2;
      return {
        top,
        bottom: top + 20,
      };
    });

    const boundary = 900;
    const overflow = findTableRowOverflow(view, { startPos: 0, boundary });

    expect(overflow).not.toBeNull();
    expect(overflow?.break?.pos).toBeGreaterThan(0);
    expect(overflow?.break?.pos).toBeLessThan(500);
    expect(Math.abs((overflow?.break?.top ?? 0) - boundary)).toBeLessThanOrEqual(2);
    expect(overflow?.break?.bottom).toBeLessThanOrEqual(boundary);
  });

  it('uses binary search fallback when cell refinement fails', () => {
    // CRITICAL TEST: Ensures that when findBreakPosInBlock fails, we fall back to
    // binarySearchForYPosition which returns BOTH position and coords.
    // This preserves overflow coordinates even when rewinding to avoid mid-word breaks.
    const paragraphNode = {
      nodeSize: 300,
      childCount: 0,
      type: { name: 'paragraph' },
    };

    const cellNode = {
      nodeSize: 400,
      childCount: 1,
      child: () => paragraphNode,
      type: { name: 'tableCell' },
    };

    const rowNode = {
      nodeSize: 500,
      childCount: 1,
      child: () => cellNode,
      type: { name: 'tableRow' },
    };

    const doc = {
      content: { size: 2000 },
      descendants: (cb) => {
        cb(rowNode, 0);
      },
    };

    const rowDom = {
      getBoundingClientRect: () => ({ top: 100, bottom: 1200 }),
    };
    const cellDom = {
      getBoundingClientRect: () => ({ top: 120, bottom: 1180 }),
    };

    const view = {
      state: { doc },
      nodeDOM: (pos) => {
        if (pos === 0) return rowDom;
        if (pos === 1) return cellDom;
        return null;
      },
    };

    // Cell refinement fails, forcing binary search fallback
    findBreakPosInBlock.mockReturnValue(null);

    // Binary search will find a position close to the boundary
    safeCoordsAtPos.mockImplementation((_view, pos) => {
      const top = 100 + pos * 2;
      return { top, bottom: top + 20 };
    });

    const boundary = 900;
    const overflow = findTableRowOverflow(view, { startPos: 0, boundary });

    expect(overflow).not.toBeNull();
    expect(overflow?.break?.pos).toBeGreaterThan(0);
    expect(overflow?.break?.pos).toBeLessThan(500);

    // CRITICAL: Coordinates should be close to boundary (preserved from binary search)
    // Not from some arbitrary rewound position
    expect(Math.abs((overflow?.break?.bottom ?? 0) - boundary)).toBeLessThan(50);
    expect(overflow?.break?.bottom).toBeLessThanOrEqual(boundary);
  });
});
