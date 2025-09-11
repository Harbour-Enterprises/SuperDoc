import { describe, it, expect } from 'vitest';

import { config, translator } from './b-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:b translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:b');
    expect(config.sdNodeOrKeyName).toBe('bold');
    expect(typeof config.encode).toBe('function');
    // attribute translators generally omit decode
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:b');
    expect(translator.sdNodeOrKeyName).toBe('bold');
  });

  describe('encode', () => {
    it('encodes with provided w:val as-is', () => {
      const params = { nodes: [{ attributes: { 'w:val': '1' } }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:b',
        sdNodeOrKeyName: 'bold',
        attributes: { 'w:val': '1' },
      });
    });

    it('encodes with w:val set to null when missing', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:b',
        sdNodeOrKeyName: 'bold',
        attributes: { 'w:val': null },
      });
    });

    it('coalesces falsy values to null (per current implementation)', () => {
      const params = { nodes: [{ attributes: { 'w:val': false } }] };
      const out = config.encode(params);
      expect(out.attributes['w:val']).toBeNull();
    });
  });
});
