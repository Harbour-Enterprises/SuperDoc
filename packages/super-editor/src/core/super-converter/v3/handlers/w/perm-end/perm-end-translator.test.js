import { describe, it, expect } from 'vitest';
import { translator, config } from './perm-end-translator.js';
import { NodeTranslator } from '@translator';

describe('w:permEnd translator', () => {
  it('exposes correct config', () => {
    expect(config.xmlName).toBe('w:permEnd');
    expect(config.sdNodeOrKeyName).toBe('permEnd');
    expect(config.type).toBe(NodeTranslator.translatorTypes.NODE);
    expect(config.attributes).toHaveLength(1);
  });

  it('encodes OOXML to SuperDoc', () => {
    const params = {
      nodes: [
        {
          name: 'w:permEnd',
          attributes: {
            'w:id': '3',
          },
        },
      ],
    };

    const result = translator.encode(params);

    expect(result).toEqual({
      type: 'permEnd',
      attrs: {
        id: '3',
      },
    });
  });

  it('decodes SuperDoc to OOXML', () => {
    const params = {
      node: {
        type: 'permEnd',
        attrs: {
          id: '5',
        },
      },
    };

    const result = translator.decode(params);

    expect(result).toEqual({
      name: 'w:permEnd',
      elements: [],
      attributes: {
        'w:id': '5',
      },
    });
  });

  it('round-trips correctly', () => {
    const original = {
      name: 'w:permEnd',
      elements: [],
      attributes: {
        'w:id': '9',
      },
    };

    const encoded = translator.encode({ nodes: [original] });
    const decoded = translator.decode({ node: encoded });

    expect(decoded).toEqual(original);
  });
});
