/**
 * Tests for Spacing & Indent Normalization Module
 *
 * Covers 9 functions for converting spacing/indent between units and normalizing values:
 * - spacingPxToPt: Convert spacing from pixels to points
 * - indentPxToPt: Convert indent from pixels to points
 * - spacingPtToPx: Convert spacing from points to pixels (with rawSpacing filter)
 * - indentPtToPx: Convert indent from points to pixels
 * - normalizeAlignment: Normalize alignment values
 * - normalizeParagraphSpacing: Normalize spacing from raw attributes
 * - normalizeLineRule: Normalize lineRule values
 * - normalizePxIndent: Normalize indent already in pixels (with twips detection)
 * - normalizeParagraphIndent: Normalize indent with twips→px conversion
 *
 * Critical: Tests include the twips detection heuristic (threshold = 50, divisor = 15)
 */

import { describe, it, expect } from 'vitest';
import type { ParagraphIndent, ParagraphSpacing } from '@superdoc/contracts';
import {
  spacingPxToPt,
  indentPxToPt,
  spacingPtToPx,
  indentPtToPx,
  normalizeAlignment,
  normalizeParagraphSpacing,
  normalizeLineRule,
  normalizePxIndent,
  normalizeParagraphIndent,
} from './spacing-indent.js';
import { twipsToPx } from '../utilities.js';

describe('spacingPxToPt', () => {
  it('should convert before spacing from px to pt', () => {
    const spacing: ParagraphSpacing = { before: 12 };
    const result = spacingPxToPt(spacing);
    // 12px = 9pt (at 96 DPI: pt = px * 0.75)
    expect(result.before).toBe(9);
  });

  it('should convert after spacing from px to pt', () => {
    const spacing: ParagraphSpacing = { after: 16 };
    const result = spacingPxToPt(spacing);
    expect(result.after).toBe(12);
  });

  it('should convert line spacing from px to pt', () => {
    const spacing: ParagraphSpacing = { line: 20 };
    const result = spacingPxToPt(spacing);
    expect(result.line).toBe(15);
  });

  it('should preserve lineRule', () => {
    const spacing: ParagraphSpacing = { line: 20, lineRule: 'exact' };
    const result = spacingPxToPt(spacing);
    expect(result.lineRule).toBe('exact');
  });

  it('should convert all spacing properties', () => {
    const spacing: ParagraphSpacing = {
      before: 8,
      after: 12,
      line: 16,
      lineRule: 'auto',
    };
    const result = spacingPxToPt(spacing);
    expect(result.before).toBe(6);
    expect(result.after).toBe(9);
    expect(result.line).toBe(12);
    expect(result.lineRule).toBe('auto');
  });

  it('should handle zero values', () => {
    const spacing: ParagraphSpacing = { before: 0, after: 0, line: 0 };
    const result = spacingPxToPt(spacing);
    expect(result.before).toBe(0);
    expect(result.after).toBe(0);
    expect(result.line).toBe(0);
  });

  it('should handle negative values', () => {
    const spacing: ParagraphSpacing = { before: -12 };
    const result = spacingPxToPt(spacing);
    expect(result.before).toBe(-9);
  });

  it('should handle fractional values', () => {
    const spacing: ParagraphSpacing = { before: 10.5 };
    const result = spacingPxToPt(spacing);
    expect(result.before).toBe(7.875);
  });

  it('should skip undefined properties', () => {
    const spacing: ParagraphSpacing = { before: 12 };
    const result = spacingPxToPt(spacing);
    expect(result.after).toBeUndefined();
    expect(result.line).toBeUndefined();
  });

  it('should return empty object for empty spacing', () => {
    const spacing: ParagraphSpacing = {};
    const result = spacingPxToPt(spacing);
    expect(result).toEqual({});
  });
});

