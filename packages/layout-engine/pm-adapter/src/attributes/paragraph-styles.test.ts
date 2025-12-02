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
});
