import { describe, it, expect } from 'vitest';
import { config, translator } from './sz-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:sz translator (attribute)', () => {
  it('exposes config metadata and attribute handlers', () => {
    expect(config.xmlName).toBe('w:sz');
    expect(config.sdNodeOrKeyName).toBe('fontSize');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(config.attributes?.map((attr) => attr.xmlName)).toEqual(['w:val']);
  });

  it('encodes font size with encoded overrides and null fallback', () => {
    const out = config.encode({ nodes: [{ attributes: { 'w:val': '48' } }] }, { fontSize: '32' });
    expect(out).toEqual({
      type: 'attr',
      xmlName: 'w:sz',
      sdNodeOrKeyName: 'fontSize',
      attributes: { 'w:val': '32' },
    });

    const fallback = config.encode({ nodes: [{}] });
    expect(fallback.attributes).toEqual({ 'w:val': null });
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
  });
});
