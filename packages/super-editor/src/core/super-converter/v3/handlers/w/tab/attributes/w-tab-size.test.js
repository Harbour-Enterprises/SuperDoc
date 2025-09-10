import { describe, it, expect } from 'vitest';
import { encode, decode, attrConfig } from './w-tab-size.js';

describe('w:tab w:val (tabSize) encoder', () => {
  it('returns the value when present', () => {
    expect(encode({ 'w:val': '96' })).toBe('96');
    expect(encode({ 'w:val': '1440' })).toBe('1440');
  });

  it('returns undefined when attribute is missing', () => {
    expect(encode({})).toBeUndefined();
  });

  it('ignores unrelated attributes', () => {
    expect(encode({ 'w:pos': '720' })).toBeUndefined();
  });
});

describe('tabSize decoder', () => {
  it('returns the tabSize value when present', () => {
    expect(decode({ tabSize: '96' })).toBe('96');
    expect(decode({ tabSize: '1440' })).toBe('1440');
  });

  it('returns undefined when tabSize is missing', () => {
    expect(decode({})).toBeUndefined();
  });

  it('ignores unrelated attributes', () => {
    expect(decode({ pos: '720' })).toBeUndefined();
  });
});

describe('round-trip consistency', () => {
  const values = ['96', '1440'];

  for (const val of values) {
    it(`encodes and decodes '${val}' consistently`, () => {
      const encoded = encode({ 'w:val': val });
      expect(encoded).toBe(val);

      const decoded = decode({ tabSize: encoded });
      expect(decoded).toBe(val);
    });
  }
});

describe('attrConfig metadata', () => {
  it('exposes correct xmlName and sdName', () => {
    expect(attrConfig.xmlName).toBe('w:val');
    expect(attrConfig.sdName).toBe('tabSize');
  });
});
