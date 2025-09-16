import { describe, it, expect } from 'vitest';
import { config, translator } from './rStyle-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:rStyle translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:rStyle');
    expect(config.sdNodeOrKeyName).toBe('styleId');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:rStyle');
    expect(translator.sdNodeOrKeyName).toBe('styleId');
  });

  it('encodes attributes from the node', () => {
    const node = { name: 'w:rStyle', attributes: { 'w:val': 'Emphasis' } };
    const out = config.encode({ nodes: [node] });
    expect(out).toEqual({
      type: 'attr',
      xmlName: 'w:rStyle',
      sdNodeOrKeyName: 'styleId',
      attributes: { 'w:val': 'Emphasis' },
    });
  });

  it('decodes styleId to <w:rStyle>', () => {
    const out = config.decode({ node: { attrs: { styleId: 'Strong' } } });
    expect(out).toEqual({ name: 'w:rStyle', attributes: { 'w:val': 'Strong' } });
  });
});
