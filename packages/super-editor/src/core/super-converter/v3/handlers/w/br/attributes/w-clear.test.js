import { describe, it, expect } from 'vitest';
import { wClearEncoder, wClearDecoder } from './w-clear.js';

describe('wClearEncoder', () => {
  it('returns the clear value when present', () => {
    expect(wClearEncoder({ 'w:clear': 'none' })).toBe('none');
    expect(wClearEncoder({ 'w:clear': 'left' })).toBe('left');
    expect(wClearEncoder({ 'w:clear': 'right' })).toBe('right');
    expect(wClearEncoder({ 'w:clear': 'all' })).toBe('all');
  });

  it('returns undefined when attribute is missing', () => {
    expect(wClearEncoder({})).toBeUndefined();
  });

  it('ignores unrelated attributes', () => {
    expect(wClearEncoder({ 'w:type': 'page' })).toBeUndefined();
  });
});

describe('wClearDecoder', () => {
  it('returns the clear value when present', () => {
    expect(wClearDecoder({ clear: 'none' })).toBe('none');
    expect(wClearDecoder({ clear: 'left' })).toBe('left');
    expect(wClearDecoder({ clear: 'right' })).toBe('right');
    expect(wClearDecoder({ clear: 'all' })).toBe('all');
  });

  it('returns undefined when clear is missing', () => {
    expect(wClearDecoder({})).toBeUndefined();
  });

  it('ignores unrelated attributes', () => {
    expect(wClearDecoder({ type: 'page' })).toBeUndefined();
  });
});

describe('round-trip consistency', () => {
  const values = ['none', 'left', 'right', 'all'];

  for (const val of values) {
    it(`encodes and decodes '${val}' consistently`, () => {
      const encoded = wClearEncoder({ 'w:clear': val });
      expect(encoded).toBe(val);

      const decoded = wClearDecoder({ clear: encoded });
      expect(decoded).toBe(val);
    });
  }
});
