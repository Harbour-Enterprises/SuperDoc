import { describe, it, expect } from 'vitest';

import { config, translator } from './i-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:i translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:i');
    expect(config.sdNodeOrKeyName).toBe('italic');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
    expect(config.attributes?.map((attr) => attr.xmlName)).toEqual(['w:val']);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:i');
    expect(translator.sdNodeOrKeyName).toBe('italic');
  });

  describe('encode', () => {
    it('normalizes boolean attributes', () => {
      const params = { nodes: [{ attributes: { 'w:val': '0' } }] };
      const outFalse = config.encode(params, { italic: false });
      expect(outFalse.attributes).toEqual({ 'w:val': '0' });

      const outTrue = config.encode({ nodes: [{ attributes: { 'w:val': '0' } }] }, { italic: true });
      expect(outTrue.attributes).toEqual({});

      const fallback = config.encode({ nodes: [{ attributes: {} }] });
      expect(fallback.attributes).toEqual({ 'w:val': null });
    });
  });
});