describe('indentPxToPt', () => {
  it('should convert left indent from px to pt', () => {
    const indent: ParagraphIndent = { left: 24 };
    const result = indentPxToPt(indent);
    expect(result.left).toBe(18);
  });

  it('should convert right indent from px to pt', () => {
    const indent: ParagraphIndent = { right: 32 };
    const result = indentPxToPt(indent);
    expect(result.right).toBe(24);
  });

  it('should convert firstLine indent from px to pt', () => {
    const indent: ParagraphIndent = { firstLine: 16 };
    const result = indentPxToPt(indent);
    expect(result.firstLine).toBe(12);
  });

  it('should convert hanging indent from px to pt', () => {
    const indent: ParagraphIndent = { hanging: 20 };
    const result = indentPxToPt(indent);
    expect(result.hanging).toBe(15);
  });

  it('should convert all indent properties', () => {
    const indent: ParagraphIndent = {
      left: 24,
      right: 32,
      firstLine: 16,
      hanging: 20,
    };
    const result = indentPxToPt(indent);
    expect(result.left).toBe(18);
    expect(result.right).toBe(24);
    expect(result.firstLine).toBe(12);
    expect(result.hanging).toBe(15);
  });

  it('should handle zero values', () => {
    const indent: ParagraphIndent = { left: 0, right: 0 };
    const result = indentPxToPt(indent);
    expect(result.left).toBe(0);
    expect(result.right).toBe(0);
  });

  it('should handle negative values', () => {
    const indent: ParagraphIndent = { firstLine: -12 };
    const result = indentPxToPt(indent);
    expect(result.firstLine).toBe(-9);
  });
});

describe('spacingPtToPx', () => {
  describe('with rawSpacing filter', () => {
    it('should convert before when present in rawSpacing', () => {
      const spacing = { before: 9, after: 12 };
      const rawSpacing: ParagraphSpacing = { before: 10 };
      const result = spacingPtToPx(spacing, rawSpacing);
      expect(result?.before).toBe(12); // 9pt = 12px
      expect(result?.after).toBeUndefined();
    });

    it('should convert after when present in rawSpacing', () => {
      const spacing = { before: 9, after: 12 };
      const rawSpacing: ParagraphSpacing = { after: 15 };
      const result = spacingPtToPx(spacing, rawSpacing);
      expect(result?.before).toBeUndefined();
      expect(result?.after).toBe(16); // 12pt = 16px
    });

    it('should convert line when present in rawSpacing', () => {
      const spacing = { line: 15 };
      const rawSpacing: ParagraphSpacing = { line: 20 };
      const result = spacingPtToPx(spacing, rawSpacing);
      expect(result?.line).toBe(20); // 15pt = 20px
    });

    it('should preserve lineRule when converting line', () => {
      const spacing = { line: 15, lineRule: 'exact' as const };
      const rawSpacing: ParagraphSpacing = { line: 20 };
      const result = spacingPtToPx(spacing, rawSpacing);
      expect(result?.lineRule).toBe('exact');
    });

    it('should convert all properties present in rawSpacing', () => {
      const spacing = { before: 9, after: 12, line: 15, lineRule: 'auto' as const };
      const rawSpacing: ParagraphSpacing = { before: 10, after: 15, line: 20 };
      const result = spacingPtToPx(spacing, rawSpacing);
      expect(result?.before).toBe(12);
      expect(result?.after).toBe(16);
      expect(result?.line).toBe(20);
      expect(result?.lineRule).toBe('auto');
    });

    it('should return undefined when rawSpacing is empty', () => {
      const spacing = { before: 9, after: 12 };
      const rawSpacing: ParagraphSpacing = {};
      const result = spacingPtToPx(spacing, rawSpacing);
      expect(result).toBeUndefined();
    });
  });

  describe('without rawSpacing', () => {
    it('should return undefined when rawSpacing is not provided', () => {
      const spacing = { before: 9, after: 12 };
      const result = spacingPtToPx(spacing);
      expect(result).toBeUndefined();
    });

    it('should return undefined when rawSpacing is undefined', () => {
      const spacing = { before: 9, after: 12 };
      const result = spacingPtToPx(spacing, undefined);
      expect(result).toBeUndefined();
    });
  });
});

