import { describe, it, expect } from 'vitest';
import { config, translator } from './highlight-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:highlight translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:highlight');
    expect(config.sdNodeOrKeyName).toBe('highlight');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:highlight');
    expect(translator.sdNodeOrKeyName).toBe('highlight');
  });

  it('preserves attributes', () => {
    const params = { nodes: [{ attributes: { 'w:val': 'yellow' } }] };
    const out = config.encode(params);
    expect(out).toEqual({
      type: 'attr',
      xmlName: 'w:highlight',
      sdNodeOrKeyName: 'highlight',
      attributes: { 'w:val': 'yellow' },
    });
  });

  it('decodes node attrs color to <w:shd> and skips negations', () => {
    const on = config.decode({ node: { attrs: { color: '#FFFF00' } } });
    expect(on).toEqual({ name: 'w:shd', attributes: { 'w:fill': 'FFFF00', 'w:color': 'auto', 'w:val': 'clear' } });
    expect(config.decode({ node: { attrs: { color: 'inherit' } } })).toBeUndefined();
    expect(config.decode({ node: { attrs: { color: 'transparent' } } })).toBeUndefined();
  });
});
