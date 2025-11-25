import { describe, it, expect } from 'vitest';

import { config, translator } from './color-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:color translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:color');
    expect(config.sdNodeOrKeyName).toBe('color');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
    expect(config.attributes?.map((attr) => attr.xmlName)).toEqual([
      'w:val',
      'w:themeColor',
      'w:themeTint',
      'w:themeShade',
    ]);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:color');
    expect(translator.sdNodeOrKeyName).toBe('color');
  });

  describe('encode', () => {
    it('returns encoded attributes directly', () => {
      const out = config.encode({}, { color: '00FF00', themeColor: 'accent1' });
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:color',
        sdNodeOrKeyName: 'color',
        attributes: { 'w:val': '00FF00', 'w:themeColor': 'accent1' },
      });
    });

    it('returns empty attributes when nothing encoded', () => {
      const out = config.encode({ nodes: [{ attributes: {} }] });
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:color',
        sdNodeOrKeyName: 'color',
        attributes: { 'w:val': null },
      });
    });
  });
});
