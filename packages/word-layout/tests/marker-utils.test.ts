import { describe, expect, it } from 'vitest';

import { buildFontCss, formatMarkerText, type NumberingFormat } from '../src/marker-utils.js';
import type { ResolvedNumberingProperties, ResolvedRunProperties } from '../src/types.js';

// Helper functions are not exported, so we test them through the public API
// However, we can create test helpers that mirror their behavior for direct testing

/**
 * Test helper to access toAlpha functionality through formatMarkerText
 */
const testToAlpha = (value: number, uppercase: boolean): string => {
  const format: NumberingFormat = uppercase ? 'upperLetter' : 'lowerLetter';
  const numbering: ResolvedNumberingProperties = {
    numId: '1',
    ilvl: 0,
    format,
    lvlText: '%1',
    path: [value],
  };
  return formatMarkerText(numbering);
};

/**
 * Test helper to access toRoman functionality through formatMarkerText
 */
const testToRoman = (value: number, uppercase: boolean): string => {
  const format: NumberingFormat = uppercase ? 'upperRoman' : 'lowerRoman';
  const numbering: ResolvedNumberingProperties = {
    numId: '1',
    ilvl: 0,
    format,
    lvlText: '%1',
    path: [value],
  };
  return formatMarkerText(numbering);
};

/**
 * Test helper to access formatDecimal functionality through formatMarkerText
 */
const testFormatDecimal = (value: number): string => {
  const numbering: ResolvedNumberingProperties = {
    numId: '1',
    ilvl: 0,
    format: 'decimal',
    lvlText: '%1',
    path: [value],
  };
  return formatMarkerText(numbering);
};

/**
 * Test helper to access applyFormat functionality through formatMarkerText
 */
const testApplyFormat = (value: number, format?: NumberingFormat): string => {
  const numbering: ResolvedNumberingProperties = {
    numId: '1',
    ilvl: 0,
    format,
    lvlText: '%1',
    path: [value],
  };
  return formatMarkerText(numbering);
};

