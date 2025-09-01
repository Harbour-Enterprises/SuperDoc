import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./schema.js', () => {
  return {
    getSchema: vi.fn(),
    loadSchemaSync: vi.fn(),
  };
});

import {
  getPrefix,
  getLocalName,
  allowedChildren,
  isAllowedChild,
  validateChildren,
  getElementsByNamespace,
  hasElement,
  getSchemaStats,
  childrenOf,
  allTags,
  namespaces,
} from './lookup.js';

import { getSchema, loadSchemaSync } from './schema.js';

const makeSchema = (overrides = {}) => ({
  elements: {
    'html:ul': { children: ['html:li'] },
    'html:li': { children: [] },
    'html:div': { children: ['html:span', 'html:div'] },
    'html:span': { children: [] },
    'svg:svg': { children: ['svg:g', 'svg:rect'] },
    'svg:g': { children: [] },
    'svg:rect': { children: [] },
    'math:math': { children: [] },
    nopfx: { children: ['nopfx-child'] }, // demonstrates no prefix
    'nopfx-child': { children: [] },
    // element with attributes but no children array:
    'html:img': { attributes: { src: 'string' } },
    ...overrides.elements,
  },
  namespaces: {
    'http://www.w3.org/1999/xhtml': 'html',
    'http://www.w3.org/2000/svg': 'svg',
    'http://www.w3.org/1998/Math/MathML': 'math',
    ...overrides.namespaces,
  },
});

