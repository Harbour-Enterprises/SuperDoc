import { describe, it, expect } from 'vitest';
import { normalizeVerticalBounds } from './normalize-vertical-bounds.js';

describe('normalizeVerticalBounds', () => {
  it('returns normalized value for finite inputs', () => {
    expect(normalizeVerticalBounds(120, 20)).toBe(100);
  });

  it('returns input when value is not finite', () => {
    expect(normalizeVerticalBounds(Infinity, 5)).toBe(Infinity);
  });
});
