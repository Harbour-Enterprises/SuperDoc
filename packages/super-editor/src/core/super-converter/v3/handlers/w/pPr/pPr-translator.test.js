// @ts-check
import { describe, it, expect } from 'vitest';
import { translator } from './pPr-translator.js';

describe('w:pPr translator', () => {
  describe('encode', () => {
    it('should encode pPr with spacing element', () => {
      const params = {
        nodes: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:spacing',
                attributes: {
                  'w:line': '240',
                  'w:lineRule': 'auto',
                  'w:before': '120',
                  'w:after': '240',
                },
              },
            ],
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        type: 'attribute',
        xmlName: 'w:pPr',
        sdNodeOrKeyName: 'paragraphProperties',
        attributes: {
          spacing: {
            line: 1, // 240 / 240 = 1 line
            lineRule: 'auto',
            lineSpaceBefore: 8, // 120 twips to pixels (120/1440*96 = 8)
            lineSpaceAfter: 16, // 240 twips to pixels (240/1440*96 = 16)
          },
        },
      });
    });

    it('should encode empty pPr', () => {
      const params = {
        nodes: [
          {
            name: 'w:pPr',
            elements: [],
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        type: 'attribute',
        xmlName: 'w:pPr',
        sdNodeOrKeyName: 'paragraphProperties',
        attributes: {},
      });
    });

    it('should encode pPr with multiple spacing properties', () => {
      const params = {
        nodes: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:spacing',
                attributes: {
                  'w:line': '400',
                  'w:lineRule': 'exact',
                  'w:before': '0',
                  'w:after': '120',
                  'w:beforeAutospacing': '1',
                  'w:afterAutospacing': '1',
                },
              },
            ],
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        type: 'attribute',
        xmlName: 'w:pPr',
        sdNodeOrKeyName: 'paragraphProperties',
        attributes: {
          spacing: {
            line: '20pt', // 400 twips / 20 = 20pt for exact rule
            lineRule: 'exact',
            lineSpaceBefore: 0,
            lineSpaceAfter: 8, // 120 twips to pixels (120/1440*96 = 8)
            beforeAutospacing: true,
            afterAutospacing: true,
          },
        },
      });
    });
  });

  describe('decode', () => {
    it('should decode paragraphProperties with spacing', () => {
      const params = {
        node: {
          attrs: {
            paragraphProperties: {
              spacing: {
                line: 1.5,
                lineRule: 'auto',
                lineSpaceBefore: 12,
                lineSpaceAfter: 24,
              },
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'w:pPr',
        type: 'element',
        attributes: {},
        elements: [
          {
            name: 'w:spacing',
            attributes: {
              'w:line': 360, // 1.5 lines * 240 twips per line
              'w:lineRule': 'auto',
              'w:before': 180, // 12 pixels to twips (12*1440/96 = 180)
              'w:after': 360, // 24 pixels to twips (24*1440/96 = 360)
            },
          },
        ],
      });
    });

    it('should decode empty paragraphProperties', () => {
      const params = {
        node: {
          attrs: {
            paragraphProperties: {},
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'w:pPr',
        type: 'element',
        attributes: {},
        elements: [],
      });
    });

    it('should decode missing paragraphProperties', () => {
      const params = {
        node: {
          attrs: {},
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'w:pPr',
        type: 'element',
        attributes: {},
        elements: [],
      });
    });

    it('should decode paragraphProperties with exact line spacing', () => {
      const params = {
        node: {
          attrs: {
            paragraphProperties: {
              spacing: {
                line: '18pt',
                lineRule: 'exact',
                lineSpaceBefore: 0,
                lineSpaceAfter: 12,
              },
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'w:pPr',
        type: 'element',
        attributes: {},
        elements: [
          {
            name: 'w:spacing',
            attributes: {
              'w:line': 360, // 18pt * 20 twips per pt
              'w:lineRule': 'exact',
              'w:before': 0,
              'w:after': 180, // 12 pixels to twips (12*1440/96 = 180)
            },
          },
        ],
      });
    });

    it('should decode paragraphProperties with autospacing', () => {
      const params = {
        node: {
          attrs: {
            paragraphProperties: {
              spacing: {
                lineSpaceBefore: 10,
                lineSpaceAfter: 15,
                beforeAutospacing: true,
                afterAutospacing: true,
              },
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'w:pPr',
        type: 'element',
        attributes: {},
        elements: [
          {
            name: 'w:spacing',
            attributes: {
              'w:before': 150, // 10 pixels to twips (10*1440/96 = 150)
              'w:after': 225, // 15 pixels to twips (15*1440/96 = 225)
              'w:beforeAutospacing': '1',
              'w:afterAutospacing': '1',
            },
          },
        ],
      });
    });
  });

  describe('integration tests', () => {
    it('should handle round-trip conversion', () => {
      const originalPPrNode = {
        name: 'w:pPr',
        elements: [
          {
            name: 'w:spacing',
            attributes: {
              'w:line': '276',
              'w:lineRule': 'atLeast',
              'w:before': '120',
              'w:after': '240',
              'w:beforeAutospacing': '1',
            },
          },
        ],
      };

      // Encode to SuperDoc format
      const encodeParams = { nodes: [originalPPrNode] };
      const encoded = translator.encode(encodeParams);

      // Decode back to OOXML format
      const decodeParams = {
        node: {
          attrs: {
            [encoded.sdNodeOrKeyName]: encoded.attributes,
          },
        },
      };
      const decoded = translator.decode(decodeParams);

      expect(decoded.name).toBe('w:pPr');
      expect(decoded.elements).toHaveLength(1);
      expect(decoded.elements[0].name).toBe('w:spacing');

      // Check that key attributes are preserved (allowing for rounding)
      const spacingAttrs = decoded.elements[0].attributes;
      expect(spacingAttrs['w:lineRule']).toBe('atLeast');
      expect(spacingAttrs['w:before']).toBe(120);
      expect(spacingAttrs['w:after']).toBe(240);
      expect(spacingAttrs['w:beforeAutospacing']).toBe('1');
      // Line spacing might have slight rounding differences due to conversion
      expect(Math.abs(spacingAttrs['w:line'] - 276)).toBeLessThan(5);
    });

    it('should handle complex spacing with multiple properties', () => {
      const complexSpacing = {
        line: 1.25,
        lineRule: 'atLeast',
        lineSpaceBefore: 18,
        lineSpaceAfter: 12,
        beforeAutospacing: true,
        afterAutospacing: false,
      };

      // Test decode first
      const decodeParams = {
        node: {
          attrs: {
            paragraphProperties: { spacing: complexSpacing },
          },
        },
      };

      const decoded = translator.decode(decodeParams);
      expect(decoded.elements).toHaveLength(1);

      const spacingElement = decoded.elements[0];
      expect(spacingElement.name).toBe('w:spacing');
      expect(spacingElement.attributes['w:lineRule']).toBe('atLeast');
      expect(spacingElement.attributes['w:beforeAutospacing']).toBe('1');
      expect(spacingElement.attributes['w:afterAutospacing']).toBeUndefined();

      // Test encode
      const encodeParams = { nodes: [decoded] };
      const encoded = translator.encode(encodeParams);

      expect(encoded.attributes.spacing.lineRule).toBe('atLeast');
      expect(encoded.attributes.spacing.beforeAutospacing).toBe(true);
      expect(encoded.attributes.spacing.afterAutospacing).toBeUndefined();
    });
  });
});
