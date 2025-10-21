import { describe, it, expect } from 'vitest';
import { __testing__ } from './tab.js';

const { mergeRanges } = __testing__;

describe('mergeRanges', () => {
  it('merges overlapping ranges', () => {
    const merged = mergeRanges([
      [2, 6],
      [4, 10],
      [12, 14],
    ]);

    expect(merged).toEqual([
      [2, 10],
      [12, 14],
    ]);
  });

  it('merges adjacent ranges', () => {
    const merged = mergeRanges([
      [0, 5],
      [5, 7],
      [8, 9],
    ]);

    expect(merged).toEqual([
      [0, 7],
      [8, 9],
    ]);
  });

  it('returns empty array for no ranges', () => {
    expect(mergeRanges([])).toEqual([]);
  });
});
