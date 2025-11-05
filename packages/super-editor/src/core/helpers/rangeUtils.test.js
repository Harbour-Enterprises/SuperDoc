import { describe, it, expect } from 'vitest';
import { mergeRanges, clampRange } from './rangeUtils.js';

describe('mergeRanges', () => {
  it('returns empty array for empty input', () => {
    expect(mergeRanges([])).toEqual([]);
  });

  it('returns single range unchanged', () => {
    expect(mergeRanges([[1, 5]])).toEqual([[1, 5]]);
  });

  it('merges overlapping ranges', () => {
    expect(
      mergeRanges([
        [1, 5],
        [3, 8],
      ]),
    ).toEqual([[1, 8]]);
  });

  it('merges adjacent ranges', () => {
    expect(
      mergeRanges([
        [1, 5],
        [5, 10],
      ]),
    ).toEqual([[1, 10]]);
  });

  it('keeps non-overlapping ranges separate', () => {
    expect(
      mergeRanges([
        [1, 3],
        [5, 8],
        [10, 15],
      ]),
    ).toEqual([
      [1, 3],
      [5, 8],
      [10, 15],
    ]);
  });

  it('handles multiple overlapping ranges', () => {
    expect(
      mergeRanges([
        [1, 5],
        [3, 8],
        [7, 12],
      ]),
    ).toEqual([[1, 12]]);
  });

  it('sorts ranges before merging', () => {
    expect(
      mergeRanges([
        [10, 15],
        [1, 5],
        [3, 8],
      ]),
    ).toEqual([
      [1, 8],
      [10, 15],
    ]);
  });

  it('merges ranges when one is contained within another', () => {
    expect(
      mergeRanges([
        [1, 10],
        [3, 5],
      ]),
    ).toEqual([[1, 10]]);
  });

  it('handles ranges that end at the same position', () => {
    expect(
      mergeRanges([
        [1, 5],
        [3, 5],
      ]),
    ).toEqual([[1, 5]]);
  });

  it('handles ranges that start at the same position', () => {
    expect(
      mergeRanges([
        [1, 5],
        [1, 8],
      ]),
    ).toEqual([[1, 8]]);
  });

  it('merges complex mix of overlapping and non-overlapping ranges', () => {
    expect(
      mergeRanges([
        [1, 3],
        [2, 6],
        [8, 10],
        [9, 12],
        [15, 18],
      ]),
    ).toEqual([
      [1, 6],
      [8, 12],
      [15, 18],
    ]);
  });

  it('handles ranges with zero length (point ranges)', () => {
    expect(
      mergeRanges([
        [5, 5],
        [5, 10],
      ]),
    ).toEqual([[5, 10]]);
  });

  it('handles unsorted ranges with duplicates', () => {
    expect(
      mergeRanges([
        [5, 10],
        [1, 3],
        [5, 10],
        [2, 4],
      ]),
    ).toEqual([
      [1, 4],
      [5, 10],
    ]);
  });

  it('does not mutate original array', () => {
    const original = [
      [5, 10],
      [1, 3],
    ];
    const copy = JSON.parse(JSON.stringify(original));
    mergeRanges(original);
    expect(original).toEqual(copy);
  });

  it('handles large numbers', () => {
    expect(
      mergeRanges([
        [1000000, 2000000],
        [1500000, 2500000],
      ]),
    ).toEqual([[1000000, 2500000]]);
  });

  it('handles many small ranges that merge into one', () => {
    const ranges = [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ];
    expect(mergeRanges(ranges)).toEqual([[1, 6]]);
  });

  it('handles ranges in reverse order', () => {
    expect(
      mergeRanges([
        [10, 15],
        [5, 8],
        [1, 3],
      ]),
    ).toEqual([
      [1, 3],
      [5, 8],
      [10, 15],
    ]);
  });

  it('handles ranges that touch but do not overlap', () => {
    expect(
      mergeRanges([
        [1, 4],
        [5, 8],
      ]),
    ).toEqual([
      [1, 4],
      [5, 8],
    ]);
  });
});

describe('clampRange', () => {
  it('returns range unchanged when within bounds', () => {
    expect(clampRange(10, 20, 100)).toEqual([10, 20]);
  });

  it('clamps start to 0 when negative', () => {
    expect(clampRange(-5, 20, 100)).toEqual([0, 20]);
  });

  it('clamps end to docSize when exceeding', () => {
    expect(clampRange(10, 150, 100)).toEqual([10, 100]);
  });

  it('clamps both when out of bounds', () => {
    expect(clampRange(-10, 150, 100)).toEqual([0, 100]);
  });

  it('returns null for invalid range (start >= end)', () => {
    expect(clampRange(50, 50, 100)).toBeNull();
  });

  it('returns null when start > end after clamping', () => {
    expect(clampRange(150, 200, 100)).toBeNull();
  });

  it('handles range at document boundaries', () => {
    expect(clampRange(0, 100, 100)).toEqual([0, 100]);
  });

  it('handles single position range', () => {
    expect(clampRange(50, 51, 100)).toEqual([50, 51]);
  });

  it('returns null for negative docSize edge case', () => {
    expect(clampRange(10, 20, 0)).toBeNull();
  });

  it('handles very large numbers', () => {
    expect(clampRange(1000000, 2000000, 1500000)).toEqual([1000000, 1500000]);
  });
});
