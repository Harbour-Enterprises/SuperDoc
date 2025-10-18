import { describe, it, expect } from 'vitest';
import { normalizeBreakEntry } from './normalize-break-entry.js';

describe('normalizeBreakEntry', () => {
  it('returns null when entry is missing', () => {
    expect(normalizeBreakEntry(null, 0)).toBeNull();
  });

  it('normalizes top and bottom relative to offset', () => {
    const entry = { pos: 4, top: 120, bottom: 150 };
    expect(normalizeBreakEntry(entry, 100)).toEqual({ pos: 4, top: 20, bottom: 50 });
  });
});
