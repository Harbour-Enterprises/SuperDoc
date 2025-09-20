import { describe, it, expect } from 'vitest';
import { config, translator } from './rstyle-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:rStyle translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:rStyle');
    expect(config.sdNodeOrKeyName).toBe('styleId');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
    expect(config.attributes?.map((attr) => attr.xmlName)).toEqual(['w:val']);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:rStyle');
    expect(translator.sdNodeOrKeyName).toBe('styleId');
  });

  it('prefers encoded styleId and defaults to null', () => {
    const node = { name: 'w:rStyle', attributes: { 'w:val': 'Emphasis' } };
    const out = config.encode({ nodes: [node] }, { styleId: 'Strong' });
    expect(out).toEqual({
      type: 'attr',
      xmlName: 'w:rStyle',
      sdNodeOrKeyName: 'styleId',
      attributes: { 'w:val': 'Strong' },
    });

    const fallback = config.encode({ nodes: [{}] });
    expect(fallback.attributes).toEqual({ 'w:val': null });
  });
});
