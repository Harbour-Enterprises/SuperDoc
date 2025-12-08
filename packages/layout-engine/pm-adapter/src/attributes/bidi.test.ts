/**
 * Tests for BiDi (Bidirectional Text) Utilities
 *
 * Covers:
 * - mirrorIndentForRtl: Swapping left/right and inverting firstLine/hanging
 * - ensureBidiIndentPx: Clamping tiny values and adding synthetic defaults
 */

import { describe, it, expect } from 'vitest';
import { mirrorIndentForRtl, ensureBidiIndentPx, DEFAULT_BIDI_INDENT_PX } from './bidi.js';
import type { ParagraphIndent } from '@superdoc/contracts';

describe('mirrorIndentForRtl', () => {
  describe('basic mirroring', () => {
    it('should swap left and right indents', () => {
      const input: ParagraphIndent = { left: 10, right: 20 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ left: 20, right: 10 });
    });

    it('should invert positive firstLine', () => {
      const input: ParagraphIndent = { firstLine: 15 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ firstLine: -15 });
    });

    it('should invert negative firstLine', () => {
      const input: ParagraphIndent = { firstLine: -15 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ firstLine: 15 });
    });

    it('should invert positive hanging', () => {
      const input: ParagraphIndent = { hanging: 10 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ hanging: -10 });
    });

    it('should invert negative hanging', () => {
      const input: ParagraphIndent = { hanging: -10 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ hanging: 10 });
    });
  });

  describe('complete mirroring', () => {
    it('should mirror all fields when all present', () => {
      const input: ParagraphIndent = {
        left: 10,
        right: 20,
        firstLine: 5,
        hanging: 8,
      };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({
        left: 20,
        right: 10,
        firstLine: -5,
        hanging: -8,
      });
    });

    it('should handle mixed positive and negative values', () => {
      const input: ParagraphIndent = {
        left: -10,
        right: 20,
        firstLine: -5,
        hanging: 8,
      };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({
        left: 20,
        right: -10,
        firstLine: 5,
        hanging: -8,
      });
    });
  });

  describe('edge cases', () => {
    it('should return same object for empty indent', () => {
      const input: ParagraphIndent = {};
      const result = mirrorIndentForRtl(input);
      expect(result).toBe(input); // Should be same reference
    });

    it('should mirror zero values correctly', () => {
      const input: ParagraphIndent = { left: 0, right: 0, firstLine: 0, hanging: 0 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ left: 0, right: 0, firstLine: -0, hanging: -0 });
    });

    it('should handle only left indent', () => {
      const input: ParagraphIndent = { left: 15 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ right: 15 });
    });

    it('should handle only right indent', () => {
      const input: ParagraphIndent = { right: 15 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ left: 15 });
    });

    it('should handle only firstLine', () => {
      const input: ParagraphIndent = { firstLine: 12 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ firstLine: -12 });
    });

    it('should handle only hanging', () => {
      const input: ParagraphIndent = { hanging: 8 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ hanging: -8 });
    });

    it('should handle very large values', () => {
      const input: ParagraphIndent = { left: 10000, right: 20000 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ left: 20000, right: 10000 });
    });

    it('should handle fractional values', () => {
      const input: ParagraphIndent = { left: 10.5, right: 20.75, firstLine: 5.25 };
      const result = mirrorIndentForRtl(input);
      expect(result).toEqual({ left: 20.75, right: 10.5, firstLine: -5.25 });
    });
  });

  describe('immutability', () => {
    it('should not mutate input object', () => {
      const input: ParagraphIndent = { left: 10, right: 20, firstLine: 5 };
      const original = { ...input };
      mirrorIndentForRtl(input);
      expect(input).toEqual(original);
    });

    it('should return new object when mutations occur', () => {
      const input: ParagraphIndent = { left: 10 };
      const result = mirrorIndentForRtl(input);
      expect(result).not.toBe(input);
    });
  });
});

