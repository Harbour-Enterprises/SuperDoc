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
