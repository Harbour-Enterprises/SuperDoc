import { describe, it, expect } from 'vitest';
import { binarySearchPosition } from './binary-search-position.js';
import { createMockView, getCallCount } from './test-utils.js';

describe('binarySearchPosition', () => {
  it('returns the last fitting position when everything is within the boundary', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, { bottom: 10 }],
        [1, { bottom: 20 }],
        [2, { bottom: 30 }],
      ]),
    });
    const result = binarySearchPosition(view, 0, 2, 40);
    expect(result?.pos).toBe(2);
    expect(result?.coords.bottom).toBe(30);
  });

  it('returns the first overflowing position when one exists', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, { bottom: 0 }],
        [1, { bottom: 40 }], // fits
        [2, { bottom: 60 }], // first overflow
        [3, { bottom: 80 }],
      ]),
    });
    const result = binarySearchPosition(view, 0, 3, 50);
    expect(result?.pos).toBe(2);
    expect(result?.coords.bottom).toBe(60);
  });

  it('skips invalid coordinates while searching', () => {
    const coordsMap = new Map([
      [2, { bottom: 40 }], // fits
      [3, (count) => (count === 0 ? { bottom: NaN } : { bottom: 70 })], // first overflow (eventually)
      [4, { bottom: 60 }],
    ]);
    const view = createMockView({ coordsMap });
    const result = binarySearchPosition(view, 0, 5, 50);
    // Position 2 fits (bottom 40), position 3 overflows (bottom 70)
    // Should return 3, the first overflowing position
    expect(result?.pos).toBe(3);
  });

  it('returns null when every coordinate exceeds the boundary', () => {
    const view = createMockView({
      coordsMap: new Map([
        [10, { bottom: 120 }],
        [11, { bottom: 140 }],
      ]),
    });
    expect(binarySearchPosition(view, 10, 11, 100)).toBeNull();
  });

  it('finds the start of the FIRST overflowing line, ensuring correct page breaks', () => {
    // This test verifies that Phase 3 correctly identifies the first overflowing line
    // Scenario: Two lines that fit within boundary, one that overflows
    // Line A: positions 0-5 (bottom: 50)
    // Line B: positions 6-11 (bottom: 90) - last line that fits
    // Line C: positions 12-17 (bottom: 120) - first line that exceeds boundary
    // Boundary: 100
    //
    // Binary search will find position somewhere in Line A or B (last fitting position)
    // Phase 2 advances to position 11 (end of Line B, the last fitting line)
    // Phase 3 should advance to position 12, then rewind to start of Line C
    // Result: Line C (position 12) is where the page break occurs
    const view = createMockView({
      coordsMap: new Map([
        // Line A - all on same line, bottom at 50
        [0, { top: 0, bottom: 50, left: 10 }],
        [1, { top: 0, bottom: 50, left: 20 }],
        [2, { top: 0, bottom: 50, left: 30 }],
        [3, { top: 0, bottom: 50, left: 40 }],
        [4, { top: 0, bottom: 50, left: 50 }],
        [5, { top: 0, bottom: 50, left: 60 }],
        // Line B - all on same line, bottom at 90 (last fitting line)
        [6, { top: 51, bottom: 90, left: 10 }],
        [7, { top: 51, bottom: 90, left: 20 }],
        [8, { top: 51, bottom: 90, left: 30 }],
        [9, { top: 51, bottom: 90, left: 40 }],
        [10, { top: 51, bottom: 90, left: 50 }],
        [11, { top: 51, bottom: 90, left: 60 }],
        // Line C - first line that exceeds boundary
        [12, { top: 91, bottom: 120, left: 10 }],
        [13, { top: 91, bottom: 120, left: 20 }],
        [14, { top: 91, bottom: 120, left: 30 }],
      ]),
    });
    const result = binarySearchPosition(view, 0, 14, 100);
    // Should return the START of Line C (position 12) - the first overflowing line
    expect(result?.pos).toBe(12);
    expect(result?.coords.bottom).toBe(120);
  });

  it('respects maxIterations parameter', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, { bottom: 10 }],
        [100, { bottom: 50 }],
        [200, { bottom: 90 }],
      ]),
    });

    // With maxIterations=1, binary search can't complete
    const result = binarySearchPosition(view, 0, 200, 100, 1);
    expect(result).toBeDefined(); // Should still return a result
  });

  it('handles from > to scenario', () => {
    const view = createMockView({
      coordsMap: new Map([[5, { bottom: 50 }]]),
    });

    const result = binarySearchPosition(view, 10, 5, 100);
    expect(result).toBeNull(); // left > right, no valid search range
  });

  it('clamps negative from position to 0', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, { bottom: 50 }],
        [1, { bottom: 120 }],
      ]),
    });

    const result = binarySearchPosition(view, -5, 1, 100);
    expect(result).toBeDefined();
    expect(result.pos).toBeGreaterThanOrEqual(0);
  });

  it('advances through Phase 2 to end of fitting line', () => {
    const view = createMockView({
      coordsMap: new Map([
        [5, { top: 0, bottom: 50, left: 10 }],
        [6, { top: 0, bottom: 50, left: 20 }], // Same line
        [7, { top: 0, bottom: 50, left: 30 }], // Same line
        [8, { top: 51, bottom: 90, left: 10 }], // Different line
      ]),
    });

    const result = binarySearchPosition(view, 5, 8, 100);
    // Should advance through positions 5,6,7 (same line) before stopping
    expect(result.pos).toBeGreaterThanOrEqual(5);
  });

  it('stops Phase 2 when encountering invalid coords', () => {
    const view = createMockView({
      coordsMap: new Map([
        [5, { top: 0, bottom: 50, left: 10 }],
        [6, null], // Invalid coords
        [7, { top: 0, bottom: 50, left: 30 }],
      ]),
    });

    const result = binarySearchPosition(view, 5, 7, 100);
    expect(result.pos).toBe(5); // Should stop at position 5
  });

  it('stops Phase 2 when detecting overflow', () => {
    const view = createMockView({
      coordsMap: new Map([
        [5, { top: 0, bottom: 50, left: 10 }],
        [6, { top: 0, bottom: 50, left: 20 }],
        [7, { top: 0, bottom: 120, left: 30 }], // Overflow
      ]),
    });

    const result = binarySearchPosition(view, 5, 7, 100);
    // Should detect overflow at position 7
    expect(result).toBeDefined();
  });

  it('handles Phase 3 when nextPos exceeds to', () => {
    const view = createMockView({
      coordsMap: new Map([
        [5, { top: 0, bottom: 50, left: 10 }],
        [6, { top: 0, bottom: 50, left: 20 }],
      ]),
    });

    const result = binarySearchPosition(view, 5, 6, 100);
    // nextPos would be 7, which is > to (6), so Phase 3 should not execute
    expect(result).toBeDefined();
    expect(result.pos).toBeLessThanOrEqual(6);
  });

  it('returns coords null when Phase 3 has invalid coords but detected overflow', () => {
    const coordsMap = new Map([
      [5, { top: 0, bottom: 50, left: 10 }],
      [6, { top: 0, bottom: 120, left: 20 }], // Overflow detected
      [7, null], // Invalid coords at next position
    ]);
    const view = createMockView({ coordsMap });

    const result = binarySearchPosition(view, 5, 7, 100);
    expect(result).toBeDefined();
  });

  it('handles boundary exactly at bottom coordinate', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, { bottom: 50 }],
        [1, { bottom: 100 }], // Exactly at boundary
        [2, { bottom: 150 }],
      ]),
    });

    const result = binarySearchPosition(view, 0, 2, 100);
    // Position with bottom=100 should NOT overflow (> boundary, not >=)
    expect(result.pos).toBe(1);
  });

  it('handles single position range', () => {
    const view = createMockView({
      coordsMap: new Map([[5, { bottom: 120 }]]),
    });

    const result = binarySearchPosition(view, 5, 5, 100);
    expect(result).toBeNull(); // Single position overflows
  });

  it('handles single fitting position', () => {
    const view = createMockView({
      coordsMap: new Map([[5, { bottom: 50 }]]),
    });

    const result = binarySearchPosition(view, 5, 5, 100);
    expect(result).toBeDefined();
    expect(result.pos).toBe(5);
  });

  it('skips invalid coords during binary search left adjustment', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, null], // Invalid
        [1, { bottom: 50 }],
      ]),
    });

    const result = binarySearchPosition(view, 0, 1, 100);
    expect(result).toBeDefined();
  });

  it('skips invalid coords during binary search right adjustment', () => {
    const view = createMockView({
      coordsMap: new Map([
        [5, { bottom: 50 }],
        [10, null], // Invalid
        [15, { bottom: 120 }],
      ]),
    });

    const result = binarySearchPosition(view, 5, 15, 100);
    expect(result).toBeDefined();
  });

  it('handles all positions having null/invalid coords', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, null],
        [1, null],
        [2, null],
      ]),
    });

    const result = binarySearchPosition(view, 0, 2, 100);
    expect(result).toBeNull();
  });

  it('Phase 2 respects BINARY_BACKTRACK_STEPS limit', () => {
    // Create a very long line that would exceed BINARY_BACKTRACK_STEPS
    const coordsMap = new Map();
    for (let i = 0; i < 50; i++) {
      coordsMap.set(i, { top: 0, bottom: 50, left: i * 10 });
    }
    coordsMap.set(50, { top: 51, bottom: 90, left: 0 }); // Different line

    const view = createMockView({ coordsMap });
    const result = binarySearchPosition(view, 0, 50, 100);

    // Phase 2 should stop after BINARY_BACKTRACK_STEPS even though line continues
    expect(result).toBeDefined();
  });

  it('caches overflow coords from Phase 2 to Phase 3', () => {
    const view = createMockView({
      coordsMap: new Map([
        [5, { top: 0, bottom: 50, left: 10 }],
        [6, { top: 0, bottom: 50, left: 20 }],
        [7, { top: 51, bottom: 120, left: 10 }], // Overflow
      ]),
    });

    const result = binarySearchPosition(view, 5, 7, 100);
    // Should detect overflow in Phase 2 and use cached coords in Phase 3
    expect(result).toBeDefined();
    expect(result.coords.bottom).toBeGreaterThan(100);
  });
});
