import { describe, it, expect } from 'vitest';
import { lineBreakTypeEncoder, lineBreakTypeDecoder } from './w-line-break-type.js';

describe('lineBreakTypeEncoder', () => {
  it('returns the type value when present', () => {
    expect(lineBreakTypeEncoder({ 'w:type': 'textWrapping' })).toBe('textWrapping');
    expect(lineBreakTypeEncoder({ 'w:type': 'page' })).toBe('page');
    expect(lineBreakTypeEncoder({ 'w:type': 'column' })).toBe('column');
    expect(lineBreakTypeEncoder({ 'w:type': 'line' })).toBe('line');
  });

  it('returns undefined when attribute is missing', () => {
    expect(lineBreakTypeEncoder({})).toBeUndefined();
  });

  it('ignores unrelated attributes', () => {
    expect(lineBreakTypeEncoder({ 'w:clear': 'all' })).toBeUndefined();
  });
});

describe('lineBreakTypeDecoder', () => {
  it('returns the lineBreakType value when present', () => {
    expect(lineBreakTypeDecoder({ lineBreakType: 'textWrapping' })).toBe('textWrapping');
    expect(lineBreakTypeDecoder({ lineBreakType: 'page' })).toBe('page');
    expect(lineBreakTypeDecoder({ lineBreakType: 'column' })).toBe('column');
    expect(lineBreakTypeDecoder({ lineBreakType: 'line' })).toBe('line');
  });

  it('returns undefined when lineBreakType is missing', () => {
    expect(lineBreakTypeDecoder({})).toBeUndefined();
  });

  it('ignores unrelated attributes', () => {
    expect(lineBreakTypeDecoder({ clear: 'left' })).toBeUndefined();
  });
});

describe('round-trip consistency', () => {
  const values = ['textWrapping', 'page', 'column', 'line'];

  for (const val of values) {
    it(`encodes and decodes '${val}' consistently`, () => {
      const encoded = lineBreakTypeEncoder({ 'w:type': val });
      expect(encoded).toBe(val);

      const decoded = lineBreakTypeDecoder({ lineBreakType: encoded });
      expect(decoded).toBe(val);
    });
  }
});
