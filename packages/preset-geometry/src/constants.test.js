import { describe, it, expect } from 'vitest';
import { DRAWINGML_NS, FULL_CIRCLE, HALF_CIRCLE, ANGLE_UNITS } from './constants.js';

describe('constants', () => {
  it('exports drawing namespace', () => {
    expect(DRAWINGML_NS).toBe('http://schemas.openxmlformats.org/drawingml/2006/main');
  });

  it('exports angle constants', () => {
    expect(FULL_CIRCLE).toBe(21600000);
    expect(HALF_CIRCLE).toBe(FULL_CIRCLE / 2);
    expect(ANGLE_UNITS).toBe(60000);
  });
});
