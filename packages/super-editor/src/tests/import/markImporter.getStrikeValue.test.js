import { describe, it, expect } from 'vitest';
import { parseMarks } from '../../core/super-converter/v2/importer/markImporter.js';

/** Utility to build a minimal property node for parseMarks */
const makeProperty = (valAttr) => {
  const el = { name: 'w:strike', attributes: {} };
  if (valAttr !== undefined) el.attributes['w:val'] = valAttr;
  return { elements: [el] };
};

const hasStrike = (marks) => marks.some((m) => m.type === 'strike');
const getStrike = (marks) => marks.find((m) => m.type === 'strike');

describe('markImporter.getStrikeValue via parseMarks', () => {
  it('returns strike ON when attribute is absent (presence implies on)', () => {
    const property = makeProperty(undefined);
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(true);
  });

  it('treats w:val="1" as ON', () => {
    const property = makeProperty('1');
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(true);
  });

  it('treats w:val="true" as ON', () => {
    const property = makeProperty('true');
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(true);
  });

  it('treats w:val="on" as ON', () => {
    const property = makeProperty('on');
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(true);
  });

  it('treats w:val="0" as OFF (no strike mark)', () => {
    const property = makeProperty('0');
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(false);
  });

  it('treats w:val="false" as OFF (no strike mark)', () => {
    const property = makeProperty('false');
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(false);
  });

  it('treats w:val="off" as OFF (no strike mark)', () => {
    const property = makeProperty('off');
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(false);
  });

  it('normalizes mixed case values', () => {
    const property = makeProperty('On');
    const out = parseMarks(property, []);
    expect(hasStrike(out)).toBe(true);
  });
});

