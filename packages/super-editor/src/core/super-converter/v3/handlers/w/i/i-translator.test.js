import { describe, it, expect } from 'vitest';

import { config, translator } from './i-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:i translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:i');
    expect(config.sdNodeOrKeyName).toBe('italic');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:i');
    expect(translator.sdNodeOrKeyName).toBe('italic');
  });

  describe('encode', () => {
    it('encodes with provided w:val as-is', () => {
      const params = { nodes: [{ attributes: { 'w:val': '1' } }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:i',
        sdNodeOrKeyName: 'italic',
        attributes: { 'w:val': '1' },
      });
    });

    it('encodes presence-only as {} (presence => on)', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:i',
        sdNodeOrKeyName: 'italic',
        attributes: {},
      });
    });
  });
});
