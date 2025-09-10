// @ts-check
import { describe, it, expect } from 'vitest';
import { wRsidPEncoder, wRsidPDecoder } from './w-rsid-p.js';

describe('w:rsidP attribute handlers', () => {
  it('encodes w:rsidP from OOXML attributes', () => {
    const attrs = { 'w:rsidP': '00112233' };
    expect(wRsidPEncoder(attrs)).toBe('00112233');
  });

  it('returns undefined when encoding without w:rsidP', () => {
    const attrs = {};
    expect(wRsidPEncoder(attrs)).toBeUndefined();
  });

  it('decodes rsidP to OOXML attribute value', () => {
    const superDocAttrs = { rsidP: '00112233' };
    expect(wRsidPDecoder(superDocAttrs)).toBe('00112233');
  });

  it('returns undefined when decoding without rsidP', () => {
    const superDocAttrs = {};
    expect(wRsidPDecoder(superDocAttrs)).toBeUndefined();
  });
});
