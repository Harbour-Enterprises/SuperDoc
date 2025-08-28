import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveType } from './index.js';

const TNS_A = 'http://example.com/a';
const TNS_B = 'http://example.com/b';

/**
 * nsMap is expected to be { [tns]: prefix }
 * so Object.entries(nsMap).find(([, v]) => v === pfx)?.[0] yields the TNS.
 */
const nsMap = {
  [TNS_A]: 'a',
  [TNS_B]: 'b',
};

let complexTypes;
let simpleTypes;

beforeEach(() => {
  complexTypes = new Map();
  simpleTypes = new Map();
  vi.restoreAllMocks();
});

describe('resolveType', () => {
  it('returns null for falsy typeName', () => {
    expect(resolveType('', TNS_A, nsMap, complexTypes, simpleTypes)).toBeNull();
    expect(resolveType(null, TNS_A, nsMap, complexTypes, simpleTypes)).toBeNull();
    expect(resolveType(undefined, TNS_A, nsMap, complexTypes, simpleTypes)).toBeNull();
  });

  it('returns null for built-in XSD types (xs: / xsd:) without warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveType('xs:string', TNS_A, nsMap, complexTypes, simpleTypes)).toBeNull();
    expect(resolveType('xsd:int', TNS_A, nsMap, complexTypes, simpleTypes)).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('resolves unprefixed name using contextTns', () => {
    const key = `${TNS_A}::Foo`;
    const resolved = { name: 'FooCT' };
    complexTypes.set(key, resolved);

    const out = resolveType('Foo', TNS_A, nsMap, complexTypes, simpleTypes);
    expect(out).toBe(resolved);
  });

  it('resolves prefixed name using nsMap', () => {
    const key = `${TNS_B}::Bar`;
    const resolved = { name: 'BarCT' };
    complexTypes.set(key, resolved);

    const out = resolveType('b:Bar', TNS_A, nsMap, complexTypes, simpleTypes);
    expect(out).toBe(resolved);
  });

  it('returns null and warns on unknown prefix', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = resolveType('z:Thing', TNS_A, nsMap, complexTypes, simpleTypes);
    expect(out).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/Unknown prefix 'z'/);
  });

  it('returns null (no warning) when complex type missing but simple type exists', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const key = `${TNS_A}::SimpleOne`;
    simpleTypes.set(key, { kind: 'simple' });

    const out = resolveType('SimpleOne', TNS_A, nsMap, complexTypes, simpleTypes);
    expect(out).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns when not found in complexTypes and not a simple type (non-XSD)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = resolveType('MissingType', TNS_A, nsMap, complexTypes, simpleTypes);
    expect(out).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/Could not resolve complex type: MissingType/);
    expect(warnSpy.mock.calls[0][0]).toMatch(TNS_A);
  });

  it('does not warn when not found but the name is an XSD built-in (defensive check)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Even if someone passed "xs:unknownBuiltin", function guards against warning due to xs/xsd check.
    const out = resolveType('xs:unknownBuiltin', TNS_A, nsMap, complexTypes, simpleTypes);
    expect(out).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('constructs the key as `${targetTns}::${localName}`', () => {
    const key = `${TNS_B}::Baz`;
    const resolved = { id: 123, name: 'BazCT' };
    complexTypes.set(key, resolved);

    const out = resolveType('b:Baz', TNS_A, nsMap, complexTypes, simpleTypes);
    expect(out).toEqual(resolved);
  });
});