describe('formatMarkerText', () => {
  it('returns empty string for null numbering', () => {
    expect(formatMarkerText(null)).toBe('');
  });

  it('returns empty string for undefined numbering', () => {
    expect(formatMarkerText(undefined)).toBe('');
  });

  it('formats bullet markers using lvlText', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'bullet',
      lvlText: '▪',
      path: [1],
    };
    expect(formatMarkerText(numbering)).toBe('▪');
  });

  it('uses default bullet when lvlText is missing', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'bullet',
      path: [1],
    };
    expect(formatMarkerText(numbering)).toBe('•');
  });

  it('formats single-level decimal with default pattern', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'decimal',
      path: [5],
    };
    expect(formatMarkerText(numbering)).toBe('5.');
  });

  it('formats multi-level decimal (e.g., "1.2.3.")', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 2,
      format: 'decimal',
      lvlText: '%1.%2.%3.',
      path: [1, 2, 3],
    };
    expect(formatMarkerText(numbering)).toBe('1.2.3.');
  });

  it('formats lowerLetter correctly for 1 → "a"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'lowerLetter',
      lvlText: '%1)',
      path: [1],
    };
    expect(formatMarkerText(numbering)).toBe('a)');
  });

  it('formats lowerLetter correctly for 26 → "z"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'lowerLetter',
      lvlText: '%1)',
      path: [26],
    };
    expect(formatMarkerText(numbering)).toBe('z)');
  });

  it('formats lowerLetter correctly for 27 → "aa"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'lowerLetter',
      lvlText: '%1)',
      path: [27],
    };
    expect(formatMarkerText(numbering)).toBe('aa)');
  });

  it('formats upperLetter correctly for 1 → "A"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperLetter',
      lvlText: '%1)',
      path: [1],
    };
    expect(formatMarkerText(numbering)).toBe('A)');
  });

  it('formats upperLetter correctly for 26 → "Z"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperLetter',
      lvlText: '%1)',
      path: [26],
    };
    expect(formatMarkerText(numbering)).toBe('Z)');
  });

  it('formats upperLetter correctly for 27 → "AA"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperLetter',
      lvlText: '%1)',
      path: [27],
    };
    expect(formatMarkerText(numbering)).toBe('AA)');
  });

  it('formats lowerRoman correctly for 1 → "i"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'lowerRoman',
      lvlText: '%1.',
      path: [1],
    };
    expect(formatMarkerText(numbering)).toBe('i.');
  });

  it('formats lowerRoman correctly for 4 → "iv"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'lowerRoman',
      lvlText: '%1.',
      path: [4],
    };
    expect(formatMarkerText(numbering)).toBe('iv.');
  });

  it('formats lowerRoman correctly for 9 → "ix"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'lowerRoman',
      lvlText: '%1.',
      path: [9],
    };
    expect(formatMarkerText(numbering)).toBe('ix.');
  });

  it('formats upperRoman correctly for 1 → "I"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperRoman',
      lvlText: '%1.',
      path: [1],
    };
    expect(formatMarkerText(numbering)).toBe('I.');
  });

  it('formats upperRoman correctly for 4 → "IV"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperRoman',
      lvlText: '%1.',
      path: [4],
    };
    expect(formatMarkerText(numbering)).toBe('IV.');
  });

  it('formats upperRoman correctly for 9 → "IX"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperRoman',
      lvlText: '%1.',
      path: [9],
    };
    expect(formatMarkerText(numbering)).toBe('IX.');
  });

  it('formats upperRoman correctly for 40 → "XL"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperRoman',
      lvlText: '%1.',
      path: [40],
    };
    expect(formatMarkerText(numbering)).toBe('XL.');
  });

  it('formats upperRoman correctly for 90 → "XC"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperRoman',
      lvlText: '%1.',
      path: [90],
    };
    expect(formatMarkerText(numbering)).toBe('XC.');
  });

  it('formats upperRoman correctly for 400 → "CD"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperRoman',
      lvlText: '%1.',
      path: [400],
    };
    expect(formatMarkerText(numbering)).toBe('CD.');
  });

  it('formats upperRoman correctly for 900 → "CM"', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'upperRoman',
      lvlText: '%1.',
      path: [900],
    };
    expect(formatMarkerText(numbering)).toBe('CM.');
  });

  it('uses start value when path is missing', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'decimal',
      lvlText: '%1.',
      start: 5,
    };
    expect(formatMarkerText(numbering)).toBe('5.');
  });

  it('defaults to 1 when both path and start are missing', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'decimal',
      lvlText: '%1.',
    };
    expect(formatMarkerText(numbering)).toBe('1.');
  });

  it('handles empty path array', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 0,
      format: 'decimal',
      lvlText: '%1.',
      path: [],
      start: 3,
    };
    expect(formatMarkerText(numbering)).toBe('3.');
  });

  it('handles multi-level pattern with missing path indices', () => {
    const numbering: ResolvedNumberingProperties = {
      numId: '1',
      ilvl: 2,
      format: 'decimal',
      lvlText: '%1.%2.%3.%4.',
      path: [1, 2],
    };
    // Should fall back to last available value or 1
    expect(formatMarkerText(numbering)).toBe('1.2.2.2.');
  });

  describe('error handling', () => {
    it('handles invalid format gracefully (defaults to decimal)', () => {
      const numbering: ResolvedNumberingProperties = {
        numId: '1',
        ilvl: 0,
        format: 'invalidFormat' as NumberingFormat,
        lvlText: '%1.',
        path: [5],
      };
      expect(formatMarkerText(numbering)).toBe('5.');
    });

    it('handles malformed lvlText patterns with no placeholders', () => {
      const numbering: ResolvedNumberingProperties = {
        numId: '1',
        ilvl: 0,
        format: 'decimal',
        lvlText: 'no-pattern-here',
        path: [5],
      };
      expect(formatMarkerText(numbering)).toBe('no-pattern-here');
    });

    it('handles malformed lvlText with invalid placeholder numbers', () => {
      const numbering: ResolvedNumberingProperties = {
        numId: '1',
        ilvl: 0,
        format: 'decimal',
        lvlText: '%0.%abc.%.',
        path: [5],
      };
      // %0 maps to path[-1] which falls back to last value (5)
      // %abc doesn't match \d+ pattern so stays as-is
      // %. doesn't match \d+ pattern so stays as-is
      expect(formatMarkerText(numbering)).toBe('5.%abc.%.');
    });

    it('handles very large path indices (> 1000)', () => {
      const numbering: ResolvedNumberingProperties = {
        numId: '1',
        ilvl: 0,
        format: 'decimal',
        lvlText: '%1.',
        path: [10000],
      };
      expect(formatMarkerText(numbering)).toBe('10000.');
    });

    it('handles negative numbers in path (formats as-is)', () => {
      const numbering: ResolvedNumberingProperties = {
        numId: '1',
        ilvl: 0,
        format: 'decimal',
        lvlText: '%1.',
        path: [-5],
      };
      expect(formatMarkerText(numbering)).toBe('-5.');
    });

    it('handles zero in path', () => {
      const numbering: ResolvedNumberingProperties = {
        numId: '1',
        ilvl: 0,
        format: 'decimal',
        lvlText: '%1.',
        path: [0],
      };
      expect(formatMarkerText(numbering)).toBe('0.');
    });
  });
});