describe('indentPtToPx', () => {
  it('should convert left indent from pt to px', () => {
    const indent = { left: 18 };
    const result = indentPtToPx(indent);
    expect(result?.left).toBe(24); // 18pt = 24px
  });

  it('should convert right indent from pt to px', () => {
    const indent = { right: 24 };
    const result = indentPtToPx(indent);
    expect(result?.right).toBe(32); // 24pt = 32px
  });

  it('should convert firstLine indent from pt to px', () => {
    const indent = { firstLine: 12 };
    const result = indentPtToPx(indent);
    expect(result?.firstLine).toBe(16); // 12pt = 16px
  });

  it('should convert hanging indent from pt to px', () => {
    const indent = { hanging: 15 };
    const result = indentPtToPx(indent);
    expect(result?.hanging).toBe(20); // 15pt = 20px
  });

  it('should filter out zero values', () => {
    const indent = { left: 0, right: 0 };
    const result = indentPtToPx(indent);
    expect(result).toBeUndefined();
  });

  it('should filter out individual zero values', () => {
    const indent = { left: 18, right: 0, firstLine: 12 };
    const result = indentPtToPx(indent);
    expect(result?.left).toBe(24);
    expect(result?.right).toBeUndefined();
    expect(result?.firstLine).toBe(16);
  });

  it('should handle negative values', () => {
    const indent = { firstLine: -12 };
    const result = indentPtToPx(indent);
    expect(result?.firstLine).toBe(-16);
  });

  it('should convert all non-zero properties and preserve zero firstLine/hanging', () => {
    const indent = { left: 18, right: 24, firstLine: 0, hanging: 15 };
    const result = indentPtToPx(indent);
    expect(result?.left).toBe(24);
    expect(result?.right).toBe(32);
    // firstLine: 0 is preserved (explicit override for numbering)
    expect(result?.firstLine).toBe(0);
    expect(result?.hanging).toBe(20);
  });

  it('should preserve zero values for firstLine and hanging (meaningful overrides)', () => {
    // Zero values for firstLine/hanging are meaningful - they override numbering level indents
    const indent = { left: 0, right: 0, firstLine: 0, hanging: 0 };
    const result = indentPtToPx(indent);
    // firstLine: 0 and hanging: 0 are preserved as explicit overrides
    expect(result).toEqual({ firstLine: 0, hanging: 0 });
  });

  it('should handle undefined properties', () => {
    const indent = { left: 18 };
    const result = indentPtToPx(indent);
    expect(result?.left).toBe(24);
    expect(result?.right).toBeUndefined();
  });
});

describe('normalizeAlignment', () => {
  it('should return "center" for center', () => {
    expect(normalizeAlignment('center')).toBe('center');
  });

  it('should return "right" for right', () => {
    expect(normalizeAlignment('right')).toBe('right');
  });

  it('should return "justify" for justify', () => {
    expect(normalizeAlignment('justify')).toBe('justify');
  });

  it('should convert "end" to "right"', () => {
    expect(normalizeAlignment('end')).toBe('right');
  });

  it('should convert "start" to "left"', () => {
    expect(normalizeAlignment('start')).toBe('left');
  });

  it('should return "left" for "left"', () => {
    // Explicit left alignment must be returned so it can override style-based center/right
    expect(normalizeAlignment('left')).toBe('left');
  });

  it('should return undefined for unknown values', () => {
    expect(normalizeAlignment('unknown')).toBeUndefined();
    expect(normalizeAlignment('top')).toBeUndefined();
    expect(normalizeAlignment('bottom')).toBeUndefined();
  });

  it('should return undefined for non-string values', () => {
    expect(normalizeAlignment(null)).toBeUndefined();
    expect(normalizeAlignment(undefined)).toBeUndefined();
    expect(normalizeAlignment(123)).toBeUndefined();
    expect(normalizeAlignment({})).toBeUndefined();
  });

  it('should be case-sensitive', () => {
    // The function uses strict equality, so it's case-sensitive
    expect(normalizeAlignment('CENTER')).toBeUndefined();
    expect(normalizeAlignment('Right')).toBeUndefined();
    expect(normalizeAlignment('JUSTIFY')).toBeUndefined();
  });

  it('should convert "both" to "justify"', () => {
    expect(normalizeAlignment('both')).toBe('justify');
  });

  it('should convert "distribute" to "justify"', () => {
    expect(normalizeAlignment('distribute')).toBe('justify');
  });

  it('should convert "numTab" to "justify"', () => {
    expect(normalizeAlignment('numTab')).toBe('justify');
  });

  it('should convert "thaiDistribute" to "justify"', () => {
    expect(normalizeAlignment('thaiDistribute')).toBe('justify');
  });
});

