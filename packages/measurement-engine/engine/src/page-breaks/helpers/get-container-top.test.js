import { describe, it, expect } from 'vitest';
import { getContainerTop } from './get-container-top.js';

describe('getContainerTop', () => {
  it('returns 0 when dom is missing or rect is invalid', () => {
    expect(getContainerTop(null)).toBe(0);
    expect(getContainerTop({ dom: {} })).toBe(0);
    const view = { dom: { getBoundingClientRect: () => ({ top: Infinity }) } };
    expect(getContainerTop(view)).toBe(0);
  });

  it('returns top position when available', () => {
    const view = { dom: { getBoundingClientRect: () => ({ top: 42 }) } };
    expect(getContainerTop(view)).toBe(42);
  });
});
