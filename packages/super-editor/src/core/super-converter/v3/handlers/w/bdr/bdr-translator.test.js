import { describe, it, expect } from 'vitest';

import { config, translator } from './bdr-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:bdr translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:bdr');
    expect(config.sdNodeOrKeyName).toBe('border');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
    expect(typeof config.encode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:bdr');
    expect(translator.sdNodeOrKeyName).toBe('border');
  });

  it('encodes all supported attributes when present', () => {
    const params = {
      nodes: [
        {
          attributes: {
            'w:val': 'single',
            'w:sz': '8',
            'w:space': '4',
            'w:color': 'FF00FF',
            'w:themeColor': 'accent1',
            'w:themeTint': '99',
            'w:themeShade': '44',
          },
        },
      ],
    };
    const out = config.encode(params);
    expect(out).toEqual({
      type: 'attr',
      xmlName: 'w:bdr',
      sdNodeOrKeyName: 'border',
      attributes: {
        'w:val': 'single',
        'w:sz': '8',
        'w:space': '4',
        'w:color': 'FF00FF',
        'w:themeColor': 'accent1',
        'w:themeTint': '99',
        'w:themeShade': '44',
      },
    });
  });

  it('sets missing attributes to null', () => {
    const params = { nodes: [{ attributes: {} }] };
    const out = config.encode(params);
    expect(out.attributes).toEqual({
      'w:val': null,
      'w:sz': null,
      'w:space': null,
      'w:color': null,
      'w:themeColor': null,
      'w:themeTint': null,
      'w:themeShade': null,
    });
  });
});
