import { describe, it, expect } from 'vitest';
import { translator } from './autoSpaceDE-translator.js';

describe('w:autoSpaceDE translator', () => {
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
    it('creates a w:autoSpaceDE element if autoSpaceDE is true', () => {
      const { attributes: result } = translator.decode({ node: { attrs: { autoSpaceDE: true } } });
      expect(result).toEqual({});
    });

    it('returns undefined if autoSpaceDE is false or missing', () => {
      expect(translator.decode({ node: { attrs: { autoSpaceDE: false } } })).toBeUndefined();
      expect(translator.decode({ node: { attrs: {} } })).toBeUndefined();
    });
  });

  it('has correct metadata', () => {
    expect(translator.xmlName).toBe('w:autoSpaceDE');
    expect(translator.sdNodeOrKeyName).toBe('autoSpaceDE');
  });
});