describe('buildFontCss', () => {
  it('builds basic font CSS with defaults', () => {
    const run: ResolvedRunProperties = {
      fontFamily: 'Arial',
      fontSize: 14,
    };
    expect(buildFontCss(run)).toBe('14px Arial');
  });

  it('includes bold weight', () => {
    const run: ResolvedRunProperties = {
      fontFamily: 'Calibri',
      fontSize: 12,
      bold: true,
    };
    expect(buildFontCss(run)).toBe('bold 12px Calibri');
  });

  it('includes italic style', () => {
    const run: ResolvedRunProperties = {
      fontFamily: 'Times New Roman',
      fontSize: 11,
      italic: true,
    };
    expect(buildFontCss(run)).toBe('italic 11px Times New Roman');
  });

  it('includes both bold and italic', () => {
    const run: ResolvedRunProperties = {
      fontFamily: 'Georgia',
      fontSize: 16,
      bold: true,
      italic: true,
    };
    expect(buildFontCss(run)).toBe('italic bold 16px Georgia');
  });

  it('uses empty string when fontFamily is empty', () => {
    const run: ResolvedRunProperties = {
      fontFamily: '',
      fontSize: 12,
    };
    const result = buildFontCss(run);
    expect(result).toBe('12px ');
  });

  it('clamps 0px fontSize to minimum of 1px', () => {
    const run: ResolvedRunProperties = {
      fontFamily: 'Arial',
      fontSize: 0,
    };
    const result = buildFontCss(run);
    expect(result).toBe('1px Arial');
  });

  it('handles undefined fontSize by using default', () => {
    const run = {
      fontFamily: 'Arial',
    } as ResolvedRunProperties;
    const result = buildFontCss(run);
    expect(result).toContain('12px');
  });

  it('handles undefined fontFamily by using default', () => {
    const run = {
      fontSize: 14,
    } as ResolvedRunProperties;
    const result = buildFontCss(run);
    expect(result).toContain('Times New Roman');
  });

  describe('font size validation', () => {
    it('clamps negative fontSize to minimum of 1px', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial',
        fontSize: -5,
      };
      expect(buildFontCss(run)).toBe('1px Arial');
    });

    it('clamps very large fontSize to maximum of 999px', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial',
        fontSize: 10000,
      };
      expect(buildFontCss(run)).toBe('999px Arial');
    });

    it('floors decimal fontSize values', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial',
        fontSize: 14.7,
      };
      expect(buildFontCss(run)).toBe('14px Arial');
    });

    it('floors decimal fontSize close to next integer', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial',
        fontSize: 15.99,
      };
      expect(buildFontCss(run)).toBe('15px Arial');
    });

    it('handles NaN fontSize by using default', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial',
        fontSize: NaN,
      };
      expect(buildFontCss(run)).toBe('12px Arial');
    });

    it('handles Infinity fontSize by using default', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial',
        fontSize: Infinity,
      };
      expect(buildFontCss(run)).toBe('12px Arial');
    });

    it('handles -Infinity fontSize by using default', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial',
        fontSize: -Infinity,
      };
      expect(buildFontCss(run)).toBe('12px Arial');
    });
  });

  describe('font family edge cases', () => {
    it('handles multi-word font families', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Times New Roman',
        fontSize: 12,
      };
      expect(buildFontCss(run)).toBe('12px Times New Roman');
    });

    it('handles font families with quotes (passed through as-is)', () => {
      const run: ResolvedRunProperties = {
        fontFamily: '"Courier New"',
        fontSize: 12,
      };
      expect(buildFontCss(run)).toBe('12px "Courier New"');
    });

    it('handles font families with fallbacks (commas)', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 12,
      };
      expect(buildFontCss(run)).toBe('12px Arial, Helvetica, sans-serif');
    });

    it('handles font families with special characters', () => {
      const run: ResolvedRunProperties = {
        fontFamily: 'Noto Sans CJK JP',
        fontSize: 14,
      };
      expect(buildFontCss(run)).toBe('14px Noto Sans CJK JP');
    });
  });
});

