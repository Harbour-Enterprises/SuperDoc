import { describe, it, expect } from 'vitest';
import { translator } from './contextualSpacing-translator.js';

describe('w:contextualSpacing translator', () => {
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
    it('creates a w:contextualSpacing element if contextualSpacing is true', () => {
      const { attributes: result } = translator.decode({ node: { attrs: { contextualSpacing: true } } });
      expect(result).toEqual({});
    });

    it('returns undefined if contextualSpacing is false or missing', () => {
      expect(translator.decode({ node: { attrs: { contextualSpacing: false } } })).toBeUndefined();
      expect(translator.decode({ node: { attrs: {} } })).toBeUndefined();
    });
  });

  it('has correct metadata', () => {
    expect(translator.xmlName).toBe('w:contextualSpacing');
    expect(translator.sdNodeOrKeyName).toBe('contextualSpacing');
  });
});
