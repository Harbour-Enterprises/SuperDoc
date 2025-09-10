// @ts-check
import { describe, it, expect } from 'vitest';
import { wRsidREncoder, wRsidRDecoder } from './w-rsid-r.js';

describe('w:rsidR attribute handlers', () => {
  it('encodes w:rsidR from OOXML attributes', () => {
    const attrs = { 'w:rsidR': '11223344' };
    expect(wRsidREncoder(attrs)).toBe('11223344');
  });

  it('returns undefined when encoding without w:rsidR', () => {
    const attrs = {};
    expect(wRsidREncoder(attrs)).toBeUndefined();
  });

  it('decodes rsidR to OOXML attribute value', () => {
    const superDocAttrs = { rsidR: '11223344' };
    expect(wRsidRDecoder(superDocAttrs)).toBe('11223344');
  });

  it('returns undefined when decoding without rsidR', () => {
    const superDocAttrs = {};
    expect(wRsidRDecoder(superDocAttrs)).toBeUndefined();
  });
});
