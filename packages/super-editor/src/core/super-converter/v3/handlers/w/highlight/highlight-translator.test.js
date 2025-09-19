import { describe, it, expect } from 'vitest';
import { config, translator } from './highlight-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:highlight translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:highlight');
    expect(config.sdNodeOrKeyName).toBe('highlight');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
    expect(config.attributes?.map((attr) => attr.xmlName)).toEqual(['w:val']);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:highlight');
    expect(translator.sdNodeOrKeyName).toBe('highlight');
  });

  it('prefers encoded value and defaults to null when missing', () => {
    const params = { nodes: [{ attributes: { 'w:val': 'yellow' } }] };
    const out = config.encode(params, { highlight: 'green' });
    expect(out).toEqual({
      type: 'attr',
      xmlName: 'w:highlight',
      sdNodeOrKeyName: 'highlight',
      attributes: { 'w:val': 'green' },
    });

    const missing = config.encode({ nodes: [{}] });
    expect(missing.attributes).toEqual({ 'w:val': null });
  });
});
