import { describe, it, expect } from 'vitest';
import { translator } from './hidden-translator.js';

describe('w:hidden translator', () => {
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
    it('creates a w:hidden element if hidden is true', () => {
      const { attributes: result } = translator.decode({ node: { attrs: { hidden: true } } });
      expect(result).toEqual({});
    });

    it('returns undefined if hidden is false or missing', () => {
      expect(translator.decode({ node: { attrs: { hidden: false } } })).toBeUndefined();
      expect(translator.decode({ node: { attrs: {} } })).toBeUndefined();
    });
  });

  it('has correct metadata', () => {
    expect(translator.xmlName).toBe('w:hidden');
    expect(translator.sdNodeOrKeyName).toBe('hidden');
  });
});