describe('ensureBidiIndentPx', () => {
  const MIN_BIDI_CLAMP_INDENT_PX = 1;

  describe('clamping tiny values', () => {
    it('should clamp tiny positive left value to MIN_BIDI_CLAMP_INDENT_PX', () => {
      const input: ParagraphIndent = { left: 0.5 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.__bidiFallback).toBe('clamped');
    });

    it('should clamp tiny negative left value to -MIN_BIDI_CLAMP_INDENT_PX', () => {
      const input: ParagraphIndent = { left: -0.5 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(-MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.__bidiFallback).toBe('clamped');
    });

    it('should clamp tiny positive right value to MIN_BIDI_CLAMP_INDENT_PX', () => {
      const input: ParagraphIndent = { right: 0.3 };
      const result = ensureBidiIndentPx(input);
      expect(result.right).toBe(MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.__bidiFallback).toBe('clamped');
    });

    it('should clamp tiny negative right value to -MIN_BIDI_CLAMP_INDENT_PX', () => {
      const input: ParagraphIndent = { right: -0.8 };
      const result = ensureBidiIndentPx(input);
      expect(result.right).toBe(-MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.__bidiFallback).toBe('clamped');
    });

    it('should clamp both left and right when both are tiny', () => {
      const input: ParagraphIndent = { left: 0.2, right: -0.7 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.right).toBe(-MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.__bidiFallback).toBe('clamped');
    });

    it('should clamp value close to zero (0.001)', () => {
      const input: ParagraphIndent = { left: 0.001 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.__bidiFallback).toBe('clamped');
    });

    it('should clamp value close to zero (0.999)', () => {
      const input: ParagraphIndent = { left: 0.999 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(MIN_BIDI_CLAMP_INDENT_PX);
      expect(result.__bidiFallback).toBe('clamped');
    });
  });

  describe('no clamping for normal values', () => {
    it('should not clamp zero value', () => {
      const input: ParagraphIndent = { left: 0 };
      const result = ensureBidiIndentPx(input);
      // Zero has no horizontal indent, so synthetic defaults apply
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.right).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.__bidiFallback).toBe('synthetic');
    });

    it('should not clamp value equal to MIN_BIDI_CLAMP_INDENT_PX', () => {
      const input: ParagraphIndent = { left: 1 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(1);
      expect(result.__bidiFallback).toBeUndefined();
    });

    it('should not clamp values greater than MIN_BIDI_CLAMP_INDENT_PX', () => {
      const input: ParagraphIndent = { left: 10, right: 20 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(10);
      expect(result.right).toBe(20);
      expect(result.__bidiFallback).toBeUndefined();
    });

    it('should not clamp large negative value', () => {
      const input: ParagraphIndent = { left: -50 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(-50);
      expect(result.__bidiFallback).toBeUndefined();
    });

    it('should not clamp very large value', () => {
      const input: ParagraphIndent = { left: 1000 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(1000);
      expect(result.__bidiFallback).toBeUndefined();
    });
  });

  describe('synthetic defaults', () => {
    it('should add synthetic defaults when no horizontal indent', () => {
      const input: ParagraphIndent = {};
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.right).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.__bidiFallback).toBe('synthetic');
    });

    it('should add synthetic defaults when both left and right are zero', () => {
      const input: ParagraphIndent = { left: 0, right: 0 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.right).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.__bidiFallback).toBe('synthetic');
    });

    it('should add synthetic defaults when only left is zero', () => {
      const input: ParagraphIndent = { left: 0 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.right).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.__bidiFallback).toBe('synthetic');
    });

    it('should add synthetic defaults when only right is zero', () => {
      const input: ParagraphIndent = { right: 0 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.right).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.__bidiFallback).toBe('synthetic');
    });

    it('should not add synthetic defaults when left is non-zero', () => {
      const input: ParagraphIndent = { left: 10 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(10);
      expect(result.right).toBeUndefined();
      expect(result.__bidiFallback).toBeUndefined();
    });

    it('should not add synthetic defaults when right is non-zero', () => {
      const input: ParagraphIndent = { right: 15 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBeUndefined();
      expect(result.right).toBe(15);
      expect(result.__bidiFallback).toBeUndefined();
    });

    it('should preserve firstLine and hanging when adding synthetic defaults', () => {
      const input: ParagraphIndent = { firstLine: 10, hanging: 5 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.right).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.firstLine).toBe(10);
      expect(result.hanging).toBe(5);
      expect(result.__bidiFallback).toBe('synthetic');
    });
  });

  describe('__bidiFallback flag', () => {
    it('should set __bidiFallback to "clamped" when clamping occurs', () => {
      const input: ParagraphIndent = { left: 0.5 };
      const result = ensureBidiIndentPx(input);
      expect(result.__bidiFallback).toBe('clamped');
    });

    it('should set __bidiFallback to "synthetic" when adding defaults', () => {
      const input: ParagraphIndent = {};
      const result = ensureBidiIndentPx(input);
      expect(result.__bidiFallback).toBe('synthetic');
    });

    it('should not set __bidiFallback when no adjustments needed', () => {
      const input: ParagraphIndent = { left: 10, right: 20 };
      const result = ensureBidiIndentPx(input);
      expect(result.__bidiFallback).toBeUndefined();
    });

    it('should prioritize "clamped" over "synthetic" when both would apply', () => {
      // This tests when clamping results in zero (edge case)
      // Actually, clamping will result in 1 or -1, not zero, so this won't trigger synthetic
      const input: ParagraphIndent = { left: 0.5, right: 0 };
      const result = ensureBidiIndentPx(input);
      // left clamped to 1, right is 0 → no synthetic because left is non-zero
      expect(result.__bidiFallback).toBe('clamped');
    });
  });

  describe('undefined and null handling', () => {
    it('should preserve undefined left value', () => {
      const input: ParagraphIndent = { right: 10 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBeUndefined();
      expect(result.right).toBe(10);
    });

    it('should preserve undefined right value', () => {
      const input: ParagraphIndent = { left: 10 };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(10);
      expect(result.right).toBeUndefined();
    });

    it('should not clamp undefined values', () => {
      const input: ParagraphIndent = { firstLine: 5, hanging: 3 };
      const result = ensureBidiIndentPx(input);
      // No horizontal indent → synthetic defaults
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.right).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(result.firstLine).toBe(5);
      expect(result.hanging).toBe(3);
    });
  });

  describe('edge cases - Math.sign behavior', () => {
    it('should handle Math.sign(0) correctly (returns 0, fallback to 1)', () => {
      // The clamping logic is: (Math.sign(value) || 1) * MIN_BIDI_CLAMP_INDENT_PX
      // For positive zero: Math.sign(0) = 0 → (0 || 1) = 1
      // But zero doesn't trigger clamping (abs > 0 && abs < 1 is false)
      const input: ParagraphIndent = { left: 0 };
      const result = ensureBidiIndentPx(input);
      // Zero doesn't get clamped, but triggers synthetic defaults
      expect(result.left).toBe(DEFAULT_BIDI_INDENT_PX);
    });

    it('should handle positive tiny value correctly', () => {
      const input: ParagraphIndent = { left: 0.5 };
      const result = ensureBidiIndentPx(input);
      // Math.sign(0.5) = 1 → (1 || 1) * 1 = 1
      expect(result.left).toBe(1);
    });

    it('should handle negative tiny value correctly', () => {
      const input: ParagraphIndent = { left: -0.5 };
      const result = ensureBidiIndentPx(input);
      // Math.sign(-0.5) = -1 → (-1 || 1) * 1 = -1
      expect(result.left).toBe(-1);
    });
  });

  describe('immutability', () => {
    it('should not mutate input object', () => {
      const input: ParagraphIndent = { left: 10, right: 20 };
      const original = { ...input };
      ensureBidiIndentPx(input);
      expect(input).toEqual(original);
    });

    it('should return new object with spread operator', () => {
      const input: ParagraphIndent = { left: 10 };
      const result = ensureBidiIndentPx(input);
      expect(result).not.toBe(input);
    });

    it('should preserve extra properties (though none expected)', () => {
      const input = { left: 10, right: 20, extra: 'value' } as never;
      const result = ensureBidiIndentPx(input);
      expect(result.extra).toBe('value');
    });
  });

  describe('integration tests', () => {
    it('should work correctly with mirrorIndentForRtl', () => {
      const input: ParagraphIndent = { left: 0.5, right: 20 };
      const ensured = ensureBidiIndentPx(input);
      const mirrored = mirrorIndentForRtl(ensured);

      expect(ensured.left).toBe(1); // Clamped
      expect(ensured.right).toBe(20);
      expect(mirrored.left).toBe(20);
      expect(mirrored.right).toBe(1);
    });

    it('should handle complete BiDi workflow', () => {
      // 1. Start with tiny values
      const input: ParagraphIndent = { left: 0.3, right: -0.6, firstLine: 5 };

      // 2. Ensure minimum indents
      const ensured = ensureBidiIndentPx(input);
      expect(ensured.left).toBe(1);
      expect(ensured.right).toBe(-1);
      expect(ensured.firstLine).toBe(5);
      expect(ensured.__bidiFallback).toBe('clamped');

      // 3. Mirror for RTL
      const mirrored = mirrorIndentForRtl(ensured);
      expect(mirrored.left).toBe(-1);
      expect(mirrored.right).toBe(1);
      expect(mirrored.firstLine).toBe(-5);
    });

    it('should handle empty → synthetic → mirror workflow', () => {
      const input: ParagraphIndent = {};

      const ensured = ensureBidiIndentPx(input);
      expect(ensured.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(ensured.right).toBe(DEFAULT_BIDI_INDENT_PX);

      const mirrored = mirrorIndentForRtl(ensured);
      expect(mirrored.left).toBe(DEFAULT_BIDI_INDENT_PX);
      expect(mirrored.right).toBe(DEFAULT_BIDI_INDENT_PX);
    });
  });

  describe('special numeric values', () => {
    it('should handle NaN gracefully (NaN != null is true)', () => {
      const input: ParagraphIndent = { left: NaN };
      const result = ensureBidiIndentPx(input);
      // NaN behavior: Math.abs(NaN) = NaN, NaN > 0 is false, NaN < 1 is false
      // So clamping condition (abs > 0 && abs < 1) is false
      // Then hasHorizontalIndent: typeof NaN === 'number' is true, but NaN !== 0 is true
      // So hasHorizontalIndent is true → no synthetic defaults
      expect(typeof result.left).toBe('number');
      expect(result.left).toBe(NaN);
    });

    it('should handle Infinity', () => {
      const input: ParagraphIndent = { left: Infinity };
      const result = ensureBidiIndentPx(input);
      // Math.abs(Infinity) = Infinity, Infinity > 0 is true, Infinity < 1 is false
      // So no clamping occurs
      expect(result.left).toBe(Infinity);
      expect(result.__bidiFallback).toBeUndefined();
    });

    it('should handle -Infinity', () => {
      const input: ParagraphIndent = { left: -Infinity };
      const result = ensureBidiIndentPx(input);
      expect(result.left).toBe(-Infinity);
      expect(result.__bidiFallback).toBeUndefined();
    });
  });
});
