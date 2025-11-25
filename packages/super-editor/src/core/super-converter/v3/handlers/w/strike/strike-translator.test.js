import { describe, it, expect } from 'vitest';

import { config, translator } from './strike-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:strike translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:strike');
    expect(config.sdNodeOrKeyName).toBe('strike');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
    expect(config.attributes?.map((attr) => attr.xmlName)).toEqual(['w:val']);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:strike');
    expect(translator.sdNodeOrKeyName).toBe('strike');
  });

  describe('encode', () => {
    it('normalizes boolean attributes', () => {
      const params = { nodes: [{ attributes: { 'w:val': '0' } }] };
      const outFalse = config.encode(params, { strike: false });
      expect(outFalse.attributes).toEqual({ 'w:val': '0' });

      const outTrue = config.encode({ nodes: [{ attributes: { 'w:val': '0' } }] }, { strike: true });
      expect(outTrue.attributes).toEqual({});

      const fallback = config.encode({ nodes: [{ attributes: {} }] });
      expect(fallback.attributes).toEqual({ 'w:val': null });
    });
  });
});
