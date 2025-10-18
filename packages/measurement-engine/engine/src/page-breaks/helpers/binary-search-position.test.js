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

  it('returns the last fitting position when one exists', () => {
    const view = createMockView({
      coordsMap: new Map([
        [0, { bottom: 0 }],
        [1, { bottom: 40 }],
        [2, { bottom: 60 }],
        [3, { bottom: 80 }],
      ]),
    });
    const result = binarySearchPosition(view, 0, 3, 50);
    expect(result?.pos).toBe(1);
    expect(result?.coords.bottom).toBe(40);
  });

  it('skips invalid coordinates while searching', () => {
    const coordsMap = new Map([
      [2, { bottom: 40 }],
      [3, (count) => (count === 0 ? { bottom: NaN } : { bottom: 70 })],
      [4, { bottom: 60 }],
    ]);
    const view = createMockView({ coordsMap });
    const result = binarySearchPosition(view, 0, 5, 50);
    expect(result?.pos).toBe(2);
    expect(getCallCount(view, 3)).toBeGreaterThan(1);
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
});
