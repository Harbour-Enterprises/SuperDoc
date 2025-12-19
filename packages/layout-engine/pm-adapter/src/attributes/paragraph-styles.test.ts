import { describe, expect, it, beforeEach, vi } from 'vitest';
import { hydrateParagraphStyleAttrs } from './paragraph-styles.js';
import * as converterStyles from '@converter/styles.js';

// Mock the external super-converter module that's imported by paragraph-styles.ts
// This module is part of super-editor package and not available in pm-adapter tests
vi.mock('@converter/styles.js');

describe('hydrateParagraphStyleAttrs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when converter context is missing', () => {
    const para = { attrs: { styleId: 'Heading1' } } as never;
    const result = hydrateParagraphStyleAttrs(para, undefined);
    expect(result).toBeNull();
    expect(converterStyles.resolveParagraphProperties).not.toHaveBeenCalled();
  });

  it('calls resolveParagraphProperties even when paragraph lacks styleId (to apply docDefaults)', () => {
    vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
      spacing: { after: 200, line: 276, lineRule: 'auto' },
    });

    const para = { attrs: {} } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(converterStyles.resolveParagraphProperties).toHaveBeenCalledWith(
      { docx: {}, numbering: {} },
      { styleId: null },
    );
    expect(result).toEqual(
      expect.objectContaining({
        spacing: { after: 200, line: 276, lineRule: 'auto' },
      }),
    );
  });

  it('delegates to resolveParagraphProperties and clones the result', () => {
    vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
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

    expect(converterStyles.resolveParagraphProperties).toHaveBeenCalledWith(
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
    expect(result?.spacing).not.toBe(
      vi.mocked(converterStyles.resolveParagraphProperties).mock.results[0]?.value?.spacing,
    );
  });

  it('zeroes inherited first-line indent for heading styles without explicit indent', () => {
    vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
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
    vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
      spacing: { after: 200, line: 276, lineRule: 'auto' },
    });

    const para = { attrs: { styleId: 'Normal' } } as never;
    hydrateParagraphStyleAttrs(para, {
      docx: { styles: {}, docDefaults: {} },
      // numbering is explicitly undefined - should receive { definitions: {}, abstracts: {} }
    });

    expect(converterStyles.resolveParagraphProperties).toHaveBeenCalledWith(
      { docx: { styles: {}, docDefaults: {} }, numbering: { definitions: {}, abstracts: {} } },
      expect.objectContaining({ styleId: 'Normal' }),
    );
  });

  it('returns null when resolveParagraphProperties returns null', () => {
    vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue(null);

    const para = { attrs: { styleId: 'Heading1' } } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(result).toBeNull();
  });

  it('returns null when resolveParagraphProperties returns undefined', () => {
    vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue(undefined);

    const para = { attrs: { styleId: 'Heading1' } } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });

    expect(result).toBeNull();
  });

  describe('table style paragraph properties cascade', () => {
    it('merges table style spacing when paragraph has no explicit spacing (table style wins)', () => {
      vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
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
      vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
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
      vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
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
      vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
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
      vi.mocked(converterStyles.resolveParagraphProperties).mockReturnValue({
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
});
