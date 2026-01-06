import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  encodeMarksFromRPr,
  decodeRPrFromMarks,
  encodeCSSFromRPr,
  encodeCSSFromPPr,
  resolveRunProperties,
  resolveParagraphProperties,
} from './styles.js';

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

  it('encodes vertical alignment and position into textStyle', () => {
    const rPr = { vertAlign: 'subscript', position: 4 };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'textStyle',
      attrs: { vertAlign: 'subscript', position: '2pt' },
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

  it('applies vertical-align and scaling for superscript/subscript', () => {
    const css = encodeCSSFromRPr({ vertAlign: 'superscript', fontSize: 20 }, {});
    expect(css['vertical-align']).toBe('super');
    expect(css['font-size']).toBe('6.5pt'); // 20 half-points = 10pt; scaled 65%
  });

  it('uses numeric position when provided', () => {
    const css = encodeCSSFromRPr({ position: 4 }, {});
    expect(css['vertical-align']).toBe('2pt');
  });
});

describe('decodeRPrFromMarks', () => {
  it('decodes vertAlign and position from textStyle mark', () => {
    const marks = [{ type: { name: 'textStyle' }, attrs: { vertAlign: 'subscript', position: '1.5pt' } }];
    expect(decodeRPrFromMarks(marks)).toMatchObject({ vertAlign: 'subscript', position: 3 });
  });
});

describe('encodeMarksFromRPr - vertAlign/position edge cases', () => {
  it('handles null vertAlign gracefully', () => {
    const rPr = { vertAlign: null };
    const marks = encodeMarksFromRPr(rPr, {});
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark?.attrs?.vertAlign).toBeUndefined();
  });

  it('handles undefined vertAlign gracefully', () => {
    const rPr = { vertAlign: undefined };
    const marks = encodeMarksFromRPr(rPr, {});
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark?.attrs?.vertAlign).toBeUndefined();
  });

  it('handles null position gracefully', () => {
    const rPr = { position: null };
    const marks = encodeMarksFromRPr(rPr, {});
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark?.attrs?.position).toBeUndefined();
  });

  it('handles undefined position gracefully', () => {
    const rPr = { position: undefined };
    const marks = encodeMarksFromRPr(rPr, {});
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark?.attrs?.position).toBeUndefined();
  });

  it('handles NaN position gracefully', () => {
    const rPr = { position: NaN };
    const marks = encodeMarksFromRPr(rPr, {});
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark?.attrs?.position).toBeUndefined();
  });

  it('handles Infinity position gracefully', () => {
    const rPr = { position: Infinity };
    const marks = encodeMarksFromRPr(rPr, {});
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark?.attrs?.position).toBeUndefined();
  });

  it('handles negative Infinity position gracefully', () => {
    const rPr = { position: -Infinity };
    const marks = encodeMarksFromRPr(rPr, {});
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark?.attrs?.position).toBeUndefined();
  });

  it('handles negative position values correctly', () => {
    const rPr = { position: -4 };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'textStyle',
      attrs: { position: '-2pt' },
    });
  });

  it('handles zero position value', () => {
    const rPr = { position: 0 };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'textStyle',
      attrs: { position: '0pt' },
    });
  });

  it('handles both vertAlign and position set together', () => {
    const rPr = { vertAlign: 'superscript', position: 4 };
    const marks = encodeMarksFromRPr(rPr, {});
    expect(marks).toContainEqual({
      type: 'textStyle',
      attrs: { vertAlign: 'superscript', position: '2pt' },
    });
  });
});

describe('encodeCSSFromRPr - vertAlign/position edge cases', () => {
  it('handles null vertAlign gracefully', () => {
    const css = encodeCSSFromRPr({ vertAlign: null }, {});
    expect(css['vertical-align']).toBeUndefined();
  });

  it('handles undefined vertAlign gracefully', () => {
    const css = encodeCSSFromRPr({ vertAlign: undefined }, {});
    expect(css['vertical-align']).toBeUndefined();
  });

  it('handles null position gracefully', () => {
    const css = encodeCSSFromRPr({ position: null }, {});
    expect(css['vertical-align']).toBeUndefined();
  });

  it('handles undefined position gracefully', () => {
    const css = encodeCSSFromRPr({ position: undefined }, {});
    expect(css['vertical-align']).toBeUndefined();
  });

  it('handles NaN position gracefully', () => {
    const css = encodeCSSFromRPr({ position: NaN }, {});
    expect(css['vertical-align']).toBeUndefined();
  });

  it('handles Infinity position gracefully', () => {
    const css = encodeCSSFromRPr({ position: Infinity }, {});
    expect(css['vertical-align']).toBeUndefined();
  });

  it('handles negative Infinity position gracefully', () => {
    const css = encodeCSSFromRPr({ position: -Infinity }, {});
    expect(css['vertical-align']).toBeUndefined();
  });

  it('handles negative position values correctly', () => {
    const css = encodeCSSFromRPr({ position: -4 }, {});
    expect(css['vertical-align']).toBe('-2pt');
  });

  it('handles zero position value', () => {
    const css = encodeCSSFromRPr({ position: 0 }, {});
    expect(css['vertical-align']).toBe('0pt');
  });

  it('position takes precedence over vertAlign when both are set', () => {
    const css = encodeCSSFromRPr({ vertAlign: 'superscript', position: 4 }, {});
    expect(css['vertical-align']).toBe('2pt');
    expect(css['font-size']).toBeUndefined();
  });
});

