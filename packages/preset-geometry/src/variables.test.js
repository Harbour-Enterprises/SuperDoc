import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createBaseVariableMap, resolveToken, evaluateFormula, evaluateGuides } from './variables.js';
import { ANGLE_UNITS } from './constants.js';

describe('variables helpers', () => {
  it('creates a base variable map with derived values', () => {
    const vars = createBaseVariableMap(100, 200);
    expect(vars.w).toBe(100);
    expect(vars.h).toBe(200);
    expect(vars.hc).toBe(50);
    expect(vars.vc).toBe(100);
    expect(vars.ss).toBe(100);
    expect(vars.wd2).toBe(50);
    expect(vars.hd4).toBe(50);
  });

  it('resolves tokens using variables and circular degrees', () => {
    const vars = { value: 10 };
    expect(resolveToken('5', vars)).toBe(5);
    expect(resolveToken('-2.5', vars)).toBe(-2.5);
    expect(resolveToken('value', vars)).toBe(10);
    expect(resolveToken('2cd4', vars)).toBeCloseTo((2 * ANGLE_UNITS * 360) / 4);
    expect(resolveToken('missing', vars)).toBe(0);
  });

  it('evaluates guide formulas across supported operators', () => {
    const vars = createBaseVariableMap(200, 100);
    vars.a = 10;
    vars.b = 20;
    expect(evaluateFormula('val 5', vars)).toBe(5);
    expect(evaluateFormula('+- 10 5 3', vars)).toBe(12);
    expect(evaluateFormula('*/ 10 5 2', vars)).toBe(25);
    expect(evaluateFormula('+/ 10 5 3', vars)).toBeCloseTo(5);
    expect(evaluateFormula('abs -4', vars)).toBe(4);
    expect(evaluateFormula('max 10 3', vars)).toBe(10);
    expect(evaluateFormula('min 10 3', vars)).toBe(3);
    expect(evaluateFormula('pin 15 5 10', vars)).toBe(10);
    // The DrawingML "mod" operator returns the vector magnitude (sqrt(x^2 + y^2 [+ z^2])).
    expect(evaluateFormula('mod 3 4', vars)).toBe(5);
    expect(evaluateFormula('mod 3 4 0', vars)).toBe(5);
    expect(evaluateFormula(`sin 10 ${ANGLE_UNITS}`, vars)).toBeCloseTo(10 * Math.sin(Math.PI / 180));
    expect(evaluateFormula(`cos 10 ${ANGLE_UNITS}`, vars)).toBeCloseTo(10 * Math.cos(Math.PI / 180));
    expect(evaluateFormula('atan2 3 4', vars)).toBeCloseTo(Math.atan2(4, 3));
    expect(evaluateFormula(`tan 10 ${ANGLE_UNITS}`, vars)).toBeCloseTo(10 * Math.tan(Math.PI / 180));
    expect(evaluateFormula('at2 3 4', vars)).toBe(Math.round((Math.atan2(4, 3) * (180 * ANGLE_UNITS)) / Math.PI));
    expect(evaluateFormula('sat2 10 3 4', vars)).toBeCloseTo((10 * 4) / 5);
    expect(evaluateFormula('cat2 10 3 4', vars)).toBeCloseTo((10 * 3) / 5);
    expect(evaluateFormula('?: 1 10 20', vars)).toBe(10);
    expect(evaluateFormula('?: -1 10 20', vars)).toBe(20);
    expect(evaluateFormula('sqrt 9', vars)).toBe(3);
    expect(evaluateFormula('sqrt -1', vars)).toBe(0);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(evaluateFormula('unknown 1 2', vars)).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unsupported formula operator "unknown"'));
    warnSpy.mockRestore();
  });

  it('evaluates guides within XML definition nodes', () => {
    const xml = `
      <shape xmlns="http://schemas.openxmlformats.org/drawingml/2006/main">
        <avLst>
          <gd name="adj1" fmla="val 50000" />
        </avLst>
        <gdLst>
          <gd name="adj2" fmla="val 25000" />
        </gdLst>
      </shape>
    `;
    const { window } = new JSDOM(xml, { contentType: 'application/xml' });
    const element = window.document.documentElement;
    const vars = {};
    evaluateGuides(element, vars);
    expect(vars.adj1).toBe(50000);
    expect(vars.adj2).toBe(25000);
  });
});
