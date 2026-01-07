import { describe, expect, it, beforeEach, vi } from 'vitest';
import { hydrateParagraphStyleAttrs, hydrateCharacterStyleAttrs, hydrateMarkerStyleAttrs } from './paragraph-styles.js';

const { resolveParagraphProperties, resolveRunProperties, resolveDocxFontFamily } = vi.hoisted(() => ({
  resolveParagraphProperties: vi.fn(),
  resolveRunProperties: vi.fn(),
  resolveDocxFontFamily: vi.fn(),
}));

// Mock the shared OOXML resolver module that's imported by paragraph-styles.ts
vi.mock('@superdoc/style-engine/ooxml', () => ({
  createOoxmlResolver: vi.fn(() => ({
    resolveParagraphProperties,
    resolveRunProperties,
    getDefaultProperties: vi.fn(),
    getStyleProperties: vi.fn(),
    resolveStyleChain: vi.fn(),
    getNumberingProperties: vi.fn(),
  })),
  resolveDocxFontFamily,
}));

describe('hydrateParagraphStyleAttrs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when converter context is missing', () => {
    const para = { attrs: { styleId: 'Heading1' } } as never;
    const result = hydrateParagraphStyleAttrs(para, undefined);
    expect(result).toBeNull();
    expect(resolveParagraphProperties).not.toHaveBeenCalled();
  });

  it('calls resolveParagraphProperties even when paragraph lacks styleId (to apply docDefaults)', () => {
    resolveParagraphProperties.mockReturnValue({
      spacing: { after: 200, line: 276, lineRule: 'auto' },
    });

    const para = { attrs: {} } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(resolveParagraphProperties).toHaveBeenCalledWith({ docx: {}, numbering: {} }, { styleId: null });
    expect(result).toEqual(
      expect.objectContaining({
        spacing: { after: 200, line: 276, lineRule: 'auto' },
      }),
    );
  });

  it('delegates to resolveParagraphProperties and clones the result', () => {
    resolveParagraphProperties.mockReturnValue({
      spacing: { before: 240 },
      indent: { left: 120 },
      borders: { top: { val: 'single', size: 8 } },
      shading: { fill: 'FFEE00' },
      justification: 'center',
      tabStops: [{ pos: 100 }],
      keepLines: true,
      keepNext: false,
      numberingProperties: { numId: 9 },
    });

    const para = { attrs: { styleId: 'Heading1' } } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(resolveParagraphProperties).toHaveBeenCalledWith(
      { docx: {}, numbering: {} },
      {
        styleId: 'Heading1',
        numberingProperties: undefined,
        indent: undefined,
        spacing: undefined,
      },
    );
    expect(result).toEqual(
      expect.objectContaining({
        spacing: { before: 240 },
        indent: { left: 120 },
        borders: { top: { val: 'single', size: 8 } },
        shading: { fill: 'FFEE00' },
        alignment: 'center',
        tabStops: [{ pos: 100 }],
        keepLines: true,
        keepNext: false,
        numberingProperties: { numId: 9 },
      }),
    );
    expect(result?.spacing).not.toBe(resolveParagraphProperties.mock.results[0]?.value?.spacing);
  });

  it('zeroes inherited first-line indent for heading styles without explicit indent', () => {
    resolveParagraphProperties.mockReturnValue({
      spacing: { after: 200 },
      indent: { firstLine: 432 }, // inherited from Normal
      outlineLvl: 1,
    });

    const para = { attrs: { styleId: 'Heading2' } } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(result?.indent).toEqual({ firstLine: 0, hanging: 0, left: undefined, right: undefined });
  });

  it('provides empty numbering fallback when context.numbering is undefined', () => {
    resolveParagraphProperties.mockReturnValue({
      spacing: { after: 200, line: 276, lineRule: 'auto' },
    });

    const para = { attrs: { styleId: 'Normal' } } as never;
    hydrateParagraphStyleAttrs(para, {
      docx: { styles: {}, docDefaults: {} },
      // numbering is explicitly undefined - should receive { definitions: {}, abstracts: {} }
    });

    expect(resolveParagraphProperties).toHaveBeenCalledWith(
      { docx: { styles: {}, docDefaults: {} }, numbering: { definitions: {}, abstracts: {} } },
      expect.objectContaining({ styleId: 'Normal' }),
    );
  });

  it('returns null when resolveParagraphProperties returns null', () => {
    resolveParagraphProperties.mockReturnValue(null);

    const para = { attrs: { styleId: 'Heading1' } } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(result).toBeNull();
  });

  it('returns null when resolveParagraphProperties returns undefined', () => {
    resolveParagraphProperties.mockReturnValue(undefined);

    const para = { attrs: { styleId: 'Heading1' } } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(result).toBeNull();
  });

  describe('table style paragraph properties cascade', () => {
    it('merges table style spacing when paragraph has no explicit spacing (table style wins)', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 100, after: 100 }, // from docDefaults or paragraph style
      });

      const para = { attrs: {} } as never; // No explicit spacing on paragraph
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
        tableStyleParagraphProps: {
          spacing: { before: 200, after: 200, line: 1.5, lineRule: 'auto' },
        },
      });

      // Table style spacing should override resolved spacing (docDefaults)
      expect(result?.spacing).toEqual({
        before: 200,
        after: 200,
        line: 1.5,
        lineRule: 'auto',
      });
    });

    it('paragraph explicit spacing wins over table style', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 300, after: 300, line: 2.0 }, // includes explicit paragraph spacing
      });

      const para = {
        attrs: {
          spacing: { before: 300, after: 300, line: 2.0 }, // Explicit on paragraph
        },
      } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
        tableStyleParagraphProps: {
          spacing: { before: 100, after: 100, line: 1.0 },
        },
      });

      // Paragraph explicit spacing should win, but table style fills in missing values
      // Since resolved already has all values, they should win
      expect(result?.spacing).toEqual({
        before: 300,
        after: 300,
        line: 2.0,
      });
    });

    it('partial paragraph spacing: paragraph has some properties, table style fills gaps', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { line: 1.5 }, // Only line from paragraph style/explicit
      });

      const para = {
        attrs: {
          spacing: { line: 1.5 }, // Only line is explicit on paragraph
        },
      } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
        tableStyleParagraphProps: {
          spacing: { before: 100, after: 100, line: 1.0, lineRule: 'auto' },
        },
      });

      // Table style should provide before/after, but paragraph's line should win
      expect(result?.spacing).toEqual({
        before: 100,
        after: 100,
        line: 1.5,
        lineRule: 'auto',
      });
    });

    it('works correctly when tableStyleParagraphProps is undefined (existing behavior)', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 100, after: 100 },
        indent: { left: 120 },
      });

      const para = { attrs: {} } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
        // No tableStyleParagraphProps
      });

      // Should use resolved spacing as-is (no table style to merge)
      expect(result?.spacing).toEqual({
        before: 100,
        after: 100,
      });
      expect(result?.indent).toEqual({ left: 120 });
    });

    it('works correctly when tableStyleParagraphProps.spacing is undefined', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 100, after: 100 },
      });

      const para = { attrs: {} } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
        tableStyleParagraphProps: {}, // No spacing in table style
      });

      // Should use resolved spacing as-is
      expect(result?.spacing).toEqual({
        before: 100,
        after: 100,
      });
    });
  });

  describe('contextualSpacing extraction', () => {
    it('extracts contextualSpacing=true from resolved paragraph properties', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 100, after: 100 },
        contextualSpacing: true,
      });

      const para = { attrs: { styleId: 'ListBullet' } } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
      });

      expect(result?.contextualSpacing).toBe(true);
    });

    it('extracts contextualSpacing=false from resolved paragraph properties', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 100, after: 100 },
        contextualSpacing: false,
      });

      const para = { attrs: { styleId: 'Normal' } } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
      });

      expect(result?.contextualSpacing).toBe(false);
    });

    it('omits contextualSpacing when not present in resolved properties', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 100, after: 100 },
        // No contextualSpacing property
      });

      const para = { attrs: { styleId: 'Heading1' } } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
      });

      expect(result?.contextualSpacing).toBeUndefined();
    });

    it('includes contextualSpacing in hydration result alongside other properties', () => {
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 240, after: 120 },
        indent: { left: 720 },
        contextualSpacing: true,
        keepLines: true,
        justification: 'left',
      });

      const para = { attrs: { styleId: 'ListBullet' } } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
      });

      expect(result).toEqual(
        expect.objectContaining({
          spacing: { before: 240, after: 120 },
          indent: { left: 720 },
          contextualSpacing: true,
          keepLines: true,
          alignment: 'left',
        }),
      );
    });

    it('handles contextualSpacing from style cascade (ListBullet style example)', () => {
      // ListBullet style typically defines contextualSpacing to suppress spacing
      // between consecutive list items of the same style
      resolveParagraphProperties.mockReturnValue({
        spacing: { before: 0, after: 0 },
        indent: { left: 720, hanging: 360 },
        contextualSpacing: true, // "Don't add space between paragraphs of the same style"
      });

      const para = { attrs: { styleId: 'ListBullet' } } as never;
      const result = hydrateParagraphStyleAttrs(para, {
        docx: {},
        numbering: {},
      });

      expect(result?.contextualSpacing).toBe(true);
      expect(result?.spacing).toEqual({ before: 0, after: 0 });
    });
  });
});

