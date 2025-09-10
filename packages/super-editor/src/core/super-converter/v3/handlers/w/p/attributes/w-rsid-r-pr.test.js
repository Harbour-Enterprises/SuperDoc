// @ts-check
import { describe, it, expect } from 'vitest';
import { wRsidRPrEncoder, wRsidRPrDecoder } from './w-rsid-r-pr.js';

describe('w:rsidRPr attribute handlers', () => {
  it('encodes w:rsidRPr from OOXML attributes', () => {
    const attrs = { 'w:rsidRPr': 'CAFEBABE' };
    expect(wRsidRPrEncoder(attrs)).toBe('CAFEBABE');
  });

  it('returns undefined when encoding without w:rsidRPr', () => {
    const attrs = {};
    expect(wRsidRPrEncoder(attrs)).toBeUndefined();
  });

  it('decodes rsidRPr to OOXML attribute value', () => {
    const superDocAttrs = { rsidRPr: 'CAFEBABE' };
    expect(wRsidRPrDecoder(superDocAttrs)).toBe('CAFEBABE');
  });

  it('returns undefined when decoding without rsidRPr', () => {
    const superDocAttrs = {};
    expect(wRsidRPrDecoder(superDocAttrs)).toBeUndefined();
  });
});
