import { describe, it, expect } from 'vitest';
import { translator as marginBottomTranslator } from './marginBottom-translator.js';

describe('w:bottom margin translator (marginBottom)', () => {
  describe('encode', () => {
    it('extracts w:w and w:type attributes into an object', () => {
      const result = marginBottomTranslator.encode({ nodes: [{ attributes: { 'w:w': '120', 'w:type': 'dxa' } }] });
      expect(result).toEqual({ value: 120, type: 'dxa' });
    });

    it('handles missing w:type', () => {
      const result = marginBottomTranslator.encode({ nodes: [{ attributes: { 'w:w': '120' } }] });
      expect(result).toEqual({ value: 120 });
    });

    it('parses w:w as integer', () => {
      const result = marginBottomTranslator.encode({ nodes: [{ attributes: { 'w:w': '150.7' } }] });
      expect(result.value).toBe(150);
    });

    it('returns undefined if w:w is missing', () => {
      const result = marginBottomTranslator.encode({ nodes: [{ attributes: { 'w:type': 'dxa' } }] });
      expect(result).toBeUndefined();
    });
  });

  describe('decode', () => {
    it('creates a w:bottom element with w:w and w:type attributes', () => {
      const { attributes: result } = marginBottomTranslator.decode({
        node: { attrs: { marginBottom: { value: 140, type: 'pct' } } },
      });
      expect(result).toEqual({ 'w:w': '140', 'w:type': 'pct' });
    });

    it('handles missing type property', () => {
      const { attributes: result } = marginBottomTranslator.decode({
        node: { attrs: { marginBottom: { value: 140 } } },
      });
      expect(result).toEqual({ 'w:w': '140' });
    });

    it('returns undefined if marginBottom property is missing', () => {
      expect(marginBottomTranslator.decode({ node: { attrs: {} } })).toBeUndefined();
    });

    it('returns undefined if marginBottom.value is missing or not a number', () => {
      expect(marginBottomTranslator.decode({ node: { attrs: { marginBottom: { type: 'dxa' } } } })).toBeUndefined();
      expect(marginBottomTranslator.decode({ node: { attrs: { marginBottom: { value: null } } } })).toBeUndefined();
    });
  });

  describe('metadata', () => {
    it('has correct xmlName', () => {
      expect(marginBottomTranslator.xmlName).toBe('w:bottom');
    });

    it('has correct sdNodeOrKeyName', () => {
      expect(marginBottomTranslator.sdNodeOrKeyName).toBe('marginBottom');
    });
  });
});
