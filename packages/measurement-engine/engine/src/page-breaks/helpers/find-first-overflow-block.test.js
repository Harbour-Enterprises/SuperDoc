import { describe, it, expect } from 'vitest';
import { findFirstOverflowBlock } from './find-first-overflow-block.js';
import { createMockView, createMockDoc } from './test-utils.js';

const baseNode = (overrides = {}) => ({
  isBlock: true,
  nodeSize: overrides.nodeSize ?? 4,
  type: overrides.type ?? { name: 'paragraph' },
  ...overrides,
});

describe('findFirstOverflowBlock', () => {
  it('returns null when view or doc missing', () => {
    expect(findFirstOverflowBlock(null)).toBeNull();
    expect(findFirstOverflowBlock({ state: {} })).toBeNull();
  });

  it('returns null when no nodes cross the boundary', () => {
    const node = baseNode();
    const doc = createMockDoc([{ node, pos: 0 }], { size: 20 });
    const view = createMockView({
      nodeRects: new Map([[0, { top: 0, bottom: 80 }]]),
      coordsMap: new Map([[2, { bottom: 79 }]]),
      domTop: 0,
      state: { doc },
    });

    expect(
      findFirstOverflowBlock(view, {
        pageWindow: { safeTopMargin: 0, contentHeightPx: 100, printableHeightPx: 100, allowancePx: 0 },
        boundaryY: 90,
        overflowAllowancePx: 0,
      }),
    ).toBeNull();
  });

  it('respects tolerance when last character is within allowance', () => {
    const node = baseNode();
    const doc = createMockDoc([{ node, pos: 0 }], { size: 20 });
    const view = createMockView({
      nodeRects: new Map([[0, { top: 0, bottom: 120 }]]),
      coordsMap: new Map([[3, { bottom: 99.4 }]]),
      state: { doc },
    });

    expect(
      findFirstOverflowBlock(view, {
        pageWindow: { safeTopMargin: 0, contentHeightPx: 100, printableHeightPx: 100, allowancePx: 0 },
        boundaryY: 99,
        overflowAllowancePx: 25,
      }),
    ).toBeNull();
  });

  it('returns overflow details when boundary exceeded', () => {
    const node = baseNode();
    const doc = createMockDoc([{ node, pos: 0 }], { size: 20 });
    const rect = { top: 10, bottom: 210 };
    const view = createMockView({
      nodeRects: new Map([[0, rect]]),
      coordsMap: new Map([[3, { bottom: 220 }]]),
      domTop: 5,
      state: { doc },
    });

    const result = findFirstOverflowBlock(view, {
      pageWindow: { safeTopMargin: 0, contentHeightPx: 90, printableHeightPx: 90, allowancePx: 10 },
      boundaryY: 80,
      overflowAllowancePx: 5,
    });

    expect(result?.node).toBe(node);
    expect(result?.pos).toBe(0);
    expect(result?.rect?.top).toBe(rect.top);
    expect(result?.rect?.bottom).toBeGreaterThan(rect.bottom - 1);
    expect(result?.containerTop).toBe(5);
    expect(result?.pageBottomY).toBeGreaterThan(result?.pageBottomLimitY ?? 0);
  });
});
