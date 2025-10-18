import { describe, it, expect } from 'vitest';
import { clamp } from './clamp.js';

describe('clamp', () => {
  it('returns min when value is not finite', () => {
    expect(clamp(NaN, 5, 10)).toBe(5);
    expect(clamp(Infinity, 1, 2)).toBe(1);
  });

  it('clamps values within bounds', () => {
    expect(clamp(-10, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(20, 0, 10)).toBe(10);
  });
});
