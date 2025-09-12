import { describe, it, expect } from 'vitest';

import { config, translator } from './u-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:u translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:u');
    expect(config.sdNodeOrKeyName).toBe('underline');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:u');
    expect(translator.sdNodeOrKeyName).toBe('underline');
  });

  describe('encode', () => {
    it('encodes with provided w:val as-is', () => {
      const params = { nodes: [{ attributes: { 'w:val': 'single' } }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:u',
        sdNodeOrKeyName: 'underline',
        attributes: { 'w:val': 'single' },
      });
    });

    it('encodes with w:val set to null when missing', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:u',
        sdNodeOrKeyName: 'underline',
        attributes: { 'w:val': null },
      });
    });
  });
});