describe('lookup helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPrefix', () => {
    it('returns prefix when present', () => {
      expect(getPrefix('html:div')).toBe('html');
      expect(getPrefix('svg:rect')).toBe('svg');
    });
    it('returns empty string when no colon', () => {
      expect(getPrefix('div')).toBe('');
      expect(getPrefix('')).toBe('');
    });
  });

  describe('getLocalName', () => {
    it('returns local part with prefix', () => {
      expect(getLocalName('html:div')).toBe('div');
      expect(getLocalName('svg:rect')).toBe('rect');
    });
    it('returns whole string when no prefix', () => {
      expect(getLocalName('div')).toBe('div');
    });
  });

  describe('allowedChildren', () => {
    it('returns children array when present', () => {
      const schema = makeSchema();
      getSchema.mockReturnValue(schema);
      expect(allowedChildren('html:ul')).toEqual(['html:li']);
      expect(allowedChildren('html:div')).toEqual(['html:span', 'html:div']);
    });
    it('returns empty array when element not found', () => {
      getSchema.mockReturnValue(makeSchema());
      expect(allowedChildren('html:table')).toEqual([]);
    });
    it('returns empty array when element has no children array', () => {
      getSchema.mockReturnValue(makeSchema());
      expect(allowedChildren('html:img')).toEqual([]);
    });
  });

  describe('isAllowedChild', () => {
    it('true for valid child; false otherwise', () => {
      getSchema.mockReturnValue(makeSchema());
      expect(isAllowedChild('html:ul', 'html:li')).toBe(true);
      expect(isAllowedChild('html:ul', 'html:div')).toBe(false);
      expect(isAllowedChild('html:img', 'html:span')).toBe(false);
    });
  });

  describe('validateChildren', () => {
    it('flags invalid children only', () => {
      getSchema.mockReturnValue(makeSchema());
      const res = validateChildren('html:div', ['html:span', 'html:div', 'html:li']);
      expect(res.ok).toBe(false);
      expect(res.invalid).toEqual(['html:li']);
    });
    it('ok when all valid', () => {
      getSchema.mockReturnValue(makeSchema());
      const res = validateChildren('html:ul', ['html:li']);
      expect(res.ok).toBe(true);
      expect(res.invalid).toEqual([]);
    });
    it('ok when no children to check', () => {
      getSchema.mockReturnValue(makeSchema());
      const res = validateChildren('html:img', []);
      expect(res.ok).toBe(true);
      expect(res.invalid).toEqual([]);
    });
  });

  describe('getElementsByNamespace', () => {
    it('returns local names for matching namespace', () => {
      getSchema.mockReturnValue(makeSchema());
      const out = getElementsByNamespace('http://www.w3.org/2000/svg');
      // svg elements present: svg, g, rect
      expect(out.sort()).toEqual(['g', 'rect', 'svg']);
    });
    it('returns empty for unknown namespace', () => {
      getSchema.mockReturnValue(makeSchema());
      expect(getElementsByNamespace('http://unknown/')).toEqual([]);
    });
    it('handles no elements gracefully', () => {
      getSchema.mockReturnValue({ elements: {}, namespaces: { x: 'x' } });
      expect(getElementsByNamespace('x')).toEqual([]);
    });
  });

  describe('hasElement', () => {
    it('true when element exists', () => {
      getSchema.mockReturnValue(makeSchema());
      expect(hasElement('html:ul')).toBe(true);
    });
    it('false when element missing', () => {
      getSchema.mockReturnValue(makeSchema());
      expect(hasElement('html:table')).toBe(false);
    });
  });

  describe('getSchemaStats', () => {
    it('computes totals, elementsWithChildren, namespaces, and byNamespace', () => {
      const schema = makeSchema();
      getSchema.mockReturnValue(schema);

      const s = getSchemaStats();
      // total elements is count of keys in elements
      expect(s.totalElements).toBe(Object.keys(schema.elements).length);

      // elements with children > 0
      const expectedWithChildren = Object.values(schema.elements).filter(
        (def) => (def.children?.length ?? 0) > 0,
      ).length;
      expect(s.elementsWithChildren).toBe(expectedWithChildren);

      // namespaces count is keys in namespaces
      expect(s.namespaces).toBe(Object.keys(schema.namespaces).length);

      // byNamespace counts by prefix present in qname
      const expectedByNs = {};
      for (const qn of Object.keys(schema.elements)) {
        const p = qn.includes(':') ? qn.split(':')[0] : '';
        if (p) expectedByNs[p] = (expectedByNs[p] || 0) + 1;
      }
      expect(s.byNamespace).toEqual(expectedByNs);
    });

    it('handles empty schema structures', () => {
      getSchema.mockReturnValue({ elements: {}, namespaces: {} });
      const s = getSchemaStats();
      expect(s).toEqual({
        totalElements: 0,
        elementsWithChildren: 0,
        namespaces: 0,
        byNamespace: {},
      });
    });
  });

  describe('childrenOf (sync path)', () => {
    it('uses loadSchemaSync and returns children', () => {
      const schema = makeSchema();
      loadSchemaSync.mockReturnValue(schema);
      expect(childrenOf('svg:svg')).toEqual(['svg:g', 'svg:rect']);
      expect(childrenOf('html:img')).toEqual([]); // no children array
      expect(childrenOf('missing:el')).toEqual([]);
    });
  });

  describe('allTags (sync path)', () => {
    it('returns all tags sorted by default', () => {
      const schema = makeSchema();
      loadSchemaSync.mockReturnValue(schema);
      const out = allTags();
      const expected = Object.keys(schema.elements).sort();
      expect(out).toEqual(expected);
    });

    it('filters by prefix (with or without colon)', () => {
      loadSchemaSync.mockReturnValue(makeSchema());
      const htmlA = allTags({ prefix: 'html' });
      const htmlB = allTags({ prefix: 'html:' });
      expect(htmlA).toEqual(htmlB);
      expect(htmlA.every((t) => t.startsWith('html:'))).toBe(true);
    });

    it('filters by hasChildren = true', () => {
      loadSchemaSync.mockReturnValue(makeSchema());
      const out = allTags({ hasChildren: true });
      expect(out.length).toBeGreaterThan(0);
      expect(out.every((t) => (loadSchemaSync().elements[t]?.children?.length ?? 0) > 0)).toBe(true);
    });

    it('filters by hasChildren = false', () => {
      loadSchemaSync.mockReturnValue(makeSchema());
      const out = allTags({ hasChildren: false });
      expect(out.length).toBeGreaterThan(0);
      expect(out.every((t) => (loadSchemaSync().elements[t]?.children?.length ?? 0) === 0)).toBe(true);
    });

    it('combines prefix and hasChildren filters', () => {
      loadSchemaSync.mockReturnValue(makeSchema());
      const out = allTags({ prefix: 'svg', hasChildren: false });
      expect(out.every((t) => t.startsWith('svg:'))).toBe(true);
      expect(out.every((t) => (loadSchemaSync().elements[t]?.children?.length ?? 0) === 0)).toBe(true);
    });
  });

  describe('namespaces (sync path)', () => {
    it('returns namespaces from sync schema', () => {
      const schema = makeSchema();
      loadSchemaSync.mockReturnValue(schema);
      expect(namespaces()).toEqual(schema.namespaces);
    });
    it('works with empty namespaces', () => {
      loadSchemaSync.mockReturnValue({ elements: {}, namespaces: {} });
      expect(namespaces()).toEqual({});
    });
  });
});
