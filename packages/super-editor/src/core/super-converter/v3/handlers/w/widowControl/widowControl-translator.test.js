import { describe, it, expect } from 'vitest';
import { translator } from './widowControl-translator.js';

describe('w:widowControl translator', () => {
  describe('encode', () => {
    it('returns true for "1", "true", or missing w:val', () => {
      expect(translator.encode({ nodes: [{ attributes: { 'w:val': '1' } }] })).toBe(true);
      expect(translator.encode({ nodes: [{ attributes: { 'w:val': 'true' } }] })).toBe(true);
      expect(translator.encode({ nodes: [{ attributes: {} }] })).toBe(true); // defaults to '1'
    });

    it('returns false for other values', () => {
      expect(translator.encode({ nodes: [{ attributes: { 'w:val': '0' } }] })).toBe(false);
      expect(translator.encode({ nodes: [{ attributes: { 'w:val': 'false' } }] })).toBe(false);
      expect(translator.encode({ nodes: [{ attributes: { 'w:val': 'any other string' } }] })).toBe(false);
    });
  });

  describe('decode', () => {
    it('creates a w:widowControl element if widowControl is true', () => {
      const { attributes: result } = translator.decode({ node: { attrs: { widowControl: true } } });
      expect(result).toEqual({});
    });

    it('returns undefined if widowControl is false or missing', () => {
      expect(translator.decode({ node: { attrs: { widowControl: false } } })).toBeUndefined();
      expect(translator.decode({ node: { attrs: {} } })).toBeUndefined();
    });
  });

  it('has correct metadata', () => {
    expect(translator.xmlName).toBe('w:widowControl');
    expect(translator.sdNodeOrKeyName).toBe('widowControl');
  });
});
