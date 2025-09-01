import { describe, it, expect } from 'vitest';
import { parser, arr, qn, inlineCT, contentRoot } from './index.js';

describe('parser (fast-xml-parser) config', () => {
  it('parses attributes (ignoreAttributes=false) with empty attributeNamePrefix', () => {
    const xml = `<root id="42"><child>text</child></root>`;
    const out = parser.parse(xml);

    expect(out.root.id).toBe('42');
    expect(out.root.child).toBe('text');
  });

  it('handles multiple attributes without prefix collisions', () => {
    const xml = `<el a="1" b="2" c="3"/>`;
    const out = parser.parse(xml);
    expect(out.el.a).toBe('1');
    expect(out.el.b).toBe('2');
    expect(out.el.c).toBe('3');
  });
});

describe('arr()', () => {
  it('returns arrays unchanged (same reference)', () => {
    const input = [1, 2];
    expect(arr(input)).toBe(input);
  });

  it('wraps truthy non-arrays into an array', () => {
    expect(arr('x')).toEqual(['x']);
    expect(arr({ a: 1 })).toEqual([{ a: 1 }]);
    expect(arr(true)).toEqual([true]);
  });

  it('returns [] for falsy values (null/undefined/0/empty string)', () => {
    expect(arr(null)).toEqual([]);
    expect(arr(undefined)).toEqual([]);
    expect(arr(0)).toEqual([]);
    expect(arr('')).toEqual([]);
  });
});

describe('qn()', () => {
  it('joins prefix and local with a colon', () => {
    expect(qn('w', 'p')).toBe('w:p');
    expect(qn('xs', 'sequence')).toBe('xs:sequence');
  });
});

describe('inlineCT()', () => {
  it('returns xs:complexType when present', () => {
    const el = { 'xs:complexType': { name: 'CT_Something' } };
    expect(inlineCT(el)).toEqual({ name: 'CT_Something' });
  });

  it('returns xsd:complexType when present', () => {
    const el = { 'xsd:complexType': { name: 'CT_Other' } };
    expect(inlineCT(el)).toEqual({ name: 'CT_Other' });
  });

  it('returns null when not present', () => {
    const el = { foo: 'bar' };
    expect(inlineCT(el)).toBeNull();
  });
});

describe('contentRoot()', () => {
  it('picks direct xs:sequence/xs:choice/xs:all', () => {
    const withSeq = { 'xs:sequence': { tag: 'seq' } };
    const withChoice = { 'xs:choice': { tag: 'choice' } };
    const withAll = { 'xs:all': { tag: 'all' } };

    expect(contentRoot(withSeq)).toEqual({ tag: 'seq' });
    expect(contentRoot(withChoice)).toEqual({ tag: 'choice' });
    expect(contentRoot(withAll)).toEqual({ tag: 'all' });
  });

  it('picks direct xsd:sequence/xsd:choice/xsd:all', () => {
    const withSeq = { 'xsd:sequence': { tag: 'seq' } };
    const withChoice = { 'xsd:choice': { tag: 'choice' } };
    const withAll = { 'xsd:all': { tag: 'all' } };

    expect(contentRoot(withSeq)).toEqual({ tag: 'seq' });
    expect(contentRoot(withChoice)).toEqual({ tag: 'choice' });
    expect(contentRoot(withAll)).toEqual({ tag: 'all' });
  });

  it('resolves through complexContent/extension (xs:*)', () => {
    const ct = {
      'xs:complexContent': {
        'xs:extension': {
          'xs:sequence': { tag: 'ext-seq' },
        },
      },
    };
    expect(contentRoot(ct)).toEqual({ tag: 'ext-seq' });
  });

  it('resolves through complexContent/extension (xsd:*)', () => {
    const ct = {
      'xsd:complexContent': {
        'xsd:extension': {
          'xsd:choice': { tag: 'ext-choice' },
        },
      },
    };
    expect(contentRoot(ct)).toEqual({ tag: 'ext-choice' });
  });

  it('resolves xsd:all through complexContent/extension', () => {
    const ct = {
      'xsd:complexContent': {
        'xsd:extension': {
          'xsd:all': { tag: 'ext-all' },
        },
      },
    };
    expect(contentRoot(ct)).toEqual({ tag: 'ext-all' });
  });

  it('prefers extension child order: sequence > choice > all', () => {
    const ct = {
      'xs:complexContent': {
        'xs:extension': {
          'xs:choice': { tag: 'choice' },
          'xs:sequence': { tag: 'seq' }, // sequence should win
          'xs:all': { tag: 'all' },
        },
      },
    };
    expect(contentRoot(ct)).toEqual({ tag: 'seq' });
  });

  it('returns null when no content model exists', () => {
    const ct = { name: 'NoContent' };
    expect(contentRoot(ct)).toBeNull();
  });
});
