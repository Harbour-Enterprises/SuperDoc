import { describe, it, expect } from 'vitest';
import { encode, decode, attrConfig } from './w-val.js';

describe('w:b w:val encoder (bold)', () => {
  it('returns undefined when attribute is missing', () => {
    expect(encode({})).toBeUndefined();
    expect(encode(null)).toBeUndefined();
    expect(encode(undefined)).toBeUndefined();
  });

  it('handles boolean keywords (case-insensitive)', () => {
    expect(encode({ 'w:val': 'true' })).toBe(true);
    expect(encode({ 'w:val': 'TRUE' })).toBe(true);
    expect(encode({ 'w:val': 'false' })).toBe(false);
    expect(encode({ 'w:val': 'FALSE' })).toBe(false);
  });

  it('handles integer 0/1', () => {
    expect(encode({ 'w:val': '1' })).toBe(true);
    expect(encode({ 'w:val': 1 })).toBe(true);
    expect(encode({ 'w:val': '0' })).toBe(false);
    expect(encode({ 'w:val': 0 })).toBe(false);
  });

  it('handles on/off keywords', () => {
    expect(encode({ 'w:val': 'on' })).toBe(true);
    expect(encode({ 'w:val': 'ON' })).toBe(true);
    expect(encode({ 'w:val': 'off' })).toBe(false);
    expect(encode({ 'w:val': 'OFF' })).toBe(false);
  });

  it('returns undefined for unknown values so translator can treat presence as true', () => {
    expect(encode({ 'w:val': 'maybe' })).toBeUndefined();
    expect(encode({ 'w:val': '' })).toBeUndefined();
  });
});

describe('w:b w:val decoder (bold)', () => {
  it('emits "0" only for explicit false', () => {
    expect(decode({ bold: false })).toBe('0');
    expect(decode({ bold: true })).toBeUndefined();
    expect(decode({})).toBeUndefined();
  });
});

describe('attrConfig metadata', () => {
  it('exposes correct xmlName and sdName', () => {
    expect(attrConfig.xmlName).toBe('w:val');
    expect(attrConfig.sdName).toBe('bold');
  });
});

