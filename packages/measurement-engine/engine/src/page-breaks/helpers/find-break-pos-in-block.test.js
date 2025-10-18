import { describe, it, expect, vi } from 'vitest';
import { findBreakPosInBlock } from './find-break-pos-in-block.js';
import { createMockView } from './test-utils.js';

describe('findBreakPosInBlock', () => {
  const blockNode = { nodeSize: 6 };

  it('returns null when node is missing and reports last fitting position when content fits', () => {
    const view = createMockView({
      coordsMap: new Map([
        [1, { bottom: 10 }],
        [2, { bottom: 20 }],
        [3, { bottom: 30 }],
      ]),
    });

    expect(findBreakPosInBlock(view, 0, null, 15)).toBeNull();
    expect(findBreakPosInBlock(view, 0, blockNode, 50)).toEqual({ pos: 3, top: 50, bottom: 30 });
  });

  it('falls back to boundary when coords lookup fails', () => {
    const coordsMap = new Map([
      [1, { bottom: 10 }],
      [2, { bottom: 20 }],
      [3, { bottom: 60 }],
    ]);
    const view = createMockView({ coordsMap });
    let failNext = false;
    view.coordsAtPos = vi.fn((pos) => {
      if (pos === 3 && failNext) {
        throw new Error('no coords');
      }
      if (pos === 3) {
        failNext = true;
      }
      return coordsMap.get(pos);
    });

    expect(findBreakPosInBlock(view, 0, blockNode, 40)).toEqual({ pos: 2, top: 40, bottom: 20 });
  });

  it('returns precise top/bottom when coords available', () => {
    const coordsMap = new Map([
      [1, { top: 0, bottom: 10 }],
      [2, { top: 10, bottom: 20 }],
      [3, { top: 20, bottom: 60 }],
    ]);
    const view = createMockView({ coordsMap });
    expect(findBreakPosInBlock(view, 0, blockNode, 40)).toEqual({ pos: 2, top: 10, bottom: 20 });
  });
});
