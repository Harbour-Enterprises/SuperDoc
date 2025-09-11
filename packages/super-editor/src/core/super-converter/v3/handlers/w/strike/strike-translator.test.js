import { describe, it, expect } from 'vitest';

import { config, translator } from './strike-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:strike translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:strike');
    expect(config.sdNodeOrKeyName).toBe('strike');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:strike');
    expect(translator.sdNodeOrKeyName).toBe('strike');
  });

  describe('encode', () => {
    it('encodes with provided w:val as-is', () => {
      const params = { nodes: [{ attributes: { 'w:val': '1' } }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:strike',
        sdNodeOrKeyName: 'strike',
        attributes: { 'w:val': '1' },
      });
    });

    it('encodes with w:val set to null when missing', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:strike',
        sdNodeOrKeyName: 'strike',
        attributes: { 'w:val': null },
      });
    });
  });
});
