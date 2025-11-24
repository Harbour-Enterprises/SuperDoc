import { describe, it, expect, vi, beforeAll } from 'vitest';
import { encodeMarksFromRPr, decodeRPrFromMarks, encodeCSSFromRPr, encodeCSSFromPPr } from './styles.js';

beforeAll(() => {
  vi.stubGlobal('SuperConverter', {
    toCssFontFamily: (font) => font,
  });
});

describe('encodeMarksFromRPr', () => {
  it('should encode bold, italic, and strike properties', () => {
    const rPr = { bold: true, italic: true, strike: true };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toEqual(
      expect.arrayContaining([
        { type: 'bold', attrs: { value: true } },
        { type: 'italic', attrs: { value: true } },
        { type: 'strike', attrs: { value: true } },
      ]),
    );
  });

  it('should encode color and fontSize', () => {
    const rPr = { color: { val: 'FF0000' }, fontSize: 24 };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'textStyle',
      attrs: { color: '#FF0000', fontSize: '12pt' },
    });
  });

  it('should encode underline', () => {
    const rPr = { underline: { 'w:val': 'single', 'w:color': 'auto' } };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'underline',
      attrs: { underlineType: 'single', underlineColor: 'auto' },
    });
  });

  it('should encode highlight from w:highlight', () => {
    const rPr = { highlight: { 'w:val': 'yellow' } };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'highlight',
      attrs: { color: '#FFFF00' },
    });
  });

  it('should encode highlight from w:shd', () => {
    const rPr = { shading: { fill: 'FFA500' } };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'highlight',
      attrs: { color: '#FFA500' },
    });
  });

  it('should encode fontFamily', () => {
    const rPr = { fontFamily: { 'w:ascii': 'Arial' } };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'textStyle',
      attrs: { fontFamily: 'Arial, sans-serif' },
    });
  });

  it('should encode textTransform', () => {
    const rPr = { textTransform: 'uppercase' };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'textStyle',
      attrs: { textTransform: 'uppercase' },
    });
  });
});

describe('encodeCSSFromRPr', () => {
  it('should encode basic font toggles', () => {
    const css = encodeCSSFromRPr({ bold: true, italic: false, strike: true }, {});
    expect(css).toMatchObject({
      'font-weight': 'bold',
      'font-style': 'normal',
      'text-decoration-line': 'line-through',
    });
    expect(css).not.toHaveProperty('text-decoration');
  });

  it('should encode underline styles and merge strike decorations', () => {
    const css = encodeCSSFromRPr({ underline: { 'w:val': 'double', 'w:color': 'FF0000' }, strike: true }, {});
    expect(css).toMatchObject({
      'text-decoration-style': 'double',
      'text-decoration-color': '#FF0000',
    });
    expect(css['text-decoration-line'].split(' ').sort()).toEqual(['line-through', 'underline'].sort());
  });

  it('should encode highlight without overriding explicit text color', () => {
    const css = encodeCSSFromRPr({ color: { val: 'FF0000' }, highlight: { 'w:val': 'yellow' } }, {});
    expect(css).toMatchObject({
      color: '#FF0000',
      'background-color': '#FFFF00',
    });
  });

  it('should encode font size and letter spacing', () => {
    const css = encodeCSSFromRPr({ fontSize: 24, letterSpacing: 240 }, {});
    expect(css).toMatchObject({
      'font-size': '12pt',
      'letter-spacing': '12pt',
    });
  });

  it('should encode font family using converter fallbacks', () => {
    const css = encodeCSSFromRPr({ fontFamily: { 'w:ascii': 'Arial' } }, {});
    expect(css['font-family']).toBe('Arial, sans-serif');
  });
});

describe('encodeCSSFromPPr', () => {
  it('converts spacing, indentation, and justification to CSS declarations', () => {
    const css = encodeCSSFromPPr({
      spacing: { before: 180, after: 120, line: 480, lineRule: 'auto' },
      indent: { left: 720, right: 1440, firstLine: 360 },
      justification: 'both',
    });

    expect(css).toMatchObject({
      'margin-top': '12px',
      'margin-bottom': '8px',
      'line-height': '2',
      'margin-left': '48px',
      'margin-right': '96px',
      'text-indent': '24px',
      'text-align': 'justify',
    });
  });

  it('forces drop caps to use single-line spacing regardless of provided spacing', () => {
    const cssWithoutFrame = encodeCSSFromPPr({
      spacing: { before: 0, after: 0, line: 720, lineRule: 'exact' },
    });
    const cssWithFrame = encodeCSSFromPPr({
      spacing: { before: 0, after: 0, line: 720, lineRule: 'exact' },
      framePr: { dropCap: 'drop' },
    });

    expect(cssWithoutFrame['line-height']).toBe('3');
    expect(cssWithFrame['line-height']).toBe('1');
  });

  it('keeps autospacing margins unless suppressed for list items', () => {
    const spacing = {
      before: 120,
      after: 120,
      line: 240,
      lineRule: 'auto',
      beforeAutospacing: true,
      afterAutospacing: true,
    };

    const css = encodeCSSFromPPr({ spacing });
    expect(css['margin-top']).toBe('8px');
    expect(css['margin-bottom']).toBe('8px');

    const listCss = encodeCSSFromPPr({
      spacing,
      numberingProperties: { numId: 1, ilvl: 0 },
    });
    expect(listCss['margin-top']).toBeUndefined();
    expect(listCss['margin-bottom']).toBeUndefined();
  });

  it('translates borders to CSS including padding for bottom space', () => {
    const css = encodeCSSFromPPr({
      borders: {
        top: { val: 'none' },
        bottom: { val: 'single', size: 8, color: 'FF0000', space: 16 },
      },
    });

    expect(css['border-top']).toBe('none');
    expect(css['border-bottom']).toContain('#FF0000');
    expect(css['border-bottom']).toContain('solid');
    expect(parseFloat(css['border-bottom'])).toBeCloseTo(1.333, 3);
    expect(parseFloat(css['padding-bottom'])).toBeCloseTo(2.6666, 3);
  });
});

