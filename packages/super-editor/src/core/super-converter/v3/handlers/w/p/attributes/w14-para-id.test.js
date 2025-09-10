// @ts-check
import { describe, it, expect } from 'vitest';
import { w14ParaIdEncoder, w14ParaIdDecoder } from './w14-para-id.js';

describe('w14:paraId attribute handlers', () => {
  it('encodes w14:paraId from OOXML attributes', () => {
    const attrs = { 'w14:paraId': 'ABCD' };
    expect(w14ParaIdEncoder(attrs)).toBe('ABCD');
  });

  it('returns undefined when encoding without w14:paraId', () => {
    const attrs = {};
    expect(w14ParaIdEncoder(attrs)).toBeUndefined();
  });

  it('decodes paraId to OOXML attribute value', () => {
    const superDocAttrs = { paraId: 'ABCD' };
    expect(w14ParaIdDecoder(superDocAttrs)).toBe('ABCD');
  });

  it('returns undefined when decoding without paraId', () => {
    const superDocAttrs = {};
    expect(w14ParaIdDecoder(superDocAttrs)).toBeUndefined();
  });
});
