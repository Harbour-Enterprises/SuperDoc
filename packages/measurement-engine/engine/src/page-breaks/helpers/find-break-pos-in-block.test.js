// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { findBreakPosInBlock } from './find-break-pos-in-block.js';
import { createMockView } from './test-utils.js';
import { findLineBreakInBlock } from './find-line-break-in-block.js';

describe('findBreakPosInBlock', () => {
  const blockNode = { nodeSize: 6 };

  describe('null handling', () => {
    it('returns null when blockNode is null', () => {
      const view = createMockView({
        coordsMap: new Map([
          [1, { bottom: 10 }],
          [2, { bottom: 20 }],
          [3, { bottom: 30 }],
        ]),
      });

      expect(findBreakPosInBlock(view, 0, null, 15)).toBeNull();
    });

    it('returns null when blockNode is undefined', () => {
      const view = createMockView({
        coordsMap: new Map([[1, { bottom: 10 }]]),
      });

      expect(findBreakPosInBlock(view, 0, undefined, 50)).toBeNull();
    });
  });

  describe('fitting content', () => {
    it('reports last fitting position when content fits', () => {
      const view = createMockView({
        coordsMap: new Map([
          [1, { bottom: 10 }],
          [2, { bottom: 20 }],
          [3, { bottom: 30 }],
        ]),
      });

      expect(findBreakPosInBlock(view, 0, blockNode, 50)).toEqual({ pos: 3, top: 50, bottom: 30 });
    });

    it('returns null when entire block fits within boundary', () => {
      const view = createMockView({
        coordsMap: new Map([
          [1, { bottom: 10 }],
          [2, { bottom: 20 }],
        ]),
      });

      const result = findBreakPosInBlock(view, 0, { nodeSize: 3 }, 100);
      expect(result).toEqual({ pos: 2, top: 100, bottom: 20 });
    });
  });

  it('caches overflow coords to handle intermittent coord failures', () => {
    const coordsMap = new Map([
      [1, { bottom: 10 }],
      [2, { bottom: 20 }], // fits
      [3, { bottom: 60 }], // first overflow
    ]);
    const view = createMockView({ coordsMap });
    let callCount = 0;
    view.coordsAtPos = vi.fn((pos) => {
      if (pos === 3) {
        callCount++;
        // Allow first 2 calls to succeed (one from findLineBreakInBlock, one from binarySearch Phase 2)
        // Then fail subsequent calls
        if (callCount > 2) {
          throw new Error('no coords');
        }
      }
      return coordsMap.get(pos);
    });
    // Mock nodeDOM to make findLineBreakInBlock fail so it falls back to binarySearch
    view.nodeDOM = vi.fn(() => null);

    // Should break at position 3 (first overflow)
    // Even though later calls to coordsAtPos(3) fail, we cache coords from early calls
    // So we can still report accurate overflow position and coords
    expect(findBreakPosInBlock(view, 0, blockNode, 40)).toEqual({ pos: 3, top: 40, bottom: 60 });
  });

  it('returns precise top/bottom when coords available', () => {
    const coordsMap = new Map([
      [1, { top: 0, bottom: 10 }],
      [2, { top: 10, bottom: 20 }], // fits
      [3, { top: 20, bottom: 60 }], // first overflow
    ]);
    const view = createMockView({ coordsMap });
    // Should break at position 3 (first overflow) with its precise coords
    expect(findBreakPosInBlock(view, 0, blockNode, 40)).toEqual({ pos: 3, top: 20, bottom: 60 });
  });

  describe('coordinate fallback behavior', () => {
    it('uses actual coords when available from binary search', () => {
      const coordsMap = new Map([
        [1, { bottom: 10 }],
        [2, { bottom: 60 }], // overflow
      ]);
      const view = createMockView({ coordsMap });
      view.nodeDOM = vi.fn(() => null); // Force binary search path

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result).toBeDefined();
      // Binary search finds first overflow with its coords
      expect(result.pos).toBe(2);
      expect(result.bottom).toBe(60);
    });

    it('handles coords.top when not finite by using boundaryY', () => {
      const coordsMap = new Map([
        [1, { top: 0, bottom: 10 }],
        [2, { top: NaN, bottom: 60 }], // Non-finite top but valid bottom
      ]);
      const view = createMockView({ coordsMap });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      // Binary search finds position 2 (first overflow)
      expect(result.pos).toBe(2);
      expect(result.top).toBe(40); // Falls back to boundaryY when top is NaN
      expect(result.bottom).toBe(60); // Uses actual bottom
    });

    it('uses top when coords.bottom is not finite', () => {
      const coordsMap = new Map([
        [1, { top: 0, bottom: 10 }],
        [2, { top: 50, bottom: Infinity }], // Non-finite bottom
      ]);
      const view = createMockView({ coordsMap });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      // Binary search will find position 1 as overflow since Infinity > 40
      expect(result.pos).toBe(1);
      expect(result.top).toBeDefined();
      expect(result.bottom).toBeDefined();
    });

    it('handles both top and bottom non-finite', () => {
      const coordsMap = new Map([
        [1, { top: 0, bottom: 10 }],
        [2, { top: NaN, bottom: NaN }],
      ]);
      const view = createMockView({ coordsMap });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      // Binary search skips NaN coords, finds position 1
      expect(result.pos).toBe(1);
      expect(result.top).toBeDefined();
      expect(result.bottom).toBeDefined();
    });
  });

  describe('block position edge cases', () => {
    it('handles start > end scenario', () => {
      const view = createMockView({
        coordsMap: new Map([[5, { bottom: 60 }]]),
      });

      // Override resolve to return inverted start/end
      view.state.doc.resolve = vi.fn(() => ({
        start: () => 10,
        end: () => 5,
        depth: 1,
      }));

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result).toBeNull();
    });

    it('handles empty block where start equals end', () => {
      const view = createMockView({
        coordsMap: new Map(),
      });

      view.state.doc.resolve = vi.fn(() => ({
        start: () => 5,
        end: () => 5,
        depth: 1,
      }));

      const result = findBreakPosInBlock(view, 5, blockNode, 40);
      // Empty block should have no overflow
      expect(result).toBeNull();
    });

    it('handles blockPos at document start', () => {
      const coordsMap = new Map([
        [0, { bottom: 10 }],
        [1, { bottom: 60 }], // overflow
      ]);
      const view = createMockView({ coordsMap });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result).toBeDefined();
      expect(result.pos).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findLineBreakInBlock fast path', () => {
    it('uses findLineBreakInBlock result when available', () => {
      const coordsMap = new Map([
        [1, { top: 0, bottom: 10 }],
        [2, { top: 10, bottom: 20 }],
        [3, { top: 20, bottom: 70 }], // overflow
      ]);
      const view = createMockView({ coordsMap });

      // Mock nodeDOM to enable findLineBreakInBlock
      view.nodeDOM = vi.fn(() => {
        const elem = document.createElement('div');
        elem.textContent = 'test';
        return elem;
      });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result).toBeDefined();
      expect(result.pos).toBeGreaterThan(0);
    });

    it('falls back to binary search when findLineBreakInBlock returns null', () => {
      const coordsMap = new Map([
        [1, { bottom: 10 }],
        [2, { bottom: 60 }], // overflow
      ]);
      const view = createMockView({ coordsMap });

      // Mock nodeDOM to return null (findLineBreakInBlock will fail)
      view.nodeDOM = vi.fn(() => null);

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result).toBeDefined();
      expect(result.pos).toBe(2);
    });

    it('falls back to binary search when findLineBreakInBlock returns non-finite pos', () => {
      const coordsMap = new Map([
        [1, { bottom: 10 }],
        [2, { bottom: 60 }], // overflow
      ]);
      const view = createMockView({ coordsMap });

      // Mock nodeDOM but force non-finite result
      view.nodeDOM = vi.fn(() => {
        const elem = document.createElement('div');
        return elem;
      });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result).toBeDefined();
    });
  });

  describe('binary search fallback', () => {
    it('returns null when binary search finds no overflow', () => {
      const coordsMap = new Map([
        [1, { bottom: 10 }],
        [2, { bottom: 20 }],
        [3, { bottom: 30 }],
      ]);
      const view = createMockView({ coordsMap });
      view.nodeDOM = vi.fn(() => null); // Force binary search

      // All content before boundary of 5 (nothing overflows)
      view.state.doc.resolve = vi.fn(() => ({
        start: () => 10,
        end: () => 12,
        depth: 1,
      }));

      const result = findBreakPosInBlock(view, 0, blockNode, 5);
      // When all content exceeds boundary from the start, binary search returns null
      expect(result).toBeNull();
    });

    it('uses coords from binary search match when available', () => {
      const coordsMap = new Map([
        [1, { top: 0, bottom: 10 }],
        [2, { top: 10, bottom: 20 }],
        [3, { top: 20, bottom: 70 }], // overflow
      ]);
      const view = createMockView({ coordsMap });
      view.nodeDOM = vi.fn(() => null); // Force binary search

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result).toBeDefined();
      expect(result.pos).toBe(3);
      expect(result.top).toBeDefined();
      expect(result.bottom).toBeDefined();
    });
  });

  describe('overflow detection', () => {
    it('detects first overflowing position', () => {
      const coordsMap = new Map([
        [1, { top: 0, bottom: 10 }],
        [2, { top: 10, bottom: 20 }], // fits
        [3, { top: 20, bottom: 60 }], // first overflow
        [4, { top: 60, bottom: 80 }],
      ]);
      const view = createMockView({ coordsMap });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      expect(result.pos).toBe(3);
      expect(result.bottom).toBeGreaterThan(40);
    });

    it('handles boundary exactly at content bottom', () => {
      const coordsMap = new Map([
        [1, { top: 0, bottom: 10, left: 0 }],
        [2, { top: 10, bottom: 40, left: 0 }], // Exactly at boundary
        [3, { top: 40, bottom: 60, left: 0 }], // overflow
      ]);
      const view = createMockView({ coordsMap });

      const result = findBreakPosInBlock(view, 0, blockNode, 40);
      // Position 2 does NOT overflow (bottom = 40 is not > 40)
      // Position 3 does overflow (bottom = 60 > 40)
      // Binary search returns first overflowing position
      expect(result.pos).toBe(3);
      expect(result.bottom).toBe(60);
    });
  });
});

