import { describe, it, expect } from 'vitest';
import { normalizeBreakResult } from './normalize-break-result.js';

describe('normalizeBreakResult', () => {
  it('returns empty structure when break point missing', () => {
    expect(normalizeBreakResult(null, 0)).toEqual({ primary: null, rows: null });
  });

  it('normalizes primary and filters invalid rows', () => {
    const result = normalizeBreakResult(
      {
        primary: { pos: 1, top: 100, bottom: 110 },
        all: [{ pos: 1, top: 100, bottom: 110 }, null, { pos: 2, top: 140, bottom: 160 }],
      },
      100,
    );

    expect(result).toEqual({
      primary: { pos: 1, top: 0, bottom: 10 },
      rows: [
        { pos: 1, top: 0, bottom: 10 },
        { pos: 2, top: 40, bottom: 60 },
      ],
    });
  });

  it('supports legacy object without primary key', () => {
    expect(normalizeBreakResult({ pos: 3, top: 10, bottom: 20 }, 5)).toEqual({
      primary: { pos: 3, top: 5, bottom: 15 },
      rows: null,
    });
  });
});