describe('hydrateCharacterStyleAttrs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when context is missing', () => {
    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, undefined);
    expect(result).toBeNull();
    expect(resolveRunProperties).not.toHaveBeenCalled();
  });

  it('returns null when context.docx is missing', () => {
    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, {} as never);
    expect(result).toBeNull();
  });

  it('extracts fontFamily, fontSize, color, bold, italic, strike, underline, letterSpacing', () => {
    resolveRunProperties.mockReturnValue({
      fontFamily: { ascii: 'Calibri', hAnsi: 'Calibri' },
      fontSize: 22,
      color: { val: 'FF0000' },
      bold: true,
      italic: false,
      strike: true,
      underline: { 'w:val': 'single', 'w:color': '0000FF' },
      letterSpacing: 20,
    });
    resolveDocxFontFamily.mockReturnValue('Calibri');

    const para = { attrs: { styleId: 'Normal' } } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {}, numbering: {} });

    expect(result).toEqual({
      fontFamily: 'Calibri',
      fontSize: 22,
      color: 'FF0000',
      bold: true,
      italic: false,
      strike: true,
      underline: { type: 'single', color: '0000FF' },
      letterSpacing: 20,
    });
  });

  it('handles missing/null values gracefully', () => {
    resolveRunProperties.mockReturnValue({
      fontSize: 20,
    });

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result).toEqual({
      fontFamily: undefined,
      fontSize: 20,
      color: undefined,
      bold: undefined,
      italic: undefined,
      strike: undefined,
      underline: undefined,
      letterSpacing: undefined,
    });
  });

  it("uses paragraph's styleId for resolution", () => {
    resolveRunProperties.mockReturnValue({ fontSize: 24 });

    const para = { attrs: { styleId: 'Heading1' } } as never;
    hydrateCharacterStyleAttrs(para, { docx: {}, numbering: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      { docx: {}, numbering: {} }, // numbering is provided, so no fallback is applied
      {},
      { styleId: 'Heading1' },
      false,
      false,
    );
  });

  it('does NOT use paragraphProperties.runProperties as inline run properties (w:pPr/w:rPr is for new text only)', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = {
      attrs: {
        paragraphProperties: {
          runProperties: { fontSize: 24, bold: true },
        },
      },
    } as never;
    hydrateCharacterStyleAttrs(para, { docx: {} });

    // inlineRpr should be empty - paragraph's runProperties (w:pPr/w:rPr) is only for new text,
    // not for existing runs. Runs without explicit formatting inherit from style cascade only.
    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      {}, // Empty inline run properties
      expect.anything(),
      false,
      false,
    );
  });

  it('does NOT use attrs.runProperties as inline run properties (w:pPr/w:rPr is for new text only)', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = {
      attrs: {
        runProperties: { italic: true },
      },
    } as never;
    hydrateCharacterStyleAttrs(para, { docx: {} });

    // inlineRpr should be empty - paragraph's runProperties is for new text only
    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      {}, // Empty inline run properties
      expect.anything(),
      false,
      false,
    );
  });

  it('returns null when resolveRunProperties returns null', () => {
    resolveRunProperties.mockReturnValue(null);

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result).toBeNull();
  });

  it('returns null when resolveRunProperties returns non-object', () => {
    resolveRunProperties.mockReturnValue('invalid' as never);

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result).toBeNull();
  });

  it('returns null when resolveRunProperties throws', () => {
    resolveRunProperties.mockImplementation(() => {
      throw new Error('Resolution failed');
    });

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result).toBeNull();
  });

  it('passes preResolved paragraph properties to resolveRunProperties', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = { attrs: {} } as never;
    const preResolved = { styleId: 'Custom', spacing: { before: 100 } };
    hydrateCharacterStyleAttrs(para, { docx: {} }, preResolved);

    expect(resolveRunProperties).toHaveBeenCalledWith(expect.anything(), expect.anything(), preResolved, false, false);
  });

  it('includes numberingProperties in pprForChain when present', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = {
      attrs: {
        styleId: 'ListParagraph',
        numberingProperties: { numId: 1, ilvl: 0 },
      },
    } as never;
    hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { styleId: 'ListParagraph', numberingProperties: { numId: 1, ilvl: 0 } },
      false,
      false,
    );
  });

  it('defaults fontSize to 20 when resolved fontSize is invalid', () => {
    resolveRunProperties.mockReturnValue({
      fontSize: 'invalid',
    });

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result?.fontSize).toBe(20);
  });

  it('normalizes boolean properties correctly', () => {
    resolveRunProperties.mockReturnValue({
      bold: 1,
      italic: '1',
      strike: 'true',
      fontSize: 22,
    });

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result?.bold).toBe(true);
    expect(result?.italic).toBe(true);
    expect(result?.strike).toBe(true);
  });

  it('extracts color value correctly', () => {
    resolveRunProperties.mockReturnValue({
      color: { val: 'auto' },
      fontSize: 22,
    });

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result?.color).toBeUndefined(); // 'auto' is filtered out
  });

  it('extracts underline with type and color', () => {
    resolveRunProperties.mockReturnValue({
      underline: { type: 'double', color: 'FF0000' },
      fontSize: 22,
    });

    const para = { attrs: {} } as never;
    const result = hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(result?.underline).toEqual({ type: 'double', color: 'FF0000' });
  });

  it('provides empty numbering fallback when context.numbering is undefined', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = { attrs: {} } as never;
    hydrateCharacterStyleAttrs(para, { docx: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      { docx: {}, numbering: { definitions: {}, abstracts: {} } },
      expect.anything(),
      expect.anything(),
      false,
      false,
    );
  });
});

