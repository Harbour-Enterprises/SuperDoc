import { describe, it, expect } from 'vitest';
import { autoPrefix } from './index.js';

describe('autoPrefix', () => {
  it('returns "unknown" if tns is falsy', () => {
    const nsMap = {};
    expect(autoPrefix('', nsMap)).toBe('unknown');
    expect(autoPrefix(null, nsMap)).toBe('unknown');
    expect(autoPrefix(undefined, nsMap)).toBe('unknown');
  });

  it('returns existing prefix if tns is already in nsMap', () => {
    const nsMap = { 'http://example.com': 'ex' };
    const result = autoPrefix('http://example.com', nsMap);
    expect(result).toBe('ex');
    expect(nsMap).toEqual({ 'http://example.com': 'ex' }); // unchanged
  });

  it('assigns a new prefix if tns is not in nsMap', () => {
    const nsMap = {};
    const result = autoPrefix('http://new.com', nsMap);
    expect(result).toBe('g0');
    expect(nsMap).toEqual({ 'http://new.com': 'g0' });
  });

  it('assigns incrementing prefixes based on nsMap size', () => {
    const nsMap = { 'http://one.com': 'g0', 'http://two.com': 'g1' };
    const result = autoPrefix('http://three.com', nsMap);
    expect(result).toBe('g2');
    expect(nsMap).toEqual({
      'http://one.com': 'g0',
      'http://two.com': 'g1',
      'http://three.com': 'g2',
    });
  });

  it('does not overwrite existing mapping for different tns', () => {
    const nsMap = { 'http://foo.com': 'g0' };
    autoPrefix('http://bar.com', nsMap);
    expect(nsMap).toHaveProperty('http://foo.com', 'g0');
    expect(nsMap).toHaveProperty('http://bar.com', 'g1');
  });
});
