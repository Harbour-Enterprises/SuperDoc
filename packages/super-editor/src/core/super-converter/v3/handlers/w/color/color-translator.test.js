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

  describe('encode/decode', () => {
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

    it('encodes presence-only as {} (no value)', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params);
      expect(out).toEqual({ type: 'attr', xmlName: 'w:color', sdNodeOrKeyName: 'color', attributes: {} });
    });

    it('decodes color attr to <w:color> and skips inherit/transparent', () => {
      const on = config.decode({ node: { attrs: { color: '#FF0000' } } });
      expect(on).toEqual({ name: 'w:color', attributes: { 'w:val': 'FF0000' } });
      const skip1 = config.decode({ node: { attrs: { color: 'inherit' } } });
      const skip2 = config.decode({ node: { attrs: { color: 'transparent' } } });
      expect(skip1).toBeUndefined();
      expect(skip2).toBeUndefined();
    });
  });
});