describe('hydrateMarkerStyleAttrs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when context is missing', () => {
    const para = { attrs: {} } as never;
    const result = hydrateMarkerStyleAttrs(para, undefined);
    expect(result).toBeNull();
    expect(resolveRunProperties).not.toHaveBeenCalled();
  });

  it('resolves marker properties with isListNumber=true', () => {
    resolveRunProperties.mockReturnValue({
      fontSize: 22,
      bold: true,
      fontFamily: { ascii: 'Calibri' },
    });
    resolveDocxFontFamily.mockReturnValue('Calibri');

    const para = {
      attrs: {
        styleId: 'ListParagraph',
        numberingProperties: { numId: 1, ilvl: 0 },
      },
    } as never;
    const result = hydrateMarkerStyleAttrs(para, { docx: {}, numbering: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ numberingProperties: { numId: 1, ilvl: 0 } }),
      true, // isListNumber
      true, // numberingDefinedInline
    );
    expect(result).toEqual({
      fontSize: 22,
      bold: true,
      fontFamily: 'Calibri',
      color: undefined,
      italic: undefined,
      strike: undefined,
      underline: undefined,
      letterSpacing: undefined,
    });
  });

  it('handles numberingDefinedInline flag correctly', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = {
      attrs: {
        numberingProperties: { numId: 1, ilvl: 0 },
      },
    } as never;
    hydrateMarkerStyleAttrs(para, { docx: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      true, // numberingDefinedInline = true because numId is in attrs
    );
  });

  it('sets numberingDefinedInline to false when numId is not present', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = { attrs: {} } as never;
    hydrateMarkerStyleAttrs(para, { docx: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      false, // numberingDefinedInline = false
    );
  });

  it('falls back properly when numbering context is empty', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = { attrs: {} } as never;
    hydrateMarkerStyleAttrs(para, { docx: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      { docx: {}, numbering: { definitions: {}, abstracts: {} } },
      expect.anything(),
      expect.anything(),
      true,
      false,
    );
  });

  it('does NOT use paragraphProperties.runProperties for marker (w:pPr/w:rPr is for new text only)', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = {
      attrs: {
        paragraphProperties: {
          runProperties: { bold: true },
        },
      },
    } as never;
    hydrateMarkerStyleAttrs(para, { docx: {} });

    // Marker styling comes from numbering definition rPr, not from paragraph's w:pPr/w:rPr
    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      {}, // Empty inline run properties
      expect.anything(),
      true,
      false,
    );
  });

  it('uses preResolved paragraph properties', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = { attrs: {} } as never;
    const preResolved = { styleId: 'ListParagraph', numberingProperties: { numId: 2 } };
    hydrateMarkerStyleAttrs(para, { docx: {} }, preResolved);

    expect(resolveRunProperties).toHaveBeenCalledWith(expect.anything(), expect.anything(), preResolved, true, false);
  });

  it('merges styleId from para when preResolved lacks it', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = { attrs: { styleId: 'Heading1' } } as never;
    const preResolved = { spacing: { before: 100 } };
    hydrateMarkerStyleAttrs(para, { docx: {} }, preResolved);

    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { spacing: { before: 100 }, styleId: 'Heading1' },
      true,
      false,
    );
  });

  it('returns null when resolveRunProperties returns null', () => {
    resolveRunProperties.mockReturnValue(null);

    const para = { attrs: {} } as never;
    const result = hydrateMarkerStyleAttrs(para, { docx: {} });

    expect(result).toBeNull();
  });

  it('returns null when resolveRunProperties throws', () => {
    resolveRunProperties.mockImplementation(() => {
      throw new Error('Resolution failed');
    });

    const para = { attrs: {} } as never;
    const result = hydrateMarkerStyleAttrs(para, { docx: {} });

    expect(result).toBeNull();
  });

  it('handles numberingProperties from paragraphProperties', () => {
    resolveRunProperties.mockReturnValue({ fontSize: 22 });

    const para = {
      attrs: {
        paragraphProperties: {
          numberingProperties: { numId: 3, ilvl: 1 },
        },
      },
    } as never;
    hydrateMarkerStyleAttrs(para, { docx: {} });

    expect(resolveRunProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ numberingProperties: { numId: 3, ilvl: 1 } }),
      true,
      true,
    );
  });
});

