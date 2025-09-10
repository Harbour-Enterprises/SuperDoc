// @ts-check
import { describe, it, expect } from 'vitest';
import { w14TextIdEncoder, w14TextIdDecoder } from './w14-text-id.js';

describe('w14:textId attribute handlers', () => {
  it('encodes w14:textId from OOXML attributes', () => {
    const attrs = { 'w14:textId': 'FACE' };
    expect(w14TextIdEncoder(attrs)).toBe('FACE');
  });

  it('returns undefined when encoding without w14:textId', () => {
    const attrs = {};
    expect(w14TextIdEncoder(attrs)).toBeUndefined();
  });

  it('decodes textId to OOXML attribute value', () => {
    const superDocAttrs = { textId: 'FACE' };
    expect(w14TextIdDecoder(superDocAttrs)).toBe('FACE');
  });

  it('returns undefined when decoding without textId', () => {
    const superDocAttrs = {};
    expect(w14TextIdDecoder(superDocAttrs)).toBeUndefined();
  });
});
