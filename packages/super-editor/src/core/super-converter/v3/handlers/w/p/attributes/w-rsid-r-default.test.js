// @ts-check
import { describe, it, expect } from 'vitest';
import { wRsidRDefaultEncoder, wRsidRDefaultDecoder } from './w-rsid-r-default.js';

describe('w:rsidRDefault attribute handlers', () => {
  it('encodes w:rsidRDefault from OOXML attributes', () => {
    const attrs = { 'w:rsidRDefault': 'DEADBEEF' };
    expect(wRsidRDefaultEncoder(attrs)).toBe('DEADBEEF');
  });

  it('returns undefined when encoding without w:rsidRDefault', () => {
    const attrs = {};
    expect(wRsidRDefaultEncoder(attrs)).toBeUndefined();
  });

  it('decodes rsidRDefault to OOXML attribute value', () => {
    const superDocAttrs = { rsidRDefault: 'DEADBEEF' };
    expect(wRsidRDefaultDecoder(superDocAttrs)).toBe('DEADBEEF');
  });

  it('returns undefined when decoding without rsidRDefault', () => {
    const superDocAttrs = {};
    expect(wRsidRDefaultDecoder(superDocAttrs)).toBeUndefined();
  });
});