describe('toAlpha (via formatMarkerText)', () => {
  describe('basic conversion', () => {
    it('converts 1 to "a" (lowercase)', () => {
      expect(testToAlpha(1, false)).toBe('a');
    });

    it('converts 1 to "A" (uppercase)', () => {
      expect(testToAlpha(1, true)).toBe('A');
    });

    it('converts 26 to "z" (lowercase)', () => {
      expect(testToAlpha(26, false)).toBe('z');
    });

    it('converts 26 to "Z" (uppercase)', () => {
      expect(testToAlpha(26, true)).toBe('Z');
    });
  });

  describe('multi-letter conversion', () => {
    it('converts 27 to "aa" (lowercase)', () => {
      expect(testToAlpha(27, false)).toBe('aa');
    });

    it('converts 27 to "AA" (uppercase)', () => {
      expect(testToAlpha(27, true)).toBe('AA');
    });

    it('converts 52 to "az" (lowercase)', () => {
      expect(testToAlpha(52, false)).toBe('az');
    });

    it('converts 52 to "AZ" (uppercase)', () => {
      expect(testToAlpha(52, true)).toBe('AZ');
    });

    it('converts 53 to "ba" (lowercase)', () => {
      expect(testToAlpha(53, false)).toBe('ba');
    });

    it('converts 702 to "zz" (lowercase)', () => {
      expect(testToAlpha(702, false)).toBe('zz');
    });

    it('converts 702 to "ZZ" (uppercase)', () => {
      expect(testToAlpha(702, true)).toBe('ZZ');
    });

    it('converts 703 to "aaa" (lowercase)', () => {
      expect(testToAlpha(703, false)).toBe('aaa');
    });

    it('converts 703 to "AAA" (uppercase)', () => {
      expect(testToAlpha(703, true)).toBe('AAA');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for 0', () => {
      expect(testToAlpha(0, false)).toBe('');
    });

    it('returns empty string for negative numbers', () => {
      expect(testToAlpha(-5, false)).toBe('');
    });

    it('returns empty string for NaN', () => {
      expect(testToAlpha(NaN, false)).toBe('');
    });

    it('returns empty string for Infinity', () => {
      expect(testToAlpha(Infinity, false)).toBe('');
    });

    it('returns empty string for -Infinity', () => {
      expect(testToAlpha(-Infinity, false)).toBe('');
    });

    it('floors decimal values (5.7 becomes "e")', () => {
      expect(testToAlpha(5.7, false)).toBe('e');
    });

    it('floors decimal values (27.9 becomes "aa")', () => {
      expect(testToAlpha(27.9, false)).toBe('aa');
    });
  });

  describe('large values', () => {
    it('converts 18278 to "zzz" (lowercase)', () => {
      expect(testToAlpha(18278, false)).toBe('zzz');
    });

    it('converts 18278 to "ZZZ" (uppercase)', () => {
      expect(testToAlpha(18278, true)).toBe('ZZZ');
    });
  });
});