describe('decodeRPrFromMarks', () => {
  it('should decode bold, italic, and strike marks', () => {
    const marks = [
      { type: 'bold', attrs: { value: true } },
      { type: 'italic', attrs: { value: true } },
      { type: 'strike', attrs: { value: true } },
    ];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr).toEqual({ bold: true, italic: true, strike: true });
  });

  it('should decode textStyle marks for color and fontSize', () => {
    const marks = [{ type: 'textStyle', attrs: { color: '#FF0000', fontSize: '12pt' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr).toEqual({ color: { val: 'FF0000' }, fontSize: 24 });
  });

  it('should decode underline marks', () => {
    const marks = [{ type: 'underline', attrs: { underlineType: 'single', underlineColor: '#FF0000' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr).toEqual({ underline: { 'w:val': 'single', 'w:color': 'FF0000' } });
  });

  it('should decode highlight marks', () => {
    const marks = [{ type: 'highlight', attrs: { color: '#FFFF00' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr).toEqual({ highlight: { 'w:val': '#FFFF00' } });
  });

  it('should decode textStyle with fontFamily', () => {
    const marks = [{ type: 'textStyle', attrs: { fontFamily: 'Arial, sans-serif' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr).toEqual({
      fontFamily: {
        ascii: 'Arial',
        cs: 'Arial',
        eastAsia: 'Arial',
        hAnsi: 'Arial',
      },
    });
  });

  it('should decode textStyle with textTransform', () => {
    const marks = [{ type: 'textStyle', attrs: { textTransform: 'uppercase' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr).toEqual({ textTransform: 'uppercase' });
  });
});

describe('marks encoding/decoding round-trip', () => {
  it('should correctly round-trip basic properties', () => {
    const initialRPr = {
      bold: true,
      italic: true,
      strike: true,
      underline: { 'w:val': 'single', 'w:color': 'auto' },
      color: { val: 'FF0000' },
      fontSize: 28,
      letterSpacing: 20,
    };

    const marks = encodeMarksFromRPr(initialRPr, {});
    const finalRPr = decodeRPrFromMarks(marks);

    expect(finalRPr).toEqual(initialRPr);
  });

  it('should round-trip fontFamily for simple symmetric cases', () => {
    const initialRPr = { fontFamily: { 'w:ascii': 'Arial', 'w:hAnsi': 'Arial' } };
    const marks = encodeMarksFromRPr(initialRPr, {});
    const finalRPr = decodeRPrFromMarks(marks);
    expect(finalRPr).toEqual({
      fontFamily: {
        ascii: 'Arial',
        cs: 'Arial',
        eastAsia: 'Arial',
        hAnsi: 'Arial',
      },
    });
  });

  it('should round-trip highlight to a consistent format', () => {
    const rPrHighlight = { highlight: { 'w:val': 'yellow' } };
    const marks1 = encodeMarksFromRPr(rPrHighlight, {});
    const finalRPr1 = decodeRPrFromMarks(marks1);
    expect(finalRPr1).toEqual({ highlight: { 'w:val': '#FFFF00' } });

    const rPrShading = { shading: { fill: 'FFA500' } };
    const marks2 = encodeMarksFromRPr(rPrShading, {});
    const finalRPr2 = decodeRPrFromMarks(marks2);
    expect(finalRPr2).toEqual({ highlight: { 'w:val': '#FFA500' } });
  });

  it('should show asymmetry in textTransform/caps round-trip', () => {
    const rPrTextTransform = { textTransform: 'uppercase' };
    const marks = encodeMarksFromRPr(rPrTextTransform, {});
    const finalRPr = decodeRPrFromMarks(marks);
    expect(finalRPr).toEqual({ textTransform: 'uppercase' });

    // and the other way
    const rPrCaps = { caps: true };
    const marksFromCaps = encodeMarksFromRPr(rPrCaps, {});
    // encodeMarksFromRPr doesn't handle 'caps', so it produces no textTransform mark.
    expect(marksFromCaps.some((m) => m.type === 'textStyle' && m.attrs.textTransform)).toBe(false);
  });
});
