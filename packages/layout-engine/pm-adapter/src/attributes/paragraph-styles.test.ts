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

  it('returns null when paragraph lacks styleId', () => {
    const para = { attrs: {} } as never;
    const result = hydrateParagraphStyleAttrs(para, {
      docx: {},
      numbering: {},
    });
    expect(result).toBeNull();
    expect(converterStyles.resolveParagraphProperties).not.toHaveBeenCalled();
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
});
