import { describe, expect, it } from 'vitest';
import { inchesToPixels, normalizeInchesToPx } from './normalize-inches-to-px.js';
import { MeasurementEngine } from '../index.js';

const PX = MeasurementEngine.PIXELS_PER_INCH;

describe('inchesToPixels', () => {
  it('converts numeric inches to pixels', () => {
    expect(inchesToPixels(1)).toBe(PX);
    expect(inchesToPixels(2.25)).toBe(2.25 * PX);
  });

  it('ignores string inputs that are not finite numbers', () => {
    expect(inchesToPixels('8.5')).toBeNull();
  });

  it('returns null for invalid values', () => {
    expect(inchesToPixels('not-a-number')).toBeNull();
    expect(inchesToPixels(undefined)).toBeNull();
  });
});

describe('normalizeInchesToPx', () => {
  it('converts known keys to pixels', () => {
    const result = normalizeInchesToPx({ top: 1, bottom: 0.5 });

    expect(result).toEqual({
      top: PX,
      bottom: 0.5 * PX,
    });
  });

  it('ignores entries that cannot be converted and leaves numeric ones', () => {
    const result = normalizeInchesToPx({ top: 'abc', margin: 2 });

    expect(result.top).toBeUndefined();
    expect(result.margin).toBe(2 * PX);
  });

  it('returns an empty object when sizes is not an object', () => {
    expect(normalizeInchesToPx(null)).toEqual({});
    expect(normalizeInchesToPx(undefined)).toEqual({});
  });
});