describe('normalizeParagraphSpacing', () => {
  describe('valid spacing', () => {
    it('should normalize before spacing', () => {
      const input = { before: 150 }; // 10px in twips (10 * 15)
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(10);
    });

    it('should normalize after spacing', () => {
      const input = { after: 300 }; // 20px in twips (20 * 15)
      const result = normalizeParagraphSpacing(input);
      expect(result?.after).toBe(20);
    });

    it('should normalize line spacing', () => {
      const input = { line: 225 }; // 15px in twips (15 * 15)
      const result = normalizeParagraphSpacing(input);
      expect(result?.line).toBe(15);
    });

    it('should normalize lineRule', () => {
      const input = { lineRule: 'exact' };
      const result = normalizeParagraphSpacing(input);
      expect(result?.lineRule).toBe('exact');
    });

    it('should normalize complete spacing', () => {
      const input = { before: 1.5, after: 2, line: 1.2, lineRule: 'auto' }; // Auto line uses multipliers
      const result = normalizeParagraphSpacing(input);
      expect(result).toEqual({
        before: 0.1, // 1.5 twips in px
        after: 0.13333333333333333, // 2 twips in px
        line: 1.2, // Multiplier preserved (<= 10)
        lineRule: 'auto',
      });
    });

    it('should convert before/after values from twips to pixels', () => {
      const input = { before: 720, after: 360 };
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(48);
      expect(result?.after).toBe(24);
    });

    it('should prefer OOXML spacing over pixel fallbacks', () => {
      const input = { before: 720, lineSpaceBefore: 12 };
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(48);
    });

    it('should convert line spacing from twips when lineRule is exact', () => {
      const input = { line: 276, lineRule: 'exact' };
      const result = normalizeParagraphSpacing(input);
      expect(result?.line).toBeCloseTo(twipsToPx(276));
    });

    it('should convert line spacing from twips when lineRule is atLeast', () => {
      const input = { line: 360, lineRule: 'atLeast' };
      const result = normalizeParagraphSpacing(input);
      expect(result?.line).toBeCloseTo(twipsToPx(360));
    });

    it('should preserve multiplier line spacing when value <= 10', () => {
      const input = { line: 1.5, lineRule: 'auto' };
      const result = normalizeParagraphSpacing(input);
      expect(result?.line).toBe(1.5);
    });

    it('should convert large auto line spacing values from twips', () => {
      const input = { line: 480, lineRule: 'auto' };
      const result = normalizeParagraphSpacing(input);
      expect(result?.line).toBeCloseTo(twipsToPx(480));
    });

    it('should handle zero values', () => {
      const input = { before: 0, after: 0, line: 0 };
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(0);
      expect(result?.after).toBe(0);
      expect(result?.line).toBe(0);
    });

    it('should handle negative values', () => {
      const input = { before: -150 }; // -10px in twips
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(-10);
    });

    it('should handle fractional values', () => {
      const input = { before: 157.5, after: 311.25 }; // 10.5px and 20.75px in twips
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(10.5);
      expect(result?.after).toBeCloseTo(20.75, 1);
    });
  });

  describe('property fallbacks', () => {
    it('should use lineSpaceBefore as fallback for before', () => {
      const input = { lineSpaceBefore: 15 };
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(15);
    });

    it('should use lineSpaceAfter as fallback for after', () => {
      const input = { lineSpaceAfter: 25 };
      const result = normalizeParagraphSpacing(input);
      expect(result?.after).toBe(25);
    });

    it('should prioritize before over lineSpaceBefore', () => {
      const input = { before: 150, lineSpaceBefore: 15 }; // 10px in twips, lineSpaceBefore is already px
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBe(10);
    });

    it('should prioritize after over lineSpaceAfter', () => {
      const input = { after: 300, lineSpaceAfter: 25 }; // 20px in twips, lineSpaceAfter is already px
      const result = normalizeParagraphSpacing(input);
      expect(result?.after).toBe(20);
    });
  });

  describe('invalid inputs', () => {
    it('should return undefined for null', () => {
      expect(normalizeParagraphSpacing(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(normalizeParagraphSpacing(undefined)).toBeUndefined();
    });

    it('should return undefined for non-object', () => {
      expect(normalizeParagraphSpacing('string')).toBeUndefined();
      expect(normalizeParagraphSpacing(123)).toBeUndefined();
    });

    it('should return undefined for empty object', () => {
      expect(normalizeParagraphSpacing({})).toBeUndefined();
    });

    it('should filter out non-numeric string values (was NaN, now fixed)', () => {
      // Fixed: pickNumber now filters out NaN from parseFloat
      const input = { before: 'not a number', after: 300 }; // 20px in twips
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBeUndefined();
      expect(result?.after).toBe(20);
    });

    it('should filter out NaN values', () => {
      const input = { before: NaN, after: 300 }; // 20px in twips
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBeUndefined();
      expect(result?.after).toBe(20);
    });

    it('should filter out Infinity values', () => {
      const input = { before: Infinity, after: 300 }; // 20px in twips
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBeUndefined();
      expect(result?.after).toBe(20);
    });

    it('should filter out -Infinity values', () => {
      const input = { before: -Infinity, line: 10 };
      const result = normalizeParagraphSpacing(input);
      expect(result?.before).toBeUndefined();
      expect(result?.line).toBeDefined();
    });
  });
});

describe('normalizeLineRule', () => {
  it('should return "auto" for auto', () => {
    expect(normalizeLineRule('auto')).toBe('auto');
  });

  it('should return "exact" for exact', () => {
    expect(normalizeLineRule('exact')).toBe('exact');
  });

  it('should return "atLeast" for atLeast', () => {
    expect(normalizeLineRule('atLeast')).toBe('atLeast');
  });

  it('should return undefined for invalid values', () => {
    expect(normalizeLineRule('unknown')).toBeUndefined();
    expect(normalizeLineRule('multiple')).toBeUndefined();
  });

  it('should return undefined for non-string values', () => {
    expect(normalizeLineRule(null)).toBeUndefined();
    expect(normalizeLineRule(123)).toBeUndefined();
  });

  it('should be case-sensitive', () => {
    expect(normalizeLineRule('AUTO')).toBeUndefined();
    expect(normalizeLineRule('Exact')).toBeUndefined();
    expect(normalizeLineRule('ATLEAST')).toBeUndefined();
  });
});

describe('normalizePxIndent', () => {
  describe('pixel values (not twips)', () => {
    it('should normalize small pixel values (< 50)', () => {
      const input = { left: 10, right: 20 };
      const result = normalizePxIndent(input);
      expect(result).toEqual({ left: 10, right: 20 });
    });

    it('should normalize values at threshold (50)', () => {
      const input = { left: 49 };
      const result = normalizePxIndent(input);
      // 49 < 50, so treated as pixels
      expect(result).toEqual({ left: 49 });
    });

    it('should handle negative small values', () => {
      const input = { firstLine: -10 };
      const result = normalizePxIndent(input);
      expect(result).toEqual({ firstLine: -10 });
    });

    it('should preserve zero values (explicit indent reset)', () => {
      // Zero is now explicitly excluded from the divisibility check to
      // support intentional zero overrides (e.g., style's firstLine=0 to
      // cancel numbering level's firstLine indent)
      const input = { left: 0, right: 0 };
      const result = normalizePxIndent(input);
      expect(result).toEqual({ left: 0, right: 0 });
    });

    it('should handle all four indent properties', () => {
      const input = { left: 10, right: 20, firstLine: 5, hanging: 8 };
      const result = normalizePxIndent(input);
      expect(result).toEqual({ left: 10, right: 20, firstLine: 5, hanging: 8 });
    });
  });

  describe('twips detection', () => {
    it('should return undefined for values >= 50', () => {
      const input = { left: 50 };
      const result = normalizePxIndent(input);
      expect(result).toBeUndefined();
    });

    it('should return undefined for large values (likely twips)', () => {
      const input = { left: 1440 }; // 1 inch in twips
      const result = normalizePxIndent(input);
      expect(result).toBeUndefined();
    });

    it('should return undefined for values divisible by 15', () => {
      const input = { left: 30 }; // 30 % 15 = 0
      const result = normalizePxIndent(input);
      expect(result).toBeUndefined();
    });

    it('should return undefined for values divisible by 15 (45)', () => {
      const input = { left: 45 }; // 45 % 15 = 0
      const result = normalizePxIndent(input);
      expect(result).toBeUndefined();
    });

    it('should return undefined when any value looks like twips', () => {
      const input = { left: 10, right: 720 }; // right is twips
      const result = normalizePxIndent(input);
      expect(result).toBeUndefined();
    });

    it('should accept values not divisible by 15', () => {
      const input = { left: 16, right: 17 }; // Neither divisible by 15
      const result = normalizePxIndent(input);
      expect(result).toEqual({ left: 16, right: 17 });
    });

    it('should handle negative values with twips detection', () => {
      const input = { left: -60 }; // |−60| >= 50
      const result = normalizePxIndent(input);
      expect(result).toBeUndefined();
    });
  });

  describe('invalid inputs', () => {
    it('should return undefined for null', () => {
      expect(normalizePxIndent(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(normalizePxIndent(undefined)).toBeUndefined();
    });

    it('should return undefined for non-object', () => {
      expect(normalizePxIndent('string')).toBeUndefined();
      expect(normalizePxIndent(123)).toBeUndefined();
    });

    it('should return undefined for empty object', () => {
      expect(normalizePxIndent({})).toBeUndefined();
    });

    it('should skip non-numeric values', () => {
      const input = { left: 10, right: 'not a number' };
      const result = normalizePxIndent(input);
      expect(result).toEqual({ left: 10 });
    });

    it('should skip NaN values', () => {
      const input = { left: NaN, right: 10 };
      const result = normalizePxIndent(input);
      expect(result).toEqual({ right: 10 });
    });

    it('should skip Infinity values', () => {
      const input = { left: Infinity, right: 10 };
      const result = normalizePxIndent(input);
      expect(result).toEqual({ right: 10 });
    });
  });
});

describe('normalizeParagraphIndent', () => {
  describe('pixel values (≤ 50)', () => {
    it('should preserve small values as pixels', () => {
      const input = { left: 10, right: 20 };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ left: 10, right: 20 });
    });

    it('should preserve values at threshold (50)', () => {
      const input = { left: 50 };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ left: 50 });
    });

    it('should preserve negative small values', () => {
      const input = { firstLine: -20 };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ firstLine: -20 });
    });

    it('should preserve zero values', () => {
      const input = { left: 0, right: 0 };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ left: 0, right: 0 });
    });

    it('should preserve all four indent properties when small', () => {
      const input = { left: 10, right: 15, firstLine: 5, hanging: 8 };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ left: 10, right: 15, firstLine: 5, hanging: 8 });
    });
  });

  describe('twips conversion (> 50)', () => {
    it('should convert values > 50 from twips to pixels', () => {
      const input = { left: 720 }; // 0.5 inch = 720 twips = 48px
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(48); // 720 / 15 = 48
    });

    it('should convert large twips values', () => {
      const input = { left: 1440 }; // 1 inch = 1440 twips = 96px
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(96);
    });

    it('should convert all properties from twips when > 50', () => {
      const input = { left: 720, right: 1440, firstLine: 360, hanging: 180 };
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(48);
      expect(result?.right).toBe(96);
      expect(result?.firstLine).toBe(24);
      expect(result?.hanging).toBe(12);
    });

    it('should handle negative twips values', () => {
      const input = { firstLine: -720 };
      const result = normalizeParagraphIndent(input);
      expect(result?.firstLine).toBe(-48);
    });

    it('should handle mixed pixel and twips values', () => {
      const input = { left: 10, right: 720 }; // left is px, right is twips
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(10);
      expect(result?.right).toBe(48);
    });
  });

  describe('boundary cases', () => {
    it('should treat 50 as pixels (not twips)', () => {
      const input = { left: 50 };
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(50);
    });

    it('should treat 51 as twips and convert', () => {
      const input = { left: 51 };
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(3.4); // 51 / 15 = 3.4
    });

    it('should treat -50 as pixels', () => {
      const input = { left: -50 };
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(-50);
    });

    it('should treat -51 as twips and convert', () => {
      const input = { left: -51 };
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(-3.4);
    });
  });

  describe('invalid inputs', () => {
    it('should return undefined for null', () => {
      expect(normalizeParagraphIndent(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(normalizeParagraphIndent(undefined)).toBeUndefined();
    });

    it('should return undefined for non-object', () => {
      expect(normalizeParagraphIndent('string')).toBeUndefined();
      expect(normalizeParagraphIndent(123)).toBeUndefined();
    });

    it('should return undefined for empty object', () => {
      expect(normalizeParagraphIndent({})).toBeUndefined();
    });

    it('should skip non-numeric values', () => {
      const input = { left: 10, right: 'not a number' };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ left: 10 });
    });

    it('should skip null values', () => {
      const input = { left: 10, right: null };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ left: 10 });
    });

    it('should skip undefined values', () => {
      const input = { left: 10, right: undefined };
      const result = normalizeParagraphIndent(input);
      expect(result).toEqual({ left: 10 });
    });
  });

  describe('fractional values', () => {
    it('should handle fractional pixel values', () => {
      const input = { left: 10.5 };
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBe(10.5);
    });

    it('should handle fractional twips values', () => {
      const input = { left: 720.5 };
      const result = normalizeParagraphIndent(input);
      expect(result?.left).toBeCloseTo(48.03, 2);
    });
  });
});
