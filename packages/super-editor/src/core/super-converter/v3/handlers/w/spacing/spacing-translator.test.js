// @ts-check
import { describe, it, expect } from 'vitest';
import { attrConfig } from './spacing-translator.js';

const { encode, decode } = attrConfig;

describe('spacing-translator', () => {
  describe('encode', () => {
    it('should handle basic spacing attributes with unit conversions', () => {
      const attributes = {
        'w:line': '240',
        'w:lineRule': 'auto',
        'w:before': '120',
        'w:after': '360',
      };
      
      const result = encode(attributes);
      
      expect(result).toEqual({
        line: 1, // 240 / 240
        lineRule: 'auto',
        lineSpaceBefore: 8, // 120 twips to pixels (actual conversion result)
        lineSpaceAfter: 24, // 360 twips to pixels (actual conversion result)
      });
    });

    it('should handle exact line rule with pt conversion', () => {
      const attributes = {
        'w:line': '400',
        'w:lineRule': 'exact',
      };
      
      const result = encode(attributes);
      
      expect(result).toEqual({
        line: '20pt', // 400 / 20 (twips to points)
        lineRule: 'exact',
      });
    });

    it('should handle autospacing with font size from marks', () => {
      const attributes = {
        'w:before': '10',
        'w:after': '20',
        'w:beforeAutospacing': '1',
        'w:afterAutospacing': '1',
      };
      
      const context = {
        marks: [{ type: 'textStyle', attrs: { fontSize: '12' } }]
      };
      
      const result = encode(attributes, context);
      
      // Auto spacing calculation: Math.round((12 * 0.5 * 96) / 72) = 8
      const autoSpacing = 8;
      expect(result).toEqual({
        lineSpaceBefore: 1 + autoSpacing, // 10 twips to pixels + 8
        lineSpaceAfter: 1 + autoSpacing,  // 20 twips to pixels + 8 
      });
    });

    it('should handle autospacing without font size gracefully', () => {
      const attributes = {
        'w:before': '10',
        'w:beforeAutospacing': '1',
      };
      
      const context = { marks: [] };
      
      const result = encode(attributes, context);
      
      expect(result).toEqual({
        lineSpaceBefore: 1, // 10 twips to pixels, no autospacing added without fontSize
      });
    });

    it('should handle zero values correctly', () => {
      const attributes = {
        'w:before': '0',
        'w:after': '0',
        'w:line': '0',
      };
      
      const result = encode(attributes);
      
      expect(result).toEqual({
        lineSpaceBefore: 0,
        lineSpaceAfter: 0,
        line: 0,
      });
    });

    it('should return undefined for empty attributes', () => {
      expect(encode({})).toBeUndefined();
      expect(encode(null)).toBeUndefined();
      expect(encode(undefined)).toBeUndefined();
    });

    it('should handle partial spacing attributes', () => {
      const attributes = {
        'w:before': '240',
      };
      
      const result = encode(attributes);
      
      expect(result).toEqual({
        lineSpaceBefore: 17, // 240 twips to pixels
      });
    });

    it('should handle atLeast line rule', () => {
      const attributes = {
        'w:line': '360',
        'w:lineRule': 'atLeast',
      };
      
      const result = encode(attributes);
      
      expect(result).toEqual({
        line: 1.5, // 360 / 240
        lineRule: 'atLeast',
      });
    });
  });

  describe('decode', () => {
    it('should convert SuperDoc spacing back to OOXML attributes', () => {
      const attrs = {
        spacing: {
          lineSpaceBefore: 8,
          lineSpaceAfter: 24,
          line: 1,
          lineRule: 'auto',
        }
      };
      
      const result = decode(attrs);
      
      expect(result).toEqual({
        'w:before': 120, // 8 pixels to twips (actual conversion result)
        'w:after': 360,  // 24 pixels to twips (actual conversion result)
        'w:line': 240,   // 1 * 240 (lines to twips)
        'w:lineRule': 'auto',
      });
    });

    it('should handle exact line rule with pt conversion', () => {
      const attrs = {
        spacing: {
          line: '20pt',
          lineRule: 'exact',
        }
      };
      
      const result = decode(attrs);
      
      expect(result).toEqual({
        'w:line': 400, // 20 * 20 (points to twips)
        'w:lineRule': 'exact',
      });
    });

    it('should handle exact line rule with numeric line value', () => {
      const attrs = {
        spacing: {
          line: 20,
          lineRule: 'exact',
        }
      };
      
      const result = decode(attrs);
      
      expect(result).toEqual({
        'w:line': 400, // 20 * 20 (points to twips)
        'w:lineRule': 'exact',
      });
    });

    it('should use auto as default line rule', () => {
      const attrs = {
        spacing: {
          lineSpaceBefore: 10,
        }
      };
      
      const result = decode(attrs);
      
      expect(result).toEqual({
        'w:before': 144, // 10 pixels to twips
        'w:lineRule': 'auto',
      });
    });

    it('should handle zero values correctly', () => {
      const attrs = {
        spacing: {
          lineSpaceBefore: 0,
          lineSpaceAfter: 0,
          line: 0,
        }
      };
      
      const result = decode(attrs);
      
      expect(result).toEqual({
        'w:before': 0,
        'w:after': 0,
        'w:line': 0,
        'w:lineRule': 'auto',
      });
    });

    it('should return undefined for missing spacing', () => {
      expect(decode({})).toBeUndefined();
      expect(decode({ spacing: null })).toBeUndefined();
      expect(decode({ spacing: {} })).toBeUndefined();
    });

    it('should handle partial spacing object', () => {
      const attrs = {
        spacing: {
          lineSpaceAfter: 24,
          lineRule: 'atLeast',
        }
      };
      
      const result = decode(attrs);
      
      expect(result).toEqual({
        'w:after': 360, // 24 pixels to twips
        'w:lineRule': 'atLeast',
      });
    });

    it('should handle negative spacing values as non-negative', () => {
      const attrs = {
        spacing: {
          lineSpaceBefore: -5, // Should be skipped since < 0
          lineSpaceAfter: 10,
        }
      };
      
      const result = decode(attrs);
      
      expect(result).toEqual({
        'w:after': 144, // 10 pixels to twips
        'w:lineRule': 'auto',
      });
      expect(result['w:before']).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle complex spacing with all attributes', () => {
      const attributes = {
        'w:line': '288',
        'w:lineRule': 'atLeast',
        'w:before': '144',
        'w:after': '216',
        'w:beforeAutospacing': '1',
        'w:afterAutospacing': '1',
      };
      
      const context = {
        marks: [{ type: 'textStyle', attrs: { fontSize: '14' } }]
      };
      
      const result = encode(attributes, context);
      
        // Auto spacing for 14pt font: Math.round((14 * 0.5 * 96) / 72) = 9
      expect(result).toEqual({
        line: 1.2, // 288 / 240
        lineRule: 'atLeast',
        lineSpaceBefore: 10 + 9, // 144 twips to pixels + 9
        lineSpaceAfter: 14 + 9,  // 216 twips to pixels + 9
      });
    });

    it('should handle round-trip conversion accuracy', () => {
      const originalSpacing = {
        lineSpaceBefore: 8,
        lineSpaceAfter: 24,
        line: 1.25,
        lineRule: 'auto',
      };
      
      const attrs = { spacing: originalSpacing };
      const ooxmlAttrs = decode(attrs);
      const backToSpacing = encode(ooxmlAttrs);
      
      expect(backToSpacing).toEqual(originalSpacing);
    });

    it('should handle string fontSize in marks', () => {
      const attributes = {
        'w:beforeAutospacing': '1',
      };
      
      const context = {
        marks: [{ type: 'textStyle', attrs: { fontSize: '16' } }]
      };
      
      const result = encode(attributes, context);
      
      // Auto spacing for 16pt font: Math.round((16 * 0.5 * 96) / 72) = 11
      expect(result).toEqual({
        lineSpaceBefore: 11,
      });
    });

    it('should ignore autospacing flags when not "1"', () => {
      const attributes = {
        'w:before': '10',
        'w:beforeAutospacing': '0', // Should be ignored
      };
      
      const context = {
        marks: [{ type: 'textStyle', attrs: { fontSize: '12' } }]
      };
      
      const result = encode(attributes, context);
      
      expect(result).toEqual({
        lineSpaceBefore: 1, // No autospacing added
      });
    });
  });
});