import { describe, it, expect } from 'vitest';

import { config, translator } from './i-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:i translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:i');
    expect(config.sdNodeOrKeyName).toBe('italic');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
    expect(config.attributes).toBeUndefined();
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:i');
    expect(translator.sdNodeOrKeyName).toBe('italic');
  });

  describe('encode', () => {
    it('copies existing w:val', () => {
      const params = { nodes: [{ attributes: { 'w:val': '0' } }] };
      const out = config.encode(params);
      expect(out.attributes).toEqual({ 'w:val': '0' });
    });

    it('defaults w:val to null when missing', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params);
      expect(out.attributes).toEqual({ 'w:val': null });
    });
  });
});
