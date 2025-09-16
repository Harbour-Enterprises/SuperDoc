import { describe, it, expect } from 'vitest';
import { parseRunProperties } from './parse-run-properties.js';

const entry = (xmlName, attributes = {}) => ({ xmlName, attributes });

describe('parseRunProperties', () => {
  it('handles bold/italic on/off', () => {
    const { style } = parseRunProperties([
      entry('w:b', {}),
      entry('w:i', { 'w:val': '0' }),
    ]);
    expect(style.isBold).toBe(true);
    expect(style.isItalicOff).toBe(true);
  });

  it('handles underline types/color and off', () => {
    const { style } = parseRunProperties([
      entry('w:u', { 'w:val': 'dash', 'w:color': 'FF0000' }),
    ]);
    expect(style.underlineType).toBe('dash');
    expect(style.underlineColor).toBe('#FF0000');
  });

  it('converts size from half-points', () => {
    const { style } = parseRunProperties([entry('w:sz', { 'w:val': '32' })]);
    expect(style.fontSizePt).toBe('16pt');
  });

  it('extracts color from w:color and theme', () => {
    const { style: s1 } = parseRunProperties([entry('w:color', { 'w:val': '00FF00' })]);
    expect(s1.textColor).toBe('#00FF00');
    const { style: s2 } = parseRunProperties([entry('w:color', { 'w:themeColor': 'accent1' })]);
    expect(s2.textColor).toBe('theme:accent1');
  });

  it('extracts highlight from w:highlight and w:shd', () => {
    const { style: s1 } = parseRunProperties([entry('w:highlight', { 'w:val': 'yellow' })]);
    expect(s1.highlightColor).toBe('yellow');
    const { style: s2 } = parseRunProperties([entry('w:shd', { 'w:fill': 'FFFF00', 'w:val': 'clear' })]);
    expect(s2.highlightColor).toBe('#FFFF00');
    const { style: s3 } = parseRunProperties([entry('w:shd', { 'w:val': 'none' })]);
    expect(s3.highlightColor).toBe('transparent');
  });

  it('captures rStyle id', () => {
    const { style } = parseRunProperties([entry('w:rStyle', { 'w:val': 'Hyperlink' })]);
    expect(style.rStyleId).toBe('Hyperlink');
  });

  it('returns filteredRunProps for carry-forward items', () => {
    const { filteredRunProps } = parseRunProperties([
      entry('w:rStyle', { 'w:val': 'Hyperlink' }),
      entry('w:color', {}),
      entry('w:unknown', { foo: 'bar' }),
    ]);
    const names = filteredRunProps.map((e) => e.xmlName);
    expect(names).toContain('w:rStyle');
    expect(names).toContain('w:unknown');
  });
});

