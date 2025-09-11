import { describe, it, expect } from 'vitest';

import { config, translator } from './color-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:color translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:color');
    expect(config.sdNodeOrKeyName).toBe('color');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:color');
    expect(translator.sdNodeOrKeyName).toBe('color');
  });

  describe('encode', () => {
    it('encodes with provided w:val as-is', () => {
      const params = { nodes: [{ attributes: { 'w:val': 'FF0000' } }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:color',
        sdNodeOrKeyName: 'color',
        attributes: { 'w:val': 'FF0000' },
      });
    });

    it('encodes with w:val set to null when missing', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:color',
        sdNodeOrKeyName: 'color',
        attributes: { 'w:val': null },
      });
    });
  });
});