describe('toRoman (via formatMarkerText)', () => {
  describe('basic values', () => {
    it('converts 1 to "I"', () => {
      expect(testToRoman(1, true)).toBe('I');
    });

    it('converts 2 to "II"', () => {
      expect(testToRoman(2, true)).toBe('II');
    });

    it('converts 3 to "III"', () => {
      expect(testToRoman(3, true)).toBe('III');
    });

    it('converts 5 to "V"', () => {
      expect(testToRoman(5, true)).toBe('V');
    });

    it('converts 10 to "X"', () => {
      expect(testToRoman(10, true)).toBe('X');
    });

    it('converts 50 to "L"', () => {
      expect(testToRoman(50, true)).toBe('L');
    });

    it('converts 100 to "C"', () => {
      expect(testToRoman(100, true)).toBe('C');
    });

    it('converts 500 to "D"', () => {
      expect(testToRoman(500, true)).toBe('D');
    });

    it('converts 1000 to "M"', () => {
      expect(testToRoman(1000, true)).toBe('M');
    });
  });

  describe('subtractive notation', () => {
    it('converts 4 to "IV"', () => {
      expect(testToRoman(4, true)).toBe('IV');
    });

    it('converts 9 to "IX"', () => {
      expect(testToRoman(9, true)).toBe('IX');
    });

    it('converts 40 to "XL"', () => {
      expect(testToRoman(40, true)).toBe('XL');
    });

    it('converts 90 to "XC"', () => {
      expect(testToRoman(90, true)).toBe('XC');
    });

    it('converts 400 to "CD"', () => {
      expect(testToRoman(400, true)).toBe('CD');
    });

    it('converts 900 to "CM"', () => {
      expect(testToRoman(900, true)).toBe('CM');
    });
  });

  describe('large values', () => {
    it('converts 1994 to "MCMXCIV"', () => {
      expect(testToRoman(1994, true)).toBe('MCMXCIV');
    });

    it('converts 2024 to "MMXXIV"', () => {
      expect(testToRoman(2024, true)).toBe('MMXXIV');
    });

    it('converts 3999 to "MMMCMXCIX"', () => {
      expect(testToRoman(3999, true)).toBe('MMMCMXCIX');
    });

    it('converts values beyond standard range (4000)', () => {
      // While non-standard, the function should still produce output
      expect(testToRoman(4000, true)).toBe('MMMM');
    });
  });

  describe('uppercase/lowercase', () => {
    it('converts 4 to "iv" (lowercase)', () => {
      expect(testToRoman(4, false)).toBe('iv');
    });

    it('converts 1994 to "mcmxciv" (lowercase)', () => {
      expect(testToRoman(1994, false)).toBe('mcmxciv');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for 0', () => {
      expect(testToRoman(0, true)).toBe('');
    });

    it('returns empty string for negative numbers', () => {
      expect(testToRoman(-5, true)).toBe('');
    });

    it('returns empty string for NaN', () => {
      expect(testToRoman(NaN, true)).toBe('');
    });

    it('returns empty string for Infinity', () => {
      expect(testToRoman(Infinity, true)).toBe('');
    });

    it('returns empty string for -Infinity', () => {
      expect(testToRoman(-Infinity, true)).toBe('');
    });

    it('floors decimal values (4.7 becomes "IV")', () => {
      expect(testToRoman(4.7, true)).toBe('IV');
    });
  });
});

describe('formatDecimal (via formatMarkerText)', () => {
  describe('basic formatting', () => {
    it('formats 1 as "1"', () => {
      expect(testFormatDecimal(1)).toBe('1');
    });

    it('formats 42 as "42"', () => {
      expect(testFormatDecimal(42)).toBe('42');
    });

    it('formats 0 as "0"', () => {
      expect(testFormatDecimal(0)).toBe('0');
    });

    it('formats negative numbers correctly', () => {
      expect(testFormatDecimal(-5)).toBe('-5');
    });
  });

  describe('decimal values', () => {
    it('floors 3.7 to "3"', () => {
      expect(testFormatDecimal(3.7)).toBe('3');
    });

    it('floors 9.99 to "9"', () => {
      expect(testFormatDecimal(9.99)).toBe('9');
    });

    it('floors negative decimals (-3.7 to "-4")', () => {
      expect(testFormatDecimal(-3.7)).toBe('-4');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for NaN', () => {
      expect(testFormatDecimal(NaN)).toBe('');
    });

    it('returns empty string for Infinity', () => {
      expect(testFormatDecimal(Infinity)).toBe('');
    });

    it('returns empty string for -Infinity', () => {
      expect(testFormatDecimal(-Infinity)).toBe('');
    });
  });
});

describe('applyFormat (via formatMarkerText)', () => {
  describe('all format types', () => {
    it('applies decimal format', () => {
      expect(testApplyFormat(5, 'decimal')).toBe('5');
    });

    it('applies lowerLetter format', () => {
      expect(testApplyFormat(5, 'lowerLetter')).toBe('e');
    });

    it('applies upperLetter format', () => {
      expect(testApplyFormat(5, 'upperLetter')).toBe('E');
    });

    it('applies lowerRoman format', () => {
      expect(testApplyFormat(5, 'lowerRoman')).toBe('v');
    });

    it('applies upperRoman format', () => {
      expect(testApplyFormat(5, 'upperRoman')).toBe('V');
    });
  });

  describe('undefined format', () => {
    it('defaults to decimal when format is undefined', () => {
      expect(testApplyFormat(42, undefined)).toBe('42');
    });
  });

  describe('unknown format', () => {
    it('defaults to decimal for unknown format', () => {
      expect(testApplyFormat(42, 'unknownFormat' as NumberingFormat)).toBe('42');
    });
  });
});
