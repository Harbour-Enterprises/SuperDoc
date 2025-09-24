import { describe, it, expect } from 'vitest';
import { splitRunProperties } from './split-run-properties.js';

describe('splitRunProperties', () => {
  it('separates inline marks for bold/italic and preserves remaining props', () => {
    const entries = [
      { xmlName: 'w:b', attributes: { 'w:val': '1' } },
      { xmlName: 'w:i', attributes: { 'w:val': '0' } },
      { xmlName: 'w:lang', attributes: { 'w:val': 'en-US' } },
    ];

    const result = splitRunProperties(entries);
    expect(result.inlineMarks).toEqual([{ type: 'bold' }, { type: 'italic', attrs: { value: '0' } }]);
    expect(result.remainingProps).toEqual([{ xmlName: 'w:lang', attributes: { 'w:val': 'en-US' } }]);
    expect(result.textStyleAttrs).toBeNull();
    expect(result.runStyleId).toBeNull();
  });

  it('collects text style attributes and highlight information', () => {
    const entries = [
      { xmlName: 'w:color', attributes: { 'w:val': '00FF00' } },
      { xmlName: 'w:rFonts', attributes: { 'w:ascii': 'Arial' } },
      { xmlName: 'w:sz', attributes: { 'w:val': '32' } },
      { xmlName: 'w:highlight', attributes: { 'w:val': 'yellow' } },
    ];

    const result = splitRunProperties(entries);
    expect(result.textStyleAttrs).toEqual({ color: '#00FF00', fontFamily: 'Arial, sans-serif', fontSize: '16pt' });
    expect(result.inlineMarks).toEqual([{ type: 'highlight', attrs: { color: 'yellow' } }]);
  });

  it('preserves eastAsia-specific fonts without overriding ascii fonts', () => {
    const entries = [{ xmlName: 'w:rFonts', attributes: { 'w:ascii': 'Arial', 'w:eastAsia': 'Meiryo' } }];

    const result = splitRunProperties(entries);
    expect(result.textStyleAttrs).toEqual({
      fontFamily: 'Arial, sans-serif',
      eastAsiaFontFamily: 'Meiryo, sans-serif',
    });
  });

  it('ignores synthesized w:val when only eastAsia font is present', () => {
    const entries = [
      {
        xmlName: 'w:rFonts',
        attributes: { 'w:eastAsia': 'Meiryo', 'w:val': 'Meiryo' },
      },
    ];

    const result = splitRunProperties(entries);
    expect(result.textStyleAttrs).toEqual({ eastAsiaFontFamily: 'Meiryo, sans-serif' });
  });

  it('handles underline and shading variants', () => {
    const entries = [
      { xmlName: 'w:u', attributes: { 'w:val': 'double', 'w:color': 'FF00FF' } },
      { xmlName: 'w:shd', attributes: { 'w:fill': 'CCCCCC' } },
    ];

    const result = splitRunProperties(entries);
    expect(result.inlineMarks).toEqual([
      { type: 'underline', attrs: { underlineType: 'double', underlineColor: '#FF00FF' } },
      { type: 'highlight', attrs: { color: '#CCCCCC' } },
    ]);
  });

  it('captures runStyleId and retains entry in remainingProps', () => {
    const entries = [{ xmlName: 'w:rStyle', attributes: { 'w:val': 'Heading1' } }];
    const result = splitRunProperties(entries);
    expect(result.runStyleId).toBe('Heading1');
    expect(result.remainingProps).toEqual([{ xmlName: 'w:rStyle', attributes: { 'w:val': 'Heading1' } }]);
  });

  it('returns defaults when entries list is empty', () => {
    const result = splitRunProperties();
    expect(result).toEqual({ remainingProps: [], inlineMarks: [], textStyleAttrs: null, runStyleId: null });
  });
});
