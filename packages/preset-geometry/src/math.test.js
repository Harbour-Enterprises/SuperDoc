import { describe, it, expect } from 'vitest';
import { sanitizeNumber, isNumericToken, angleToRadians, radiansToAngleUnits, hypot2 } from './math.js';

describe('math helpers', () => {
  it('sanitizes invalid numbers', () => {
    expect(sanitizeNumber(NaN)).toBe(0);
    expect(sanitizeNumber(Infinity)).toBe(0);
    expect(sanitizeNumber(-Infinity)).toBe(0);
    expect(sanitizeNumber(42)).toBe(42);
  });

  it('detects numeric tokens', () => {
    expect(isNumericToken('12')).toBe(true);
    expect(isNumericToken('-3.5')).toBe(true);
    expect(isNumericToken(' 7 ')).toBe(true);
    expect(isNumericToken('12px')).toBe(false);
    expect(isNumericToken(null)).toBe(false);
  });

  it('converts between angle units and radians', () => {
    const oneDegreeRadians = angleToRadians(60000);
    expect(oneDegreeRadians).toBeCloseTo(Math.PI / 180);
    expect(radiansToAngleUnits(oneDegreeRadians)).toBe(60000);
  });

  it('computes hypotenuse squared', () => {
    expect(hypot2(3, 4)).toBe(5);
    expect(hypot2(0, 0)).toBe(0);
  });
});
