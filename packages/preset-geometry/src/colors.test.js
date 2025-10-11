import { describe, it, expect } from 'vitest';
import { resolveFill, resolveStroke } from './colors.js';

describe('colors helpers', () => {
  describe('resolveFill', () => {
    it('returns currentColor for nullish values', () => {
      expect(resolveFill(null)).toBe('currentColor');
      expect(resolveFill(undefined)).toBe('currentColor');
    });

    it('normalizes preset keywords', () => {
      expect(resolveFill('darken')).toContain('color-mix');
      expect(resolveFill('accentlight')).toContain('color-mix');
    });

    it('preserves explicit colors and CSS variables', () => {
      expect(resolveFill('#ff00aa')).toBe('#ff00aa');
      expect(resolveFill('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
      expect(resolveFill('var(--primary)')).toBe('var(--primary)');
    });

    it('returns none when explicitly disabled', () => {
      expect(resolveFill('none')).toBe('none');
      expect(resolveFill('TRANSPARENT')).toBe('none');
      expect(resolveFill('false')).toBe('none');
    });
  });

  describe('resolveStroke', () => {
    it('defaults to currentColor', () => {
      expect(resolveStroke(null)).toBe('currentColor');
    });

    it('returns none for disabled strokes', () => {
      expect(resolveStroke('none')).toBe('none');
      expect(resolveStroke('FALSE')).toBe('none');
    });

    it('preserves explicit color values', () => {
      expect(resolveStroke('#123456')).toBe('#123456');
      expect(resolveStroke('rgb(10, 20, 30)')).toBe('rgb(10, 20, 30)');
      expect(resolveStroke('var(--stroke)')).toBe('var(--stroke)');
    });
  });
});
