import { describe, it, expect } from 'vitest';

import { translator } from './rFonts-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:rFonts translator (attribute)', () => {
  it('builds NodeTranslator instance with correct meta', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:rFonts');
    expect(translator.sdNodeOrKeyName).toBe('fontFamily');
    expect(typeof translator.encode).toBe('function');
  });

  describe('encode', () => {
    it('preserves all provided font attributes and maps eastAsia to w:val when present', () => {
      const params = {
        nodes: [
          {
            attributes: { 'w:eastAsia': 'Arial', 'w:ascii': 'Calibri', 'w:hAnsi': 'Calibri', 'w:cs': 'Noto Sans' },
          },
        ],
      };
      const out = translator.encode(params);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:rFonts',
        sdNodeOrKeyName: 'fontFamily',
        attributes: {
          'w:eastAsia': 'Arial',
          'w:ascii': 'Calibri',
          'w:hAnsi': 'Calibri',
          'w:cs': 'Noto Sans',
          'w:val': 'Arial',
        },
      });
    });

    it('omits w:val when eastAsia is missing or falsy, but still preserves other attributes', () => {
      const paramsMissing = { nodes: [{ attributes: { 'w:ascii': 'Calibri' } }] };
      const outMissing = translator.encode(paramsMissing);
      expect(outMissing.attributes['w:val']).toBeUndefined();
      expect(outMissing.attributes['w:ascii']).toBe('Calibri');

      const paramsEmpty = { nodes: [{ attributes: { 'w:eastAsia': '' } }] };
      const outEmpty = translator.encode(paramsEmpty);
      expect(outEmpty.attributes['w:val']).toBeUndefined();
      expect(outEmpty.attributes['w:eastAsia']).toBe('');
    });
  });
});
