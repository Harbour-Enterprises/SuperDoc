// @ts-check
import { describe, it, expect } from 'vitest';
import { wRsidDelEncoder, wRsidDelDecoder } from './w-rsid-del.js';

describe('w:rsidDel attribute handlers', () => {
  it('encodes w:rsidDel from OOXML attributes', () => {
    const attrs = { 'w:rsidDel': 'A1B2C3D4' };
    expect(wRsidDelEncoder(attrs)).toBe('A1B2C3D4');
  });

  it('returns undefined when encoding without w:rsidDel', () => {
    const attrs = {};
    expect(wRsidDelEncoder(attrs)).toBeUndefined();
  });

  it('decodes rsidDel to OOXML attribute value', () => {
    const superDocAttrs = { rsidDel: 'A1B2C3D4' };
    expect(wRsidDelDecoder(superDocAttrs)).toBe('A1B2C3D4');
  });

  it('returns undefined when decoding without rsidDel', () => {
    const superDocAttrs = {};
    expect(wRsidDelDecoder(superDocAttrs)).toBeUndefined();
  });
});
