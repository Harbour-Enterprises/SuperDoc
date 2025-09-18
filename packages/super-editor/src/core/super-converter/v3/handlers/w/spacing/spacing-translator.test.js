// @ts-check
import { describe, it, expect } from 'vitest';
import { translator } from './spacing-translator.js';

describe('w:spacing translator', () => {
  describe('encode', () => {
    it('should encode basic spacing attributes', () => {
      const params = {
        nodes: [
          {
            name: 'w:spacing',
            attributes: {
              'w:line': '240',
              'w:lineRule': 'auto',
              'w:before': '120',
              'w:after': '360',
            },
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        line: 1, // 240 / 240 = 1 line
        lineRule: 'auto',
        lineSpaceBefore: 8, // 120 twips to pixels (120/1440*96 = 8)
        lineSpaceAfter: 24, // 360 twips to pixels (360/1440*96 = 24)
      });
    });

    it('should handle exact line rule with pt conversion', () => {
      const params = {
        nodes: [
          {
            name: 'w:spacing',
            attributes: {
              'w:line': '400',
              'w:lineRule': 'exact',
            },
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        line: '20pt', // 400 twips / 20 = 20pt
        lineRule: 'exact',
      });
    });

    it('should handle autospacing flags', () => {
      const params = {
        nodes: [
          {
            name: 'w:spacing',
            attributes: {
              'w:before': '100',
              'w:after': '200',
              'w:beforeAutospacing': '1',
              'w:afterAutospacing': '1',
            },
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        lineSpaceBefore: 7, // 100 twips to pixels (100/1440*96 = 6.67 ≈ 7)
        lineSpaceAfter: 13, // 200 twips to pixels (200/1440*96 = 13.33 ≈ 13)
        beforeAutospacing: true,
        afterAutospacing: true,
      });
    });

    it('should handle zero spacing values', () => {
      const params = {
        nodes: [
          {
            name: 'w:spacing',
            attributes: {
              'w:before': '0',
              'w:after': '0',
            },
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        lineSpaceBefore: 0,
        lineSpaceAfter: 0,
      });
    });

    it('should return undefined for non-spacing node', () => {
      const params = {
        nodes: [
          {
            name: 'w:other',
            attributes: {},
          },
        ],
      };

      const result = translator.encode(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty attributes', () => {
      const params = {
        nodes: [
          {
            name: 'w:spacing',
            attributes: {},
          },
        ],
      };

      const result = translator.encode(params);
      expect(result).toBeUndefined();
    });

    it('should handle missing attributes gracefully', () => {
      const params = {
        nodes: [
          {
            name: 'w:spacing',
          },
        ],
      };

      const result = translator.encode(params);
      expect(result).toBeUndefined();
    });
  });

  describe('decode', () => {
    it('should decode basic spacing object', () => {
      const params = {
        node: {
          attrs: {
            spacing: {
              line: 1.5,
              lineRule: 'auto',
              lineSpaceBefore: 12,
              lineSpaceAfter: 24,
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        'w:line': 360, // 1.5 lines * 240 twips per line
        'w:lineRule': 'auto',
        'w:before': 180, // 12 pixels to twips (12*1440/96 = 180)
        'w:after': 360, // 24 pixels to twips (24*1440/96 = 360)
      });
    });

    it('should decode exact line rule with pt values', () => {
      const params = {
        node: {
          attrs: {
            spacing: {
              line: '18pt',
              lineRule: 'exact',
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        'w:line': 360, // 18pt * 20 twips per pt
        'w:lineRule': 'exact',
      });
    });

    it('should handle pt values without explicit lineRule', () => {
      const params = {
        node: {
          attrs: {
            spacing: {
              line: '12pt',
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        'w:line': 240, // 12pt * 20 twips per pt
        'w:lineRule': 'exact',
      });
    });

    it('should handle line values without explicit lineRule', () => {
      const params = {
        node: {
          attrs: {
            spacing: {
              line: 2,
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        'w:line': 480, // 2 lines * 240 twips per line
        'w:lineRule': 'auto',
      });
    });

    it('should handle zero spacing values', () => {
      const params = {
        node: {
          attrs: {
            spacing: {
              lineSpaceBefore: 0,
              lineSpaceAfter: 0,
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        'w:before': 0,
        'w:after': 0,
      });
    });

    it('should handle autospacing flags', () => {
      const params = {
        node: {
          attrs: {
            spacing: {
              lineSpaceBefore: 10,
              lineSpaceAfter: 20,
              beforeAutospacing: true,
              afterAutospacing: true,
            },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        'w:before': 150, // 10 pixels to twips (10*1440/96 = 150)
        'w:after': 300, // 20 pixels to twips (20*1440/96 = 300)
        'w:beforeAutospacing': '1',
        'w:afterAutospacing': '1',
      });
    });

    it('should return undefined for missing spacing', () => {
      const params = {
        node: {
          attrs: {},
        },
      };

      const result = translator.decode(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined for null spacing', () => {
      const params = {
        node: {
          attrs: {
            spacing: null,
          },
        },
      };

      const result = translator.decode(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-object spacing', () => {
      const params = {
        node: {
          attrs: {
            spacing: 'invalid',
          },
        },
      };

      const result = translator.decode(params);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty spacing object', () => {
      const params = {
        node: {
          attrs: {
            spacing: {},
          },
        },
      };

      const result = translator.decode(params);
      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle complex spacing combinations', () => {
      const params = {
        nodes: [
          {
            name: 'w:spacing',
            attributes: {
              'w:line': '276',
              'w:lineRule': 'atLeast',
              'w:before': '240',
              'w:after': '240',
              'w:beforeAutospacing': '1',
            },
          },
        ],
      };

      const result = translator.encode(params);

      expect(result).toEqual({
        line: 1.15, // 276 / 240 = 1.15 lines
        lineRule: 'atLeast',
        lineSpaceBefore: 16, // 240 twips to pixels (240/1440*96 = 16)
        lineSpaceAfter: 16, // 240 twips to pixels (240/1440*96 = 16)
        beforeAutospacing: true,
      });
    });

    it('should round-trip encode/decode correctly', () => {
      const originalSpacing = {
        line: 1.5,
        lineRule: 'auto',
        lineSpaceBefore: 12,
        lineSpaceAfter: 18,
        beforeAutospacing: true,
      };

      const decodeParams = {
        node: {
          attrs: { spacing: originalSpacing },
        },
      };

      const decoded = translator.decode(decodeParams);

      const encodeParams = {
        nodes: [
          {
            name: 'w:spacing',
            attributes: decoded,
          },
        ],
      };

      const encoded = translator.encode(encodeParams);

      expect(encoded).toEqual(originalSpacing);
    });
  });
});