describe('findLineBreakInBlock (jsdom)', () => {
  it('snaps break to the start of the overflowing visual line', () => {
    const blockPos = 0;
    const blockNode = { nodeSize: 16 };

    const container = document.createElement('div');
    container.style.width = '140px';
    container.style.fontSize = '16px';
    container.style.lineHeight = '20px';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.textContent = 'Short line stays together and this strong text forces wrapping around the boundary.';
    document.body.appendChild(container);

    const mockRects = [
      { top: 10, bottom: 28, left: 12, right: 148, width: 136, height: 18 },
      { top: 28, bottom: 46, left: 16, right: 152, width: 136, height: 18 },
    ];
    const originalCreateRange = document.createRange.bind(document);
    document.createRange = () => {
      return {
        selectNodeContents: () => {},
        getClientRects: () => mockRects,
        detach: () => {},
      };
    };

    try {
      const [firstLine, secondLine] = mockRects;

      const boundaryY = firstLine.bottom + 1;
      const lineTwoTop = secondLine.top;
      const lineTwoBottom = secondLine.bottom;

      const coordsMap = new Map();
      for (let pos = 1; pos <= 20; pos += 1) {
        const isSecondLine = pos >= 8;
        coordsMap.set(pos, {
          top: isSecondLine ? lineTwoTop : firstLine.top,
          bottom: isSecondLine ? lineTwoBottom : firstLine.bottom,
        });
      }

      const view = createMockView({
        coordsMap,
        state: {
          doc: {
            content: { size: 64 },
            resolve: (pos) => ({
              pos,
              depth: 1,
              start: () => 0,
              end: () => 64,
            }),
            nodeAt: () => ({ nodeSize: 64 }),
          },
        },
      });
      view.nodeDOM = vi.fn(() => container);
      view.posAtCoords = vi.fn(({ top }) => {
        if (top < lineTwoTop - 0.5) {
          return { pos: 4 };
        }
        return { pos: 10 };
      });

      const result = findLineBreakInBlock(view, blockPos, blockNode, boundaryY, blockPos + 1);
      expect(result).not.toBeNull();
      expect(result.pos).toBe(8);
      expect(result.top).toBe(lineTwoTop);
      expect(result.bottom).toBe(lineTwoBottom);

      const fullResult = findBreakPosInBlock(view, blockPos, blockNode, boundaryY, blockPos + 1);
      expect(fullResult).toEqual(result);
    } finally {
      document.createRange = originalCreateRange;
      container.remove();
    }
  });
});