describe('decodeRPrFromMarks - vertAlign/position edge cases', () => {
  it('handles null vertAlign gracefully', () => {
    const marks = [{ type: { name: 'textStyle' }, attrs: { vertAlign: null } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr.vertAlign).toBeUndefined();
  });

  it('handles null position gracefully', () => {
    const marks = [{ type: { name: 'textStyle' }, attrs: { position: null } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr.position).toBeUndefined();
  });

  it('handles invalid position string gracefully', () => {
    const marks = [{ type: { name: 'textStyle' }, attrs: { position: 'invalid' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr.position).toBeUndefined();
  });

  it('handles negative position values correctly', () => {
    const marks = [{ type: { name: 'textStyle' }, attrs: { position: '-2pt' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr.position).toBe(-4);
  });

  it('handles zero position value', () => {
    const marks = [{ type: { name: 'textStyle' }, attrs: { position: '0pt' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr.position).toBe(0);
  });

  it('handles both vertAlign and position set together', () => {
    const marks = [{ type: { name: 'textStyle' }, attrs: { vertAlign: 'subscript', position: '2pt' } }];
    const rPr = decodeRPrFromMarks(marks);
    expect(rPr.vertAlign).toBe('subscript');
    expect(rPr.position).toBe(4);
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

describe('resolveRunProperties - numId=0 handling (OOXML spec §17.9.16)', () => {
  // Mock minimal params structure for numbering tests
  const createMockParamsForNumbering = () => ({
    docx: {
      'word/styles.xml': {
        elements: [
          {
            elements: [
              {
                name: 'w:docDefaults',
                elements: [
                  {
                    name: 'w:rPrDefault',
                    elements: [{ name: 'w:rPr', elements: [] }],
                  },
                ],
              },
              {
                name: 'w:style',
                attributes: { 'w:styleId': 'Normal', 'w:default': '1' },
                elements: [{ name: 'w:rPr', elements: [] }],
              },
            ],
          },
        ],
      },
    },
    numbering: {
      definitions: {
        1: {
          name: 'w:num',
          attributes: { 'w:numId': '1' },
          elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
        },
      },
      abstracts: {
        0: {
          name: 'w:abstractNum',
          attributes: { 'w:abstractNumId': '0' },
          elements: [
            {
              name: 'w:lvl',
              attributes: { 'w:ilvl': '0' },
              elements: [
                { name: 'w:start', attributes: { 'w:val': '1' } },
                { name: 'w:numFmt', attributes: { 'w:val': 'decimal' } },
                {
                  name: 'w:rPr',
                  elements: [{ name: 'w:sz', attributes: { 'w:val': '24' } }],
                },
              ],
            },
          ],
        },
      },
    },
  });

  it('should not fetch numbering properties when numId is numeric 0', () => {
    const params = createMockParamsForNumbering();
    const inlineRpr = {};
    const resolvedPpr = {
      numberingProperties: {
        numId: 0,
        ilvl: 0,
      },
    };

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr, true, false);

    // numId=0 disables numbering, so numbering properties should not be fetched
    // Result should only have basic properties, no numbering-specific fontSize
    expect(result.fontSize).toBe(20); // baseline fallback
  });

  it('should not fetch numbering properties when numId is string "0"', () => {
    const params = createMockParamsForNumbering();
    const inlineRpr = {};
    const resolvedPpr = {
      numberingProperties: {
        numId: '0',
        ilvl: 0,
      },
    };

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr, true, false);

    // numId='0' disables numbering, so numbering properties should not be fetched
    expect(result.fontSize).toBe(20); // baseline fallback
  });

  it('should fetch numbering properties when numId is valid (1)', () => {
    const params = createMockParamsForNumbering();
    const inlineRpr = {};
    const resolvedPpr = {
      numberingProperties: {
        numId: 1,
        ilvl: 0,
      },
    };

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr, true, false);

    // Valid numId should fetch numbering properties including fontSize from numbering definition
    expect(result.fontSize).toBe(24); // from numbering definition w:sz
  });

  it('should fetch numbering properties when numId is valid string ("1")', () => {
    const params = createMockParamsForNumbering();
    const inlineRpr = {};
    const resolvedPpr = {
      numberingProperties: {
        numId: '1',
        ilvl: 0,
      },
    };

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr, true, false);

    // Valid string numId should fetch numbering properties
    expect(result.fontSize).toBe(24); // from numbering definition
  });

  it('should not fetch numbering properties when numId is null', () => {
    const params = createMockParamsForNumbering();
    const inlineRpr = {};
    const resolvedPpr = {
      numberingProperties: {
        numId: null,
        ilvl: 0,
      },
    };

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr, true, false);

    // null numId should not fetch numbering properties
    expect(result.fontSize).toBe(20); // baseline fallback
  });

  it('should not fetch numbering properties when numId is undefined', () => {
    const params = createMockParamsForNumbering();
    const inlineRpr = {};
    const resolvedPpr = {
      numberingProperties: {
        ilvl: 0,
        // numId is undefined
      },
    };

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr, true, false);

    // undefined numId should not fetch numbering properties
    expect(result.fontSize).toBe(20); // baseline fallback
  });
});

describe('resolveParagraphProperties - numId=0 handling (OOXML spec §17.9.16)', () => {
  // Mock minimal params structure
  const createMockParamsForParagraph = () => ({
    docx: {
      'word/styles.xml': {
        elements: [
          {
            elements: [
              {
                name: 'w:docDefaults',
                elements: [
                  {
                    name: 'w:pPrDefault',
                    elements: [{ name: 'w:pPr', elements: [] }],
                  },
                ],
              },
              {
                name: 'w:style',
                attributes: { 'w:styleId': 'Normal', 'w:default': '1' },
                elements: [{ name: 'w:pPr', elements: [] }],
              },
            ],
          },
        ],
      },
    },
    numbering: {
      definitions: {
        1: {
          name: 'w:num',
          attributes: { 'w:numId': '1' },
          elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
        },
      },
      abstracts: {
        0: {
          name: 'w:abstractNum',
          attributes: { 'w:abstractNumId': '0' },
          elements: [
            {
              name: 'w:lvl',
              attributes: { 'w:ilvl': '0' },
              elements: [
                { name: 'w:start', attributes: { 'w:val': '1' } },
                { name: 'w:numFmt', attributes: { 'w:val': 'decimal' } },
                {
                  name: 'w:pPr',
                  elements: [
                    {
                      name: 'w:ind',
                      attributes: { 'w:left': '720', 'w:hanging': '360' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  });

  it('should treat numId=0 as disabling numbering and set numId to null', () => {
    const params = createMockParamsForParagraph();
    const inlineProps = {
      numberingProperties: {
        numId: 0,
        ilvl: 0,
      },
    };

    const result = resolveParagraphProperties(params, inlineProps, false, false, null);

    // numId=0 should be treated as disabling numbering
    // The function sets numId to null internally but numberingProperties still exists with numId=0
    // The important part is that getNumberingProperties is NOT called (no numbering resolved from definitions)
    expect(result.numberingProperties).toBeDefined();
    expect(result.numberingProperties.numId).toBe(0);
    // No additional properties from numbering definitions should be present
    expect(result.numberingProperties.format).toBeUndefined();
  });

  it('should treat numId="0" as disabling numbering and set numId to null', () => {
    const params = createMockParamsForParagraph();
    const inlineProps = {
      numberingProperties: {
        numId: '0',
        ilvl: 0,
      },
    };

    const result = resolveParagraphProperties(params, inlineProps, false, false, null);

    // numId='0' should be treated as disabling numbering
    // The function sets numId to null internally but numberingProperties still exists with numId='0'
    expect(result.numberingProperties).toBeDefined();
    expect(result.numberingProperties.numId).toBe('0');
    // No additional properties from numbering definitions should be present
    expect(result.numberingProperties.format).toBeUndefined();
  });

  it('should preserve valid numId=1 and fetch numbering properties', () => {
    const params = createMockParamsForParagraph();
    const inlineProps = {
      numberingProperties: {
        numId: 1,
        ilvl: 0,
      },
    };

    const result = resolveParagraphProperties(params, inlineProps, false, false, null);

    // Valid numId should fetch numbering properties
    expect(result.numberingProperties).toBeDefined();
    expect(result.numberingProperties.numId).toBe(1);
  });

  it('should preserve valid numId="5" and fetch numbering properties', () => {
    const params = createMockParamsForParagraph();
    // Add definition for numId 5
    params.numbering.definitions['5'] = {
      name: 'w:num',
      attributes: { 'w:numId': '5' },
      elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
    };
    const inlineProps = {
      numberingProperties: {
        numId: '5',
        ilvl: 0,
      },
    };

    const result = resolveParagraphProperties(params, inlineProps, false, false, null);

    // Valid string numId should fetch numbering properties
    expect(result.numberingProperties).toBeDefined();
    expect(result.numberingProperties.numId).toBe('5');
  });

  it('should handle style-based numbering with numId=1', () => {
    const params = createMockParamsForParagraph();
    // Add a style with numbering
    params.docx['word/styles.xml'].elements[0].elements.push({
      name: 'w:style',
      attributes: { 'w:styleId': 'ListParagraph' },
      elements: [
        {
          name: 'w:pPr',
          elements: [
            {
              name: 'w:numPr',
              elements: [
                { name: 'w:numId', attributes: { 'w:val': '1' } },
                { name: 'w:ilvl', attributes: { 'w:val': '0' } },
              ],
            },
          ],
        },
      ],
    });

    const inlineProps = {
      styleId: 'ListParagraph',
    };

    const result = resolveParagraphProperties(params, inlineProps, false, false, null);

    // Style-based numbering should be resolved
    expect(result.numberingProperties).toBeDefined();
    expect(result.numberingProperties.numId).toBe(1);
  });

  it('should override style numbering when inline numId=0 is present', () => {
    const params = createMockParamsForParagraph();
    // Add a style with numbering
    params.docx['word/styles.xml'].elements[0].elements.push({
      name: 'w:style',
      attributes: { 'w:styleId': 'ListParagraph' },
      elements: [
        {
          name: 'w:pPr',
          elements: [
            {
              name: 'w:numPr',
              elements: [
                { name: 'w:numId', attributes: { 'w:val': '1' } },
                { name: 'w:ilvl', attributes: { 'w:val': '0' } },
              ],
            },
          ],
        },
      ],
    });

    const inlineProps = {
      styleId: 'ListParagraph',
      numberingProperties: {
        numId: 0, // Inline override to disable numbering
        ilvl: 0,
      },
    };

    const result = resolveParagraphProperties(params, inlineProps, false, false, null);

    // Inline numId=0 should disable style-based numbering
    // numberingProperties will still exist with numId=0, but no properties from definitions are fetched
    expect(result.numberingProperties).toBeDefined();
    expect(result.numberingProperties.numId).toBe(0);
    expect(result.numberingProperties.format).toBeUndefined();
  });

  it('should override style numbering when inline numId="0" is present', () => {
    const params = createMockParamsForParagraph();
    // Add a style with numbering
    params.docx['word/styles.xml'].elements[0].elements.push({
      name: 'w:style',
      attributes: { 'w:styleId': 'ListParagraph' },
      elements: [
        {
          name: 'w:pPr',
          elements: [
            {
              name: 'w:numPr',
              elements: [
                { name: 'w:numId', attributes: { 'w:val': '1' } },
                { name: 'w:ilvl', attributes: { 'w:val': '0' } },
              ],
            },
          ],
        },
      ],
    });

    const inlineProps = {
      styleId: 'ListParagraph',
      numberingProperties: {
        numId: '0', // Inline override to disable numbering (string form)
        ilvl: 0,
      },
    };

    const result = resolveParagraphProperties(params, inlineProps, false, false, null);

    // Inline numId='0' should disable style-based numbering
    // numberingProperties will still exist with numId='0', but no properties from definitions are fetched
    expect(result.numberingProperties).toBeDefined();
    expect(result.numberingProperties.numId).toBe('0');
    expect(result.numberingProperties.format).toBeUndefined();
  });
});

describe('resolveRunProperties - fontSize fallback', () => {
  // Mock minimal params structure
  const createMockParams = (defaultFontSize = null, normalFontSize = null) => ({
    docx: {
      'word/styles.xml': {
        elements: [
          {
            elements: [
              // docDefaults
              {
                name: 'w:docDefaults',
                elements: [
                  {
                    name: 'w:rPrDefault',
                    elements:
                      defaultFontSize !== null
                        ? [
                            {
                              name: 'w:rPr',
                              elements: [{ name: 'w:sz', attributes: { 'w:val': String(defaultFontSize) } }],
                            },
                          ]
                        : [{ name: 'w:rPr', elements: [] }],
                  },
                ],
              },
              // Normal style
              {
                name: 'w:style',
                attributes: { 'w:styleId': 'Normal', 'w:default': '1' },
                elements:
                  normalFontSize !== null
                    ? [{ name: 'w:rPr', elements: [{ name: 'w:sz', attributes: { 'w:val': String(normalFontSize) } }] }]
                    : [{ name: 'w:rPr', elements: [] }],
              },
            ],
          },
        ],
      },
    },
    numbering: { definitions: {}, abstracts: {} },
  });

  it('should use inline fontSize when provided', () => {
    const params = createMockParams();
    const inlineRpr = { fontSize: 28 }; // 14pt
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    expect(result.fontSize).toBe(28);
  });

  it('should use defaultProps fontSize when finalProps fontSize is null', () => {
    const params = createMockParams(24, null); // defaultProps has 24 (12pt)
    const inlineRpr = {};
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    expect(result.fontSize).toBe(24);
  });

  it('should use normalProps fontSize when defaultProps has no fontSize', () => {
    const params = createMockParams(null, 22); // normalProps has 22 (11pt)
    const inlineRpr = {};
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    expect(result.fontSize).toBe(22);
  });

  it('should use 20 half-points baseline when neither defaultProps nor normalProps has fontSize', () => {
    const params = createMockParams(null, null);
    const inlineRpr = {};
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    expect(result.fontSize).toBe(20); // 20 half-points = 10pt baseline
  });

  it('should ignore invalid fontSize value of 0', () => {
    const params = createMockParams(24, null);
    const inlineRpr = { fontSize: 0 }; // Invalid: zero
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    // Should fall back to defaultProps
    expect(result.fontSize).toBe(24);
  });

  it('should ignore negative fontSize values', () => {
    const params = createMockParams(null, 22);
    const inlineRpr = { fontSize: -10 }; // Invalid: negative
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    // Should fall back to normalProps
    expect(result.fontSize).toBe(22);
  });

  it('should ignore NaN fontSize values', () => {
    const params = createMockParams(null, null);
    const inlineRpr = { fontSize: NaN }; // Invalid: NaN
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    // Should fall back to baseline
    expect(result.fontSize).toBe(20);
  });

  it('should ignore Infinity fontSize values', () => {
    const params = createMockParams(24, null);
    const inlineRpr = { fontSize: Infinity }; // Invalid: Infinity
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    // Should fall back to defaultProps
    expect(result.fontSize).toBe(24);
  });

  it('should preserve valid fontSize from inline formatting', () => {
    const params = createMockParams(20, null);
    const inlineRpr = { fontSize: 32 }; // Valid: 16pt
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    expect(result.fontSize).toBe(32);
  });

  it('should skip invalid defaultProps fontSize and use normalProps', () => {
    const params = createMockParams(null, 26); // defaultProps invalid, normalProps has 26
    // Manually set invalid defaultProps fontSize
    const docDefaults = params.docx['word/styles.xml'].elements[0].elements[0];
    docDefaults.elements[0].elements = [{ name: 'w:rPr', elements: [{ name: 'w:sz', attributes: { 'w:val': '-5' } }] }];

    const inlineRpr = {};
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    // Should skip invalid defaultProps and use normalProps
    expect(result.fontSize).toBe(26);
  });

  it('should use baseline when all sources have invalid fontSize values', () => {
    const params = createMockParams(null, null);
    // Set both to invalid values
    const elements = params.docx['word/styles.xml'].elements[0].elements;
    elements[0].elements[0].elements = [{ name: 'w:rPr', elements: [{ name: 'w:sz', attributes: { 'w:val': '0' } }] }];
    elements[1].elements = [{ name: 'w:rPr', elements: [{ name: 'w:sz', attributes: { 'w:val': '-10' } }] }];

    const inlineRpr = { fontSize: NaN };
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    // Should fall back to baseline
    expect(result.fontSize).toBe(20);
  });

  it('should validate that defaultProps fontSize is a number', () => {
    const params = createMockParams(null, 22);
    // Manually corrupt defaultProps fontSize to be a string
    const docDefaults = params.docx['word/styles.xml'].elements[0].elements[0];
    docDefaults.elements[0].elements = [
      { name: 'w:rPr', elements: [{ name: 'w:sz', attributes: { 'w:val': 'invalid' } }] },
    ];

    const inlineRpr = {};
    const resolvedPpr = {};

    const result = resolveRunProperties(params, inlineRpr, resolvedPpr);

    // Should skip non-number defaultProps and use normalProps
    expect(result.fontSize).toBe(22);
  });
});

// =============================================================================
// CRITICAL FUNCTION UNIT TESTS
// These tests directly verify the core style resolution functions that are
// essential for correct OOXML cascade behavior. They serve as a safety net
// before any refactoring of the style resolution logic.
// =============================================================================

describe('getDefaultProperties', () => {
  // Import the function directly for unit testing
  let getDefaultProperties;

  beforeAll(async () => {
    const module = await import('./styles.js');
    getDefaultProperties = module.getDefaultProperties;
  });

  // Create a mock translator that extracts properties from the XML element
  const createMockTranslator = (xmlName) => ({
    xmlName,
    encode: (params) => {
      const node = params.nodes?.[0];
      if (!node?.elements) return {};
      const result = {};
      for (const el of node.elements) {
        if (el.name === 'w:sz') {
          result.fontSize = parseInt(el.attributes['w:val'], 10);
        }
        if (el.name === 'w:b') {
          result.bold = true;
        }
        if (el.name === 'w:i') {
          result.italic = true;
        }
        if (el.name === 'w:rFonts') {
          result.fontFamily = { ascii: el.attributes['w:ascii'] };
        }
        if (el.name === 'w:ind') {
          result.indent = {
            left: parseInt(el.attributes['w:left'] || '0', 10),
            hanging: parseInt(el.attributes['w:hanging'] || '0', 10),
          };
        }
        if (el.name === 'w:spacing') {
          result.spacing = {
            before: parseInt(el.attributes['w:before'] || '0', 10),
            after: parseInt(el.attributes['w:after'] || '0', 10),
            line: parseInt(el.attributes['w:line'] || '0', 10),
          };
        }
      }
      return result;
    },
  });

  const mockRPrTranslator = createMockTranslator('w:rPr');
  const mockPPrTranslator = createMockTranslator('w:pPr');

  it('should return empty object when styles.xml is missing', () => {
    const params = { docx: {} };
    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('should return empty object when docDefaults is missing', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [{ elements: [] }],
        },
      },
    };
    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('should extract run properties from w:rPrDefault', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [
                        {
                          name: 'w:rPr',
                          elements: [
                            { name: 'w:sz', attributes: { 'w:val': '22' } },
                            { name: 'w:rFonts', attributes: { 'w:ascii': 'Calibri' } },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = getDefaultProperties(params, mockRPrTranslator);

    expect(result.fontSize).toBe(22);
    expect(result.fontFamily).toEqual({ ascii: 'Calibri' });
  });

  it('should extract paragraph properties from w:pPrDefault', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:pPrDefault',
                      elements: [
                        {
                          name: 'w:pPr',
                          elements: [
                            { name: 'w:spacing', attributes: { 'w:after': '200', 'w:line': '276' } },
                            { name: 'w:ind', attributes: { 'w:left': '720' } },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = getDefaultProperties(params, mockPPrTranslator);

    expect(result.spacing).toEqual({ before: 0, after: 200, line: 276 });
    expect(result.indent).toEqual({ left: 720, hanging: 0 });
  });

  it('should return empty object when rPrDefault exists but has no rPr child', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [], // No w:rPr child
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('should handle both rPrDefault and pPrDefault in the same document', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [
                        {
                          name: 'w:rPr',
                          elements: [{ name: 'w:sz', attributes: { 'w:val': '24' } }],
                        },
                      ],
                    },
                    {
                      name: 'w:pPrDefault',
                      elements: [
                        {
                          name: 'w:pPr',
                          elements: [{ name: 'w:spacing', attributes: { 'w:after': '160' } }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const rPrResult = getDefaultProperties(params, mockRPrTranslator);
    const pPrResult = getDefaultProperties(params, mockPPrTranslator);

    expect(rPrResult.fontSize).toBe(24);
    expect(pPrResult.spacing).toEqual({ before: 0, after: 160, line: 0 });
  });
});

describe('getStyleProperties', () => {
  let getStyleProperties;

  beforeAll(async () => {
    const module = await import('./styles.js');
    getStyleProperties = module.getStyleProperties;
  });

  const createMockTranslator = (xmlName) => ({
    xmlName,
    encode: (params) => {
      const node = params.nodes?.[0];
      if (!node?.elements) return {};
      const result = {};
      for (const el of node.elements) {
        if (el.name === 'w:sz') {
          result.fontSize = parseInt(el.attributes['w:val'], 10);
        }
        if (el.name === 'w:b') {
          result.bold = true;
        }
        if (el.name === 'w:color') {
          result.color = { val: el.attributes['w:val'] };
        }
        if (el.name === 'w:ind') {
          result.indent = {
            left: parseInt(el.attributes['w:left'] || '0', 10),
          };
        }
      }
      return result;
    },
  });

  const mockRPrTranslator = createMockTranslator('w:rPr');

  it('should return empty result for null styleId', () => {
    const params = { docx: { 'word/styles.xml': { elements: [{ elements: [] }] } } };
    const result = getStyleProperties(params, null, mockRPrTranslator);

    expect(result).toEqual({ properties: {}, isDefault: false, basedOn: undefined });
  });

  it('should return empty result when style is not found', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [{ elements: [] }],
        },
      },
    };
    const result = getStyleProperties(params, 'NonExistentStyle', mockRPrTranslator);

    expect(result.properties).toEqual({});
    expect(result.isDefault).toBe(false);
    expect(result.basedOn).toBeUndefined();
  });

  it('should extract properties from a style definition', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Heading1', 'w:type': 'paragraph' },
                  elements: [
                    {
                      name: 'w:rPr',
                      elements: [
                        { name: 'w:sz', attributes: { 'w:val': '32' } },
                        { name: 'w:b', attributes: {} },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = getStyleProperties(params, 'Heading1', mockRPrTranslator);

    expect(result.properties.fontSize).toBe(32);
    expect(result.properties.bold).toBe(true);
    expect(result.isDefault).toBe(false);
    expect(result.basedOn).toBeUndefined();
  });

  it('should correctly identify default styles (w:default="1")', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal', 'w:type': 'paragraph', 'w:default': '1' },
                  elements: [
                    {
                      name: 'w:rPr',
                      elements: [{ name: 'w:sz', attributes: { 'w:val': '22' } }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = getStyleProperties(params, 'Normal', mockRPrTranslator);

    expect(result.isDefault).toBe(true);
    expect(result.properties.fontSize).toBe(22);
  });

  it('should extract basedOn reference correctly', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Heading1', 'w:type': 'paragraph' },
                  elements: [
                    { name: 'w:basedOn', attributes: { 'w:val': 'Normal' } },
                    {
                      name: 'w:rPr',
                      elements: [{ name: 'w:sz', attributes: { 'w:val': '32' } }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = getStyleProperties(params, 'Heading1', mockRPrTranslator);

    expect(result.basedOn).toBe('Normal');
    expect(result.properties.fontSize).toBe(32);
  });

  it('should return basedOn even when style has no properties element', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'NoIndent', 'w:type': 'paragraph' },
                  elements: [{ name: 'w:basedOn', attributes: { 'w:val': 'Normal' } }],
                  // No w:rPr element
                },
              ],
            },
          ],
        },
      },
    };

    const result = getStyleProperties(params, 'NoIndent', mockRPrTranslator);

    expect(result.basedOn).toBe('Normal');
    expect(result.properties).toEqual({});
  });

  it('should handle multiple styles and find the correct one', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal', 'w:type': 'paragraph', 'w:default': '1' },
                  elements: [
                    {
                      name: 'w:rPr',
                      elements: [{ name: 'w:sz', attributes: { 'w:val': '22' } }],
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Heading1', 'w:type': 'paragraph' },
                  elements: [
                    { name: 'w:basedOn', attributes: { 'w:val': 'Normal' } },
                    {
                      name: 'w:rPr',
                      elements: [
                        { name: 'w:sz', attributes: { 'w:val': '32' } },
                        { name: 'w:b', attributes: {} },
                      ],
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Heading2', 'w:type': 'paragraph' },
                  elements: [
                    { name: 'w:basedOn', attributes: { 'w:val': 'Normal' } },
                    {
                      name: 'w:rPr',
                      elements: [{ name: 'w:sz', attributes: { 'w:val': '26' } }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const heading1Result = getStyleProperties(params, 'Heading1', mockRPrTranslator);
    const heading2Result = getStyleProperties(params, 'Heading2', mockRPrTranslator);
    const normalResult = getStyleProperties(params, 'Normal', mockRPrTranslator);

    expect(heading1Result.properties.fontSize).toBe(32);
    expect(heading1Result.properties.bold).toBe(true);
    expect(heading1Result.basedOn).toBe('Normal');

    expect(heading2Result.properties.fontSize).toBe(26);
    expect(heading2Result.basedOn).toBe('Normal');

    expect(normalResult.properties.fontSize).toBe(22);
    expect(normalResult.isDefault).toBe(true);
  });
});

describe('getNumberingProperties', () => {
  let getNumberingProperties;

  beforeAll(async () => {
    const module = await import('./styles.js');
    getNumberingProperties = module.getNumberingProperties;
  });

  // Mock translator for pPr
  const createMockPPrTranslator = () => ({
    xmlName: 'w:pPr',
    encode: (params) => {
      const node = params.nodes?.[0];
      if (!node?.elements) return {};
      const result = {};
      for (const el of node.elements) {
        if (el.name === 'w:ind') {
          result.indent = {
            left: parseInt(el.attributes['w:left'] || '0', 10),
            hanging: parseInt(el.attributes['w:hanging'] || '0', 10),
          };
        }
        if (el.name === 'w:numPr') {
          result.numberingProperties = {};
          for (const numEl of el.elements || []) {
            if (numEl.name === 'w:numId') {
              result.numberingProperties.numId = parseInt(numEl.attributes['w:val'], 10);
            }
            if (numEl.name === 'w:ilvl') {
              result.numberingProperties.ilvl = parseInt(numEl.attributes['w:val'], 10);
            }
          }
        }
      }
      return result;
    },
  });

  // Mock translator for rPr
  const createMockRPrTranslator = () => ({
    xmlName: 'w:rPr',
    encode: (params) => {
      const node = params.nodes?.[0];
      if (!node?.elements) return {};
      const result = {};
      for (const el of node.elements) {
        if (el.name === 'w:sz') {
          result.fontSize = parseInt(el.attributes['w:val'], 10);
        }
        if (el.name === 'w:b') {
          result.bold = true;
        }
        if (el.name === 'w:rFonts') {
          result.fontFamily = { ascii: el.attributes['w:ascii'] };
        }
      }
      return result;
    },
  });

  const mockPPrTranslator = createMockPPrTranslator();
  const mockRPrTranslator = createMockRPrTranslator();

  it('should return empty object when numbering definitions are missing', () => {
    const params = { numbering: null };
    const result = getNumberingProperties(params, 0, 1, mockPPrTranslator);
    expect(result).toEqual({});
  });

  it('should return empty object when numId is not found', () => {
    const params = {
      numbering: {
        definitions: {},
        abstracts: {},
      },
    };
    const result = getNumberingProperties(params, 0, 999, mockPPrTranslator);
    expect(result).toEqual({});
  });

  it('should extract basic paragraph properties from numbering level', () => {
    const params = {
      numbering: {
        definitions: {
          1: {
            name: 'w:num',
            attributes: { 'w:numId': '1' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
          },
        },
        abstracts: {
          0: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '0' },
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '720', 'w:hanging': '360' } }],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const result = getNumberingProperties(params, 0, 1, mockPPrTranslator);

    expect(result.indent).toEqual({ left: 720, hanging: 360 });
  });

  it('should extract run properties from numbering level', () => {
    const params = {
      numbering: {
        definitions: {
          1: {
            name: 'w:num',
            attributes: { 'w:numId': '1' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
          },
        },
        abstracts: {
          0: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '0' },
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:rPr',
                    elements: [
                      { name: 'w:sz', attributes: { 'w:val': '24' } },
                      { name: 'w:b', attributes: {} },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const result = getNumberingProperties(params, 0, 1, mockRPrTranslator);

    expect(result.fontSize).toBe(24);
    expect(result.bold).toBe(true);
  });

  it('should handle multiple levels and return correct level properties', () => {
    const params = {
      numbering: {
        definitions: {
          1: {
            name: 'w:num',
            attributes: { 'w:numId': '1' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
          },
        },
        abstracts: {
          0: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '0' },
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '720', 'w:hanging': '360' } }],
                  },
                ],
              },
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '1' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '1440', 'w:hanging': '360' } }],
                  },
                ],
              },
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '2' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '2160', 'w:hanging': '360' } }],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const level0 = getNumberingProperties(params, 0, 1, mockPPrTranslator);
    const level1 = getNumberingProperties(params, 1, 1, mockPPrTranslator);
    const level2 = getNumberingProperties(params, 2, 1, mockPPrTranslator);

    expect(level0.indent.left).toBe(720);
    expect(level1.indent.left).toBe(1440);
    expect(level2.indent.left).toBe(2160);
  });

  it('should apply lvlOverride properties on top of abstract level properties', () => {
    const params = {
      numbering: {
        definitions: {
          1: {
            name: 'w:num',
            attributes: { 'w:numId': '1' },
            elements: [
              { name: 'w:abstractNumId', attributes: { 'w:val': '0' } },
              {
                name: 'w:lvlOverride',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '1080', 'w:hanging': '540' } }],
                  },
                ],
              },
            ],
          },
        },
        abstracts: {
          0: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '0' },
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '720', 'w:hanging': '360' } }],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const result = getNumberingProperties(params, 0, 1, mockPPrTranslator);

    // lvlOverride should override the abstract level properties
    expect(result.indent).toEqual({ left: 1080, hanging: 540 });
  });

  it('should extract pStyle from level definition', () => {
    const params = {
      numbering: {
        definitions: {
          1: {
            name: 'w:num',
            attributes: { 'w:numId': '1' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
          },
        },
        abstracts: {
          0: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '0' },
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  { name: 'w:pStyle', attributes: { 'w:val': 'ListParagraph' } },
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '720', 'w:hanging': '360' } }],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const result = getNumberingProperties(params, 0, 1, mockPPrTranslator);

    expect(result.styleId).toBe('ListParagraph');
  });

  it('should follow numStyleLink to resolve properties', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'ListBullet', 'w:type': 'numbering' },
                  elements: [
                    {
                      name: 'w:pPr',
                      elements: [
                        {
                          name: 'w:numPr',
                          elements: [
                            { name: 'w:numId', attributes: { 'w:val': '2' } },
                            { name: 'w:ilvl', attributes: { 'w:val': '0' } },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      numbering: {
        definitions: {
          1: {
            name: 'w:num',
            attributes: { 'w:numId': '1' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
          },
          2: {
            name: 'w:num',
            attributes: { 'w:numId': '2' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '1' } }],
          },
        },
        abstracts: {
          0: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '0' },
            elements: [{ name: 'w:numStyleLink', attributes: { 'w:val': 'ListBullet' } }],
          },
          1: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '1' },
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '360', 'w:hanging': '180' } }],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const result = getNumberingProperties(params, 0, 1, mockPPrTranslator);

    // Should follow the numStyleLink and get properties from the linked definition
    expect(result.indent).toEqual({ left: 360, hanging: 180 });
  });

  it('should prevent infinite recursion when following numStyleLink', () => {
    // Create a scenario where numStyleLink could cause infinite recursion
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'CircularStyle', 'w:type': 'numbering' },
                  elements: [
                    {
                      name: 'w:pPr',
                      elements: [
                        {
                          name: 'w:numPr',
                          elements: [{ name: 'w:numId', attributes: { 'w:val': '1' } }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      numbering: {
        definitions: {
          1: {
            name: 'w:num',
            attributes: { 'w:numId': '1' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '0' } }],
          },
        },
        abstracts: {
          0: {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '0' },
            elements: [
              { name: 'w:numStyleLink', attributes: { 'w:val': 'CircularStyle' } },
              // Also has a level definition as fallback
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '720', 'w:hanging': '360' } }],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    // Should not hang or throw - the tries parameter prevents infinite recursion
    const result = getNumberingProperties(params, 0, 1, mockPPrTranslator);

    // After following the link once and hitting the recursion limit, it should return empty
    // or the fallback level properties depending on implementation
    expect(result).toBeDefined();
  });
});

describe('isNormalDefault ordering logic', () => {
  /**
   * Tests for the critical logic that determines whether document defaults
   * or Normal style should take precedence in the cascade.
   *
   * Per OOXML spec, when Normal style is marked as w:default="1", it should
   * come AFTER document defaults in the cascade (so defaults override Normal).
   * When Normal is NOT the default style, Normal should come BEFORE defaults.
   */

  it('should apply defaults AFTER Normal when Normal is marked as default (isNormalDefault=true)', () => {
    // When Normal is the default style, the cascade should be:
    // [defaultProps, normalProps] - so defaultProps values win when both exist
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [
                        {
                          name: 'w:rPr',
                          elements: [{ name: 'w:sz', attributes: { 'w:val': '24' } }], // 12pt from defaults
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal', 'w:default': '1' }, // IS default
                  elements: [
                    {
                      name: 'w:rPr',
                      elements: [{ name: 'w:sz', attributes: { 'w:val': '22' } }], // 11pt from Normal
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      numbering: { definitions: {}, abstracts: {} },
    };

    const result = resolveRunProperties(params, {}, {});

    // When Normal is default, chain is [defaultProps, normalProps]
    // normalProps comes LAST, so Normal's 22 (11pt) should win
    expect(result.fontSize).toBe(22);
  });

  it('should apply Normal AFTER defaults when Normal is NOT marked as default (isNormalDefault=false)', () => {
    // When Normal is NOT the default style, the cascade should be:
    // [normalProps, defaultProps] - so defaults values win when both exist
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [
                        {
                          name: 'w:rPr',
                          elements: [{ name: 'w:sz', attributes: { 'w:val': '24' } }], // 12pt from defaults
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal' }, // NOT marked as default
                  elements: [
                    {
                      name: 'w:rPr',
                      elements: [{ name: 'w:sz', attributes: { 'w:val': '22' } }], // 11pt from Normal
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      numbering: { definitions: {}, abstracts: {} },
    };

    const result = resolveRunProperties(params, {}, {});

    // When Normal is NOT default, chain is [normalProps, defaultProps]
    // defaultProps comes LAST, so defaults' 24 (12pt) should win
    expect(result.fontSize).toBe(24);
  });

  it('should use Normal properties when defaults have no value', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [
                        {
                          name: 'w:rPr',
                          elements: [], // No fontSize in defaults
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal', 'w:default': '1' },
                  elements: [
                    {
                      name: 'w:rPr',
                      elements: [{ name: 'w:sz', attributes: { 'w:val': '28' } }], // 14pt from Normal
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      numbering: { definitions: {}, abstracts: {} },
    };

    const result = resolveRunProperties(params, {}, {});

    // Normal's fontSize should be used since defaults has none
    expect(result.fontSize).toBe(28);
  });

  it('should use defaults properties when Normal has no value', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [
                        {
                          name: 'w:rPr',
                          elements: [{ name: 'w:sz', attributes: { 'w:val': '26' } }], // 13pt from defaults
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal', 'w:default': '1' },
                  elements: [
                    {
                      name: 'w:rPr',
                      elements: [], // No fontSize in Normal
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      numbering: { definitions: {}, abstracts: {} },
    };

    const result = resolveRunProperties(params, {}, {});

    // defaults' fontSize should be used since Normal has none
    expect(result.fontSize).toBe(26);
  });

  it('should apply the same ordering logic for paragraph properties', () => {
    const params = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:pPrDefault',
                      elements: [
                        {
                          name: 'w:pPr',
                          elements: [{ name: 'w:spacing', attributes: { 'w:after': '200' } }],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal', 'w:default': '1' },
                  elements: [
                    {
                      name: 'w:pPr',
                      elements: [{ name: 'w:spacing', attributes: { 'w:after': '160' } }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      numbering: { definitions: {}, abstracts: {} },
    };

    const result = resolveParagraphProperties(params, {}, false, false, null);

    // When Normal is default, Normal comes last in chain and wins
    expect(result.spacing?.after).toBe(160);
  });
});
