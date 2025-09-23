import { describe, it, expect } from 'vitest';
import { translator } from './jc-translator.js';

describe('w:jc translator', () => {
  describe('encode', () => {
    it('extracts the w:val attribute', () => {
      const result = translator.encode({ nodes: [{ attributes: { 'w:val': 'center' } }] });
      expect(result).toBe('center');
    });

    it('returns undefined if w:val is missing', () => {
      const result = translator.encode({ nodes: [{ attributes: {} }] });
      expect(result).toBeUndefined();
    });
  });

  describe('decode', () => {
    it('creates a w:jc element with the value in w:val', () => {
      const { attributes: result } = translator.decode({ node: { attrs: { justification: 'right' } } });
      expect(result).toEqual({ 'w:val': 'right' });
    });

    it('returns undefined if jc property is missing', () => {
      const result = translator.decode({ node: { attrs: {} } });
      expect(result).toBeUndefined();
    });
  });

  it('has correct metadata', () => {
    expect(translator.xmlName).toBe('w:jc');
    expect(translator.sdNodeOrKeyName).toBe('justification');
  });
});