describe('helper functions', () => {
  describe('extractColorValue', () => {
    // Access the internal functions via module import would require exposing them
    // Since they're internal, we test them indirectly through hydrateCharacterStyleAttrs
    it('extracts valid color from resolved properties', () => {
      resolveRunProperties.mockReturnValue({
        color: { val: 'FF0000' },
        fontSize: 22,
      });

      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });

      expect(result?.color).toBe('FF0000');
    });

    it('ignores auto color', () => {
      resolveRunProperties.mockReturnValue({
        color: { val: 'auto' },
        fontSize: 22,
      });

      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });

      expect(result?.color).toBeUndefined();
    });

    it('handles null color', () => {
      resolveRunProperties.mockReturnValue({
        color: null,
        fontSize: 22,
      });

      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });

      expect(result?.color).toBeUndefined();
    });

    it('handles invalid color object', () => {
      resolveRunProperties.mockReturnValue({
        color: { val: 123 },
        fontSize: 22,
      });

      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });

      expect(result?.color).toBeUndefined();
    });
  });

  describe('normalizeBooleanProp', () => {
    it('normalizes true boolean', () => {
      resolveRunProperties.mockReturnValue({ bold: true, fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(true);
    });

    it('normalizes false boolean', () => {
      resolveRunProperties.mockReturnValue({ bold: false, fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(false);
    });

    it('normalizes 1 to true', () => {
      resolveRunProperties.mockReturnValue({ bold: 1, fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(true);
    });

    it('normalizes 0 to false', () => {
      resolveRunProperties.mockReturnValue({ bold: 0, fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(false);
    });

    it('normalizes "1" to true', () => {
      resolveRunProperties.mockReturnValue({ bold: '1', fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(true);
    });

    it('normalizes "0" to false', () => {
      resolveRunProperties.mockReturnValue({ bold: '0', fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(false);
    });

    it('normalizes "true" to true', () => {
      resolveRunProperties.mockReturnValue({ bold: 'true', fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(true);
    });

    it('normalizes "false" to false', () => {
      resolveRunProperties.mockReturnValue({ bold: 'false', fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(false);
    });

    it('normalizes "on" to true', () => {
      resolveRunProperties.mockReturnValue({ bold: 'on', fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(true);
    });

    it('normalizes "off" to false', () => {
      resolveRunProperties.mockReturnValue({ bold: 'off', fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(false);
    });

    it('normalizes empty string to true (OOXML convention)', () => {
      resolveRunProperties.mockReturnValue({ bold: '', fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBe(true);
    });

    it('handles null as undefined', () => {
      resolveRunProperties.mockReturnValue({ bold: null, fontSize: 22 });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.bold).toBeUndefined();
    });
  });

  describe('extractUnderline', () => {
    it('extracts w:val and type', () => {
      resolveRunProperties.mockReturnValue({
        underline: { 'w:val': 'single' },
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toEqual({ type: 'single', color: undefined });
    });

    it('extracts type without w: prefix', () => {
      resolveRunProperties.mockReturnValue({
        underline: { type: 'double' },
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toEqual({ type: 'double', color: undefined });
    });

    it('extracts val property', () => {
      resolveRunProperties.mockReturnValue({
        underline: { val: 'thick' },
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toEqual({ type: 'thick', color: undefined });
    });

    it('extracts w:color', () => {
      resolveRunProperties.mockReturnValue({
        underline: { 'w:val': 'single', 'w:color': 'FF0000' },
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toEqual({ type: 'single', color: 'FF0000' });
    });

    it('extracts color without w: prefix', () => {
      resolveRunProperties.mockReturnValue({
        underline: { type: 'double', color: '00FF00' },
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toEqual({ type: 'double', color: '00FF00' });
    });

    it('handles "none" underline as undefined', () => {
      resolveRunProperties.mockReturnValue({
        underline: { 'w:val': 'none' },
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toBeUndefined();
    });

    it('handles null underline', () => {
      resolveRunProperties.mockReturnValue({
        underline: null,
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toBeUndefined();
    });

    it('handles invalid underline object', () => {
      resolveRunProperties.mockReturnValue({
        underline: {},
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toBeUndefined();
    });

    it('handles non-string color value', () => {
      resolveRunProperties.mockReturnValue({
        underline: { type: 'single', color: 123 },
        fontSize: 22,
      });
      const para = { attrs: {} } as never;
      const result = hydrateCharacterStyleAttrs(para, { docx: {} });
      expect(result?.underline).toEqual({ type: 'single', color: undefined });
    });
  });
});
