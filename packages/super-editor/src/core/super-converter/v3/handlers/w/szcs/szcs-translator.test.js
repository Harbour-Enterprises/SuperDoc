import { describe, it, expect } from 'vitest';
import { config, translator } from './szcs-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:szCs translator (attribute)', () => {
  it('exposes config metadata and attribute handlers', () => {
    expect(config.xmlName).toBe('w:szCs');
    expect(config.sdNodeOrKeyName).toBe('fontSizeCs');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(config.attributes?.map((attr) => attr.xmlName)).toEqual(['w:val']);
  });

  it('encodes complex script font size with override and fallback', () => {
    const out = config.encode({ nodes: [{ attributes: { 'w:val': '36' } }] }, { fontSizeCs: '48' });
    expect(out).toEqual({
      type: 'attr',
      xmlName: 'w:szCs',
      sdNodeOrKeyName: 'fontSizeCs',
      attributes: { 'w:val': '48' },
    });

    const fallback = config.encode({ nodes: [{}] });
    expect(fallback.attributes).toEqual({ 'w:val': null });
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
  });
});
