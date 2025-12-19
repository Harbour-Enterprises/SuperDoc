import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Layout } from '@superdoc/contracts';

import { DomPositionIndex } from './DomPositionIndex.js';
import {
  computeDomCaretPageLocal,
  computeSelectionRectsFromDom,
  deduplicateOverlappingRects,
  type ComputeDomCaretPageLocalOptions,
  type ComputeSelectionRectsFromDomOptions,
} from './DomSelectionGeometry.js';

/**
 * Helper function to create a DOMRect-like object for testing.
 * DOMRect is a browser API that we mock here for unit tests.
 */
function createRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    bottom: y + height,
    right: x + width,
    toJSON: () => ({ x, y, width, height, top: y, left: x, bottom: y + height, right: x + width }),
  } as DOMRect;
}

describe('deduplicateOverlappingRects', () => {
  it('returns empty array when given empty array', () => {
    const result = deduplicateOverlappingRects([]);
    expect(result).toEqual([]);
  });

  it('returns single rect unchanged', () => {
    const rect = createRect(10, 20, 100, 16);
    const result = deduplicateOverlappingRects([rect]);
    expect(result).toEqual([rect]);
  });

  it('keeps both rects when they are on different lines (y difference > 3px)', () => {
    const rect1 = createRect(10, 20, 100, 16);
    const rect2 = createRect(10, 40, 100, 16);

    const result = deduplicateOverlappingRects([rect1, rect2]);

    expect(result).toHaveLength(2);
    expect(result).toContain(rect1);
    expect(result).toContain(rect2);
  });

  it('removes duplicate when two rects on same line overlap >80% horizontally', () => {
    // Simulate line-box rect (larger, typically from containing element)
    const lineBoxRect = createRect(10, 20, 100, 18);
    // Simulate text-content rect (smaller, from text node)
    const textContentRect = createRect(10, 20.5, 98, 16);

    const result = deduplicateOverlappingRects([lineBoxRect, textContentRect]);

    // Should keep only the smaller rect (text-content rect)
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(textContentRect);
  });

  it('keeps the smaller rect when deduplicating overlapping rects', () => {
    const largerRect = createRect(10, 20, 100, 20);
    const smallerRect = createRect(10, 21, 100, 16);

    const result = deduplicateOverlappingRects([largerRect, smallerRect]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(smallerRect);
  });

  it('keeps both rects when horizontal overlap is <80% even if on same line', () => {
    // Rects on same line (y within 3px) but only 50% overlap
    const rect1 = createRect(10, 20, 100, 16);
    const rect2 = createRect(60, 21, 100, 16);

    const result = deduplicateOverlappingRects([rect1, rect2]);

    expect(result).toHaveLength(2);
    expect(result).toContain(rect1);
    expect(result).toContain(rect2);
  });

  it('keeps both rects when there is no horizontal overlap', () => {
    const rect1 = createRect(10, 20, 50, 16);
    const rect2 = createRect(70, 21, 50, 16);

    const result = deduplicateOverlappingRects([rect1, rect2]);

    expect(result).toHaveLength(2);
    expect(result).toContain(rect1);
    expect(result).toContain(rect2);
  });

  it('handles boundary condition: exactly 3px y-difference (should be considered same line)', () => {
    const rect1 = createRect(10, 20, 100, 16);
    const rect2 = createRect(10, 22.9, 100, 16);

    const result = deduplicateOverlappingRects([rect1, rect2]);

    // Y difference is 2.9px (< 3px threshold), so should deduplicate
    expect(result).toHaveLength(1);
  });

  it('handles boundary condition: slightly more than 3px y-difference (different lines)', () => {
    const rect1 = createRect(10, 20, 100, 16);
    const rect2 = createRect(10, 23.1, 100, 16);

    const result = deduplicateOverlappingRects([rect1, rect2]);

    // Y difference is 3.1px (> 3px threshold), so should keep both
    expect(result).toHaveLength(2);
  });

  it('handles boundary condition: exactly 80% horizontal overlap (should deduplicate)', () => {
    const rect1 = createRect(10, 20, 100, 16);
    const rect2 = createRect(10, 21, 80, 16);

    const result = deduplicateOverlappingRects([rect1, rect2]);

    // Overlap is 80px, minWidth is 80px, ratio is exactly 1.0 (100% of smaller rect)
    // which is > 0.8 threshold, so should deduplicate
    expect(result).toHaveLength(1);
  });

  it('handles boundary condition: slightly less than 80% overlap (should keep both)', () => {
    const rect1 = createRect(10, 20, 100, 16);
    const rect2 = createRect(30, 21, 100, 16);

    const result = deduplicateOverlappingRects([rect1, rect2]);

    // Overlap is 80px, minWidth is 100px, ratio is 0.8 (exactly 80%)
    // The condition is > 0.8, so this should keep both
    expect(result).toHaveLength(2);
  });

  it('sorts unsorted input by y then x coordinates', () => {
    const rect1 = createRect(50, 40, 50, 16);
    const rect2 = createRect(10, 20, 50, 16);
    const rect3 = createRect(30, 20, 50, 16);

    const result = deduplicateOverlappingRects([rect1, rect2, rect3]);

    // Should be sorted by y (20, 20, 40), then by x within same y (10, 30)
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(rect2); // x=10, y=20
    expect(result[1]).toBe(rect3); // x=30, y=20
    expect(result[2]).toBe(rect1); // x=50, y=40
  });

  it('handles multiple overlapping groups on different lines', () => {
    // Line 1: two overlapping rects
    const line1Large = createRect(10, 20, 100, 18);
    const line1Small = createRect(10, 20.5, 98, 16);

    // Line 2: two overlapping rects
    const line2Large = createRect(10, 60, 100, 18);
    const line2Small = createRect(10, 60.5, 98, 16);

    const result = deduplicateOverlappingRects([line1Large, line1Small, line2Large, line2Small]);

    // Should keep only the smaller rect from each line
    expect(result).toHaveLength(2);
    expect(result).toContain(line1Small);
    expect(result).toContain(line2Small);
  });

  it('handles three overlapping rects on the same line (keeps smallest)', () => {
    const largest = createRect(10, 20, 100, 20);
    const medium = createRect(10, 20.5, 100, 18);
    const smallest = createRect(10, 21, 100, 16);

    const result = deduplicateOverlappingRects([largest, medium, smallest]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(smallest);
  });

  it('does not mutate the input array', () => {
    const rect1 = createRect(10, 40, 50, 16);
    const rect2 = createRect(10, 20, 50, 16);
    const input = [rect1, rect2];
    const originalOrder = [...input];

    deduplicateOverlappingRects(input);

    // Input array should be unchanged
    expect(input).toEqual(originalOrder);
    expect(input[0]).toBe(rect1);
    expect(input[1]).toBe(rect2);
  });

  it('handles rects with zero width or height gracefully', () => {
    const validRect = createRect(10, 20, 100, 16);
    const zeroWidthRect = createRect(10, 21, 0, 16);
    const zeroHeightRect = createRect(10, 21, 100, 0);

    const result = deduplicateOverlappingRects([validRect, zeroWidthRect, zeroHeightRect]);

    // Zero-dimension rects should still be processed without errors
    // The algorithm should handle them based on overlap calculations
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('handles complex real-world scenario with mixed overlapping and non-overlapping rects', () => {
    // Line 1: overlapping group (line-box + text-content)
    const line1Box = createRect(10, 20, 200, 18);
    const line1Text = createRect(10, 20.5, 195, 16);

    // Line 1: separate word on same line, no overlap
    const line1Word = createRect(220, 21, 50, 16);

    // Line 2: non-overlapping rects
    const line2Word1 = createRect(10, 60, 50, 16);
    const line2Word2 = createRect(70, 61, 50, 16);

    const result = deduplicateOverlappingRects([line1Box, line1Text, line1Word, line2Word1, line2Word2]);

    expect(result).toHaveLength(4);
    expect(result).toContain(line1Text); // smaller of the overlapping pair
    expect(result).toContain(line1Word);
    expect(result).toContain(line2Word1);
    expect(result).toContain(line2Word2);
  });
});

describe('computeSelectionRectsFromDom', () => {
  let painterHost: HTMLElement;
  let domPositionIndex: DomPositionIndex;
  let rebuildDomPositionIndex: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    painterHost = document.createElement('div');
    domPositionIndex = new DomPositionIndex();
    rebuildDomPositionIndex = vi.fn(() => {
      domPositionIndex.rebuild(painterHost);
    });
  });

  /**
   * Helper to create a minimal Layout object for testing
   */
  function createMockLayout(pages: Array<{ pmStart: number; pmEnd: number }>): Layout {
    return {
      pageSize: { w: 612, h: 792 },
      pages: pages.map((page, idx) => ({
        number: idx + 1,
        fragments: [
          {
            kind: 'para' as const,
            blockId: `block-${idx}`,
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 612,
            pmStart: page.pmStart,
            pmEnd: page.pmEnd,
          },
        ],
      })),
    };
  }

  /**
   * Helper to create a basic options object
   */
  function createOptions(layout: Layout | null): ComputeSelectionRectsFromDomOptions {
    return {
      painterHost,
      layout,
      domPositionIndex,
      rebuildDomPositionIndex,
      zoom: 1,
      pageHeight: 792,
      pageGap: 16,
    };
  }

  describe('basic selection rectangle computation', () => {
    it('computes selection rects for a simple text range', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line" data-pm-start="1" data-pm-end="10">
            <span data-pm-start="1" data-pm-end="10">hello world</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      domPositionIndex.rebuild(painterHost);

      // Mock getBoundingClientRect for page and range
      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));

      // Mock Range.getClientRects
      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [createRect(10, 20, 100, 16)]),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      const rects = computeSelectionRectsFromDom(options, 1, 10);

      expect(rects).not.toBe(null);
      expect(rects).toHaveLength(1);
      expect(rects![0]).toMatchObject({
        pageIndex: 0,
        x: 10,
        y: 20,
        width: 100,
        height: 16,
      });

      document.createRange = originalCreateRange;
    });

    it('returns empty array for collapsed selection (from === to)', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line" data-pm-start="1" data-pm-end="10">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      const options = createOptions(layout);

      const rects = computeSelectionRectsFromDom(options, 5, 5);

      expect(rects).toEqual([]);
    });

    it('handles reversed selection (to < from) by normalizing', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line" data-pm-start="1" data-pm-end="10">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [createRect(10, 20, 50, 16)]),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      const rects = computeSelectionRectsFromDom(options, 8, 3);

      expect(rects).not.toBe(null);
      expect(rects).toHaveLength(1);

      document.createRange = originalCreateRange;
    });
  });

  describe('multi-page selections', () => {
    it('computes rects spanning multiple pages', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">page 1</span>
          </div>
        </div>
        <div class="superdoc-page" data-page-index="1">
          <div class="superdoc-line">
            <span data-pm-start="11" data-pm-end="20">page 2</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([
        { pmStart: 1, pmEnd: 10 },
        { pmStart: 11, pmEnd: 20 },
      ]);
      domPositionIndex.rebuild(painterHost);

      const pages = Array.from(painterHost.querySelectorAll('.superdoc-page')) as HTMLElement[];
      pages[0]!.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      pages[1]!.getBoundingClientRect = vi.fn(() => createRect(0, 808, 612, 792));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [createRect(10, 20, 100, 16)]),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      const rects = computeSelectionRectsFromDom(options, 5, 15);

      expect(rects).not.toBe(null);
      expect(rects!.length).toBeGreaterThan(0);

      // Should have rects from both pages
      const pageIndices = new Set(rects!.map((r) => r.pageIndex));
      expect(pageIndices.has(0)).toBe(true);
      expect(pageIndices.has(1)).toBe(true);

      document.createRange = originalCreateRange;
    });
  });

  describe('index rebuild behavior', () => {
    it('rebuilds index when elements not found (stale index detection)', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);

      // Start with empty index
      expect(domPositionIndex.size).toBe(0);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [createRect(10, 20, 50, 16)]),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      computeSelectionRectsFromDom(options, 1, 10);

      // Should have triggered rebuild
      expect(rebuildDomPositionIndex).toHaveBeenCalled();

      document.createRange = originalCreateRange;
    });

    it('returns null when painterHost is null', () => {
      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      const options: ComputeSelectionRectsFromDomOptions = {
        painterHost: null,
        layout,
        domPositionIndex,
        rebuildDomPositionIndex,
        zoom: 1,
        pageHeight: 792,
        pageGap: 16,
      };

      const rects = computeSelectionRectsFromDom(options, 1, 10);

      expect(rects).toBe(null);
    });

    it('returns null when layout is null', () => {
      const options = createOptions(null);

      const rects = computeSelectionRectsFromDom(options, 1, 10);

      expect(rects).toBe(null);
    });
  });

  describe('virtualized pages (not mounted)', () => {
    it('skips pages with no mounted DOM elements', () => {
      // Create layout with 3 pages but only mount page 1
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="1">
          <div class="superdoc-line">
            <span data-pm-start="11" data-pm-end="20">page 1 content</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([
        { pmStart: 1, pmEnd: 10 },
        { pmStart: 11, pmEnd: 20 },
        { pmStart: 21, pmEnd: 30 },
      ]);
      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 808, 612, 792));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [createRect(10, 20, 50, 16)]),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      const rects = computeSelectionRectsFromDom(options, 1, 25);

      expect(rects).not.toBe(null);
      // Should only have rects from page 1 (the only mounted page)
      const pageIndices = new Set(rects!.map((r) => r.pageIndex));
      expect(pageIndices.size).toBeLessThanOrEqual(1);

      document.createRange = originalCreateRange;
    });
  });

  describe('deduplication integration', () => {
    it('deduplicates overlapping rects from getClientRects', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));

      // Return overlapping rects that should be deduplicated
      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [
          createRect(10, 20, 100, 18), // Line-box rect
          createRect(10, 20.5, 98, 16), // Text-content rect (should be kept)
        ]),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      const rects = computeSelectionRectsFromDom(options, 1, 10);

      expect(rects).not.toBe(null);
      // Should have deduplicated to 1 rect
      expect(rects).toHaveLength(1);
      expect(rects![0]!.height).toBe(16); // Should keep the smaller rect

      document.createRange = originalCreateRange;
    });
  });

  describe('edge cases - invalid positions', () => {
    it('returns null for NaN from position', () => {
      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      const options = createOptions(layout);

      const rects = computeSelectionRectsFromDom(options, NaN, 10);

      expect(rects).toBe(null);
    });

    it('returns null for NaN to position', () => {
      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      const options = createOptions(layout);

      const rects = computeSelectionRectsFromDom(options, 1, NaN);

      expect(rects).toBe(null);
    });

    it('returns null for Infinity positions', () => {
      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      const options = createOptions(layout);

      expect(computeSelectionRectsFromDom(options, Infinity, 10)).toBe(null);
      expect(computeSelectionRectsFromDom(options, 1, Infinity)).toBe(null);
    });
  });

  describe('zoom handling', () => {
    it('correctly scales coordinates based on zoom level', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([{ pmStart: 1, pmEnd: 10 }]);
      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 1224, 1584)); // 2x zoom

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [createRect(20, 40, 200, 32)]), // 2x coordinates
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      options.zoom = 2;

      const rects = computeSelectionRectsFromDom(options, 1, 10);

      expect(rects).not.toBe(null);
      expect(rects).toHaveLength(1);
      // Coordinates should be divided by zoom
      expect(rects![0]).toMatchObject({
        x: 10, // 20 / 2
        width: 100, // 200 / 2
        height: 16, // 32 / 2
      });

      document.createRange = originalCreateRange;
    });
  });

  describe('page gap calculation', () => {
    it('includes page gap in y coordinate calculation', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="1">
          <div class="superdoc-line">
            <span data-pm-start="11" data-pm-end="20">page 2</span>
          </div>
        </div>
      `;

      const layout = createMockLayout([
        { pmStart: 1, pmEnd: 10 },
        { pmStart: 11, pmEnd: 20 },
      ]);
      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getClientRects: vi.fn(() => [createRect(10, 20, 100, 16)]),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createOptions(layout);
      options.pageGap = 16;
      options.pageHeight = 792;

      const rects = computeSelectionRectsFromDom(options, 11, 20);

      expect(rects).not.toBe(null);
      expect(rects).toHaveLength(1);
      // y should be: pageIndex * (pageHeight + pageGap) + localY
      // = 1 * (792 + 16) + 20 = 828
      expect(rects![0]!.y).toBe(1 * (792 + 16) + 20);

      document.createRange = originalCreateRange;
    });
  });
});

describe('computeDomCaretPageLocal', () => {
  let painterHost: HTMLElement;
  let domPositionIndex: DomPositionIndex;
  let rebuildDomPositionIndex: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    painterHost = document.createElement('div');
    domPositionIndex = new DomPositionIndex();
    rebuildDomPositionIndex = vi.fn(() => {
      domPositionIndex.rebuild(painterHost);
    });
  });

  function createCaretOptions(): ComputeDomCaretPageLocalOptions {
    return {
      painterHost,
      domPositionIndex,
      rebuildDomPositionIndex,
      zoom: 1,
    };
  }

  describe('basic caret position computation', () => {
    it('computes caret position in page-local coordinates for text node', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">hello</span>
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const lineEl = painterHost.querySelector('.superdoc-line') as HTMLElement;
      const spanEl = painterHost.querySelector('span') as HTMLElement;

      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      lineEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 100, 16));
      spanEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 50, 16));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: vi.fn(() => createRect(25, 20, 0, 16)),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createCaretOptions();
      const caret = computeDomCaretPageLocal(options, 5);

      expect(caret).not.toBe(null);
      expect(caret).toMatchObject({
        pageIndex: 0,
        x: 25, // Caret x position
        y: 20, // Line top position
      });

      document.createRange = originalCreateRange;
    });

    it('uses element rect for non-text nodes', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <img data-pm-start="1" data-pm-end="2" />
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const imgEl = painterHost.querySelector('img') as HTMLElement;

      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      imgEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 100, 100));

      const options = createCaretOptions();
      const caret = computeDomCaretPageLocal(options, 1);

      expect(caret).not.toBe(null);
      expect(caret).toMatchObject({
        pageIndex: 0,
        x: 10,
        y: 20,
      });
    });
  });

  describe('index rebuild for disconnected elements', () => {
    it('rebuilds index when element is disconnected', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      // Get the element and mark it as disconnected
      const spanEl = painterHost.querySelector('span') as HTMLElement;
      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const lineEl = painterHost.querySelector('.superdoc-line') as HTMLElement;

      const originalIsConnected = Object.getOwnPropertyDescriptor(Node.prototype, 'isConnected');

      Object.defineProperty(spanEl, 'isConnected', {
        get: () => false,
        configurable: true,
      });

      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      lineEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 100, 16));
      spanEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 50, 16));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: vi.fn(() => createRect(25, 20, 0, 16)),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createCaretOptions();
      computeDomCaretPageLocal(options, 5);

      expect(rebuildDomPositionIndex).toHaveBeenCalled();

      // Restore original property
      if (originalIsConnected) {
        Object.defineProperty(spanEl, 'isConnected', originalIsConnected);
      }

      document.createRange = originalCreateRange;
    });

    it('rebuilds index when index is empty', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      // Don't rebuild index initially
      expect(domPositionIndex.size).toBe(0);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const lineEl = painterHost.querySelector('.superdoc-line') as HTMLElement;
      const spanEl = painterHost.querySelector('span') as HTMLElement;

      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      lineEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 100, 16));
      spanEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 50, 16));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: vi.fn(() => createRect(25, 20, 0, 16)),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createCaretOptions();
      computeDomCaretPageLocal(options, 5);

      expect(rebuildDomPositionIndex).toHaveBeenCalled();

      document.createRange = originalCreateRange;
    });
  });

  describe('edge cases - invalid inputs', () => {
    it('returns null when painterHost is null', () => {
      const options: ComputeDomCaretPageLocalOptions = {
        painterHost: null,
        domPositionIndex,
        rebuildDomPositionIndex,
        zoom: 1,
      };

      const caret = computeDomCaretPageLocal(options, 5);

      expect(caret).toBe(null);
    });

    it('returns null when no entry found for position', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const options = createCaretOptions();
      const caret = computeDomCaretPageLocal(options, 999);

      expect(caret).toBe(null);
    });

    it('returns null when element is not within a page', () => {
      painterHost.innerHTML = `
        <div class="superdoc-line">
          <span data-pm-start="1" data-pm-end="10">no page parent</span>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const options = createCaretOptions();
      const caret = computeDomCaretPageLocal(options, 5);

      expect(caret).toBe(null);
    });
  });

  describe('zoom handling', () => {
    it('correctly scales coordinates based on zoom level', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">text</span>
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const lineEl = painterHost.querySelector('.superdoc-line') as HTMLElement;
      const spanEl = painterHost.querySelector('span') as HTMLElement;

      // 2x zoom - all coordinates doubled
      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 1224, 1584));
      lineEl.getBoundingClientRect = vi.fn(() => createRect(20, 40, 200, 32));
      spanEl.getBoundingClientRect = vi.fn(() => createRect(20, 40, 100, 32));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: vi.fn(() => createRect(50, 40, 0, 32)),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createCaretOptions();
      options.zoom = 2;

      const caret = computeDomCaretPageLocal(options, 5);

      expect(caret).not.toBe(null);
      // Coordinates should be divided by zoom
      expect(caret).toMatchObject({
        x: 25, // 50 / 2
        y: 20, // 40 / 2
      });

      document.createRange = originalCreateRange;
    });
  });

  describe('text node character-level positioning', () => {
    it('maps PM position to character index within text node', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="0">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="6">hello</span>
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const lineEl = painterHost.querySelector('.superdoc-line') as HTMLElement;
      const spanEl = painterHost.querySelector('span') as HTMLElement;

      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      lineEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 100, 16));
      spanEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 50, 16));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: vi.fn(() => createRect(30, 20, 0, 16)),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createCaretOptions();
      const caret = computeDomCaretPageLocal(options, 3);

      expect(caret).not.toBe(null);
      // Should have called setStart with calculated char index
      expect(mockRange.setStart).toHaveBeenCalled();

      document.createRange = originalCreateRange;
    });
  });

  describe('page index extraction', () => {
    it('correctly extracts page index from data attribute', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page" data-page-index="5">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">page 5</span>
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const lineEl = painterHost.querySelector('.superdoc-line') as HTMLElement;
      const spanEl = painterHost.querySelector('span') as HTMLElement;

      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      lineEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 100, 16));
      spanEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 50, 16));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: vi.fn(() => createRect(25, 20, 0, 16)),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createCaretOptions();
      const caret = computeDomCaretPageLocal(options, 5);

      expect(caret).not.toBe(null);
      expect(caret!.pageIndex).toBe(5);

      document.createRange = originalCreateRange;
    });

    it('defaults to 0 when page index is missing', () => {
      painterHost.innerHTML = `
        <div class="superdoc-page">
          <div class="superdoc-line">
            <span data-pm-start="1" data-pm-end="10">no index</span>
          </div>
        </div>
      `;

      domPositionIndex.rebuild(painterHost);

      const pageEl = painterHost.querySelector('.superdoc-page') as HTMLElement;
      const lineEl = painterHost.querySelector('.superdoc-line') as HTMLElement;
      const spanEl = painterHost.querySelector('span') as HTMLElement;

      pageEl.getBoundingClientRect = vi.fn(() => createRect(0, 0, 612, 792));
      lineEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 100, 16));
      spanEl.getBoundingClientRect = vi.fn(() => createRect(10, 20, 50, 16));

      const mockRange = {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: vi.fn(() => createRect(25, 20, 0, 16)),
      } as unknown as Range;

      const originalCreateRange = document.createRange;
      document.createRange = vi.fn(() => mockRange);

      const options = createCaretOptions();
      const caret = computeDomCaretPageLocal(options, 5);

      expect(caret).not.toBe(null);
      expect(caret!.pageIndex).toBe(0);

      document.createRange = originalCreateRange;
    });
  });
});
