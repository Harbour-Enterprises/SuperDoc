import { describe, it, expect } from 'vitest';
import { clamp } from './clamp.js';

describe('clamp', () => {
  describe('non-finite value handling', () => {
    it('returns min when value is NaN', () => {
      expect(clamp(NaN, 5, 10)).toBe(5);
      expect(clamp(NaN, -10, -5)).toBe(-10);
      expect(clamp(NaN, 0, 100)).toBe(0);
    });

    it('returns min when value is positive Infinity', () => {
      expect(clamp(Infinity, 1, 2)).toBe(1);
      expect(clamp(Infinity, -100, 100)).toBe(-100);
    });

    it('returns min when value is negative Infinity', () => {
      expect(clamp(-Infinity, 5, 10)).toBe(5);
      expect(clamp(-Infinity, -50, -10)).toBe(-50);
      expect(clamp(-Infinity, 0, 1000)).toBe(0);
    });
  });

  describe('clamping behavior', () => {
    it('returns min when value is below minimum', () => {
      expect(clamp(-10, 0, 10)).toBe(0);
      expect(clamp(-100, -50, 50)).toBe(-50);
      expect(clamp(5, 10, 20)).toBe(10);
    });

    it('returns value when within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, -10, 10)).toBe(0);
      expect(clamp(-5, -10, 10)).toBe(-5);
      expect(clamp(7.5, 0, 10)).toBe(7.5);
    });

    it('returns max when value is above maximum', () => {
      expect(clamp(20, 0, 10)).toBe(10);
      expect(clamp(100, -50, 50)).toBe(50);
      expect(clamp(15, 5, 10)).toBe(10);
    });
  });

  describe('boundary values', () => {
    it('returns value when exactly equal to min', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(-10, -10, 10)).toBe(-10);
      expect(clamp(5, 5, 20)).toBe(5);
    });

    it('returns value when exactly equal to max', () => {
      expect(clamp(10, 0, 10)).toBe(10);
      expect(clamp(50, -50, 50)).toBe(50);
      expect(clamp(100, 0, 100)).toBe(100);
    });

    it('handles degenerate range where min equals max', () => {
      expect(clamp(5, 10, 10)).toBe(10); // value < min=max
      expect(clamp(10, 10, 10)).toBe(10); // value = min=max
      expect(clamp(15, 10, 10)).toBe(10); // value > min=max
    });
  });

  describe('negative ranges', () => {
    it('clamps within negative range', () => {
      expect(clamp(-15, -10, -5)).toBe(-10);
      expect(clamp(-7, -10, -5)).toBe(-7);
      expect(clamp(-3, -10, -5)).toBe(-5);
    });

    it('clamps with negative min and positive max', () => {
      expect(clamp(-100, -50, 50)).toBe(-50);
      expect(clamp(0, -50, 50)).toBe(0);
      expect(clamp(100, -50, 50)).toBe(50);
    });
  });

  describe('zero handling', () => {
    it('handles zero as value', () => {
      expect(clamp(0, -10, 10)).toBe(0);
      expect(clamp(0, 5, 10)).toBe(5);
      expect(clamp(0, -10, -5)).toBe(-5);
    });

    it('handles zero as min bound', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('handles zero as max bound', () => {
      expect(clamp(-5, -10, 0)).toBe(-5);
      expect(clamp(0, -10, 0)).toBe(0);
      expect(clamp(5, -10, 0)).toBe(0);
    });

    it('handles zero range (0, 0)', () => {
      expect(clamp(-5, 0, 0)).toBe(0);
      expect(clamp(0, 0, 0)).toBe(0);
      expect(clamp(5, 0, 0)).toBe(0);
    });
  });

  describe('fractional values', () => {
    it('clamps fractional values correctly', () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(2.7, 0, 2)).toBe(2);
      expect(clamp(-0.5, 0, 1)).toBe(0);
    });

    it('handles fractional bounds', () => {
      expect(clamp(1.5, 1.2, 1.8)).toBe(1.5);
      expect(clamp(1.0, 1.2, 1.8)).toBe(1.2);
      expect(clamp(2.0, 1.2, 1.8)).toBe(1.8);
    });

    it('preserves fractional precision', () => {
      expect(clamp(3.14159, 0, 10)).toBe(3.14159);
      expect(clamp(7.777, 5.5, 8.8)).toBe(7.777);
    });
  });

  describe('extreme values', () => {
    it('handles very large positive numbers', () => {
      const large = Number.MAX_SAFE_INTEGER;
      expect(clamp(large - 100, 0, large)).toBe(large - 100);
      expect(clamp(large + 100, 0, large)).toBe(large);
    });

    it('handles very large negative numbers', () => {
      const small = Number.MIN_SAFE_INTEGER;
      expect(clamp(small + 100, small, 0)).toBe(small + 100);
      expect(clamp(small - 100, small, 0)).toBe(small);
    });

    it('handles very small positive numbers', () => {
      const tiny = Number.MIN_VALUE;
      expect(clamp(tiny, 0, 1)).toBe(tiny);
      expect(clamp(tiny * 0.5, tiny, 1)).toBe(tiny);
    });
  });

  describe('parameter validation edge cases', () => {
    it('handles inverted range (max < min) - follows implementation logic', () => {
      // When max < min, the function checks value < min first, then value > max
      expect(clamp(5, 10, 0)).toBe(10); // 5 < 10? yes -> return 10 (min)
      expect(clamp(15, 10, 0)).toBe(0); // 15 < 10? no, 15 > 0? yes -> return 0 (max)
      expect(clamp(-5, 10, 0)).toBe(10); // -5 < 10? yes -> return 10 (min)
    });
  });
});
