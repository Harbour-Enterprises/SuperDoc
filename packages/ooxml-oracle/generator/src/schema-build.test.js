// schema-build.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

const H = vi.hoisted(() => ({
  PASS_THROUGH: ['w:bookmarkStart', 'w:bookmarkEnd'],
  parserParse: vi.fn(),
}));

// --- core mocks (must be defined before importing SUT) ---
vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));
vi.mock('node:path', () => ({
  join: vi.fn((...p) => p.join('/')),
}));
vi.mock('./constants.js', () => {
  const NS_MAP = { 'urn:w': 'w' }; // fresh object per module load; we reset per test
  return { NS_MAP, PASS_THROUGH: H.PASS_THROUGH };
});
vi.mock('./builder/index.js', () => {
  const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  return {
    arr: vi.fn(arr),
    qn: vi.fn((p, l) => `${p}:${l}`),
    parser: { parse: H.parserParse }, // hoist-safe
    inlineCT: vi.fn(() => null),
    contentRoot: vi.fn(() => null),
    expandContent: vi.fn(),
    resolveType: vi.fn(() => null),
    collectElements: vi.fn(),
    autoPrefix: vi.fn((tns, nsMap) => {
      if (!nsMap[tns]) nsMap[tns] = `g${Object.keys(nsMap).length}`;
      return nsMap[tns];
    }),
    resolveChildQName: vi.fn(),
  };
});

// Import SUT after mocks
import { readdirSync, readFileSync } from 'node:fs';
import { buildFromXsdDir } from './schema-build.js';

// Helpers to access mocked modules
const getConstants = async () => await import('./constants.js');
const getBuilder = async () => await import('./builder/index.js');

beforeEach(async () => {
  vi.clearAllMocks();
  H.parserParse.mockReset();

  // Reset mutable NS_MAP for isolation
  const { NS_MAP } = await getConstants();
  for (const k of Object.keys(NS_MAP)) delete NS_MAP[k];
  Object.assign(NS_MAP, { 'urn:w': 'w' });

  // Reset builder mocks (keep their identity)
  const b = await getBuilder();
  b.arr.mockClear();
  b.qn.mockClear();
  b.inlineCT.mockReset().mockImplementation(() => null);
  b.contentRoot.mockReset().mockImplementation(() => null);
  b.expandContent.mockReset();
  b.resolveType.mockReset().mockImplementation(() => null);
  b.collectElements.mockReset();
  b.autoPrefix.mockClear(); // default impl ok
  b.resolveChildQName.mockReset();
});

describe('schema-build', () => {
  it('reads only .xsd files', async () => {
    readdirSync.mockReturnValueOnce(['a.xsd', 'b.txt', 'c.xsd']);
    H.parserParse
      .mockReturnValueOnce({ 'xs:schema': { targetNamespace: 'urn:w' } })
      .mockReturnValueOnce({ 'xs:schema': { targetNamespace: 'urn:w' } });

    const res = buildFromXsdDir('/fake');
    expect(H.parserParse).toHaveBeenCalledTimes(2);
    expect(res.namespaces['urn:w']).toBe('w');
    expect(typeof res.elements).toBe('object');
  });

  it('adds namespace mappings from xs:import and auto-assigns prefixes', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:import': [{ namespace: 'urn:a' }, { namespace: 'urn:b' }, { namespace: 'urn:a' }],
      },
    });

    const res = buildFromXsdDir('/fake');
    expect(res.namespaces['urn:w']).toBe('w');
    expect(res.namespaces['urn:a']).toBeDefined();
    expect(res.namespaces['urn:b']).toBeDefined();
    expect(res.namespaces['urn:a']).not.toBe('w');
    expect(res.namespaces['urn:b']).not.toBe('w');
  });

  it('collects top-level elements and resolves children via contentRoot/expandContent/resolveChildQName', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'document', type: 'w:DocumentType' }],
        'xs:complexType': [{ name: 'DocumentType' }],
      },
    });

    const b = await getBuilder();
    b.resolveType.mockImplementation((t) => (t === 'w:DocumentType' ? { name: 'DocumentType' } : null));
    b.contentRoot.mockReturnValueOnce({ tag: 'root' });
    b.expandContent.mockImplementation((_root, parts) => {
      parts.push({ name: 'body' }, { ref: 'w:p' });
    });
    b.resolveChildQName.mockImplementation((e, tns, nsMap) => (e.name ? `${nsMap[tns]}:${e.name}` : e.ref));

    const res = buildFromXsdDir('/fake');
    expect(res.elements['w:document']).toBeDefined();
    const kids = res.elements['w:document'].children;
    expect(kids).toEqual(expect.arrayContaining(['w:body', 'w:p', ...H.PASS_THROUGH]));
  });

  it('resolves elementRefs into synthetic elements when not already defined', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'wrapper', type: 'w:WrapperType' }],
        'xs:complexType': [{ name: 'WrapperType' }],
      },
    });

    const b = await getBuilder();
    b.resolveType.mockReturnValueOnce({ name: 'WrapperType' });
    b.contentRoot.mockReturnValueOnce({});
    // When collectElements is called, stash an unresolved ref
    b.collectElements.mockImplementation((_node, _tns, _pfx, _elements, elementRefs) => {
      elementRefs.set('w:tbl', { tns: 'urn:w', prefix: 'w' });
    });
    // And reference it in children too, to mark it as "referenced"
    b.expandContent.mockImplementation((_root, parts) => parts.push({ ref: 'w:tbl' }));
    b.resolveChildQName.mockImplementation((e) => e.ref);

    const res = buildFromXsdDir('/fake');
    expect(res.elements['w:tbl']).toBeDefined();
    expect(res.elements['w:tbl'].children).toEqual([]);
    expect(res.elements['w:tbl'].attributes).toEqual({});
  });

  it('creates synthetic elements from CT_ pattern (CT_P -> w:p) when missing', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:complexType': [{ name: 'CT_P' }],
      },
    });

    const res = buildFromXsdDir('/fake');
    expect(res.elements['w:p']).toBeDefined();
    // containers get pass-through
    expect(res.elements['w:p'].children).toEqual([...H.PASS_THROUGH].sort());
  });

  it('extracts direct and simpleContent attributes', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'r', type: 'w:RunType' }],
        'xs:complexType': [{ name: 'RunType' }],
      },
    });

    const b = await getBuilder();
    b.resolveType.mockImplementation((t) =>
      t === 'w:RunType'
        ? {
            'xs:simpleContent': {
              'xs:extension': {
                'xs:attribute': [{ name: 'val', type: 'xs:string', use: 'optional' }],
              },
            },
            'xs:attribute': [{ name: 'color', type: 'xs:string' }],
          }
        : null,
    );
    b.contentRoot.mockReturnValue(null);

    const res = buildFromXsdDir('/fake');
    const attrs = res.elements['w:r'].attributes;
    expect(attrs['w:val']).toMatchObject({ type: 'xs:string', use: 'optional' });
    expect(attrs['w:color']).toMatchObject({ type: 'xs:string' });
  });

  it('resolves attributeGroup refs and anyAttribute', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'el', type: 'w:ElType' }],
        'xs:complexType': [
          {
            name: 'ElType',
            'xs:complexContent': {
              'xs:extension': {
                base: 'w:Base',
                'xs:attributeGroup': [{ ref: 'w:runAttrs' }],
                'xs:anyAttribute': {},
              },
            },
          },
          {
            name: 'Base',
            'xs:attribute': [{ name: 'baseAttr', type: 'xs:string' }],
          },
        ],
        'xs:attributeGroup': [
          {
            name: 'runAttrs',
            'xs:attribute': [{ name: 'id', type: 'xs:string' }],
          },
        ],
      },
    });

    const b = await getBuilder();
    // Resolve base to the second CT so inheritance pulls baseAttr
    b.resolveType.mockImplementation((t) =>
      t === 'w:ElType'
        ? {
            'xs:complexContent': {
              'xs:extension': { base: 'w:Base', 'xs:attributeGroup': [{ ref: 'w:runAttrs' }], 'xs:anyAttribute': {} },
            },
          }
        : t === 'w:Base'
          ? { 'xs:attribute': [{ name: 'baseAttr', type: 'xs:string' }] }
          : null,
    );
    b.contentRoot.mockReturnValue(null);

    const res = buildFromXsdDir('/fake');
    const attrs = res.elements['w:el'].attributes;
    expect(attrs['w:baseAttr']).toMatchObject({ type: 'xs:string' });
    expect(attrs['w:id']).toMatchObject({ type: 'xs:string' });
    expect(attrs['@anyAttribute']).toBe(true);
  });

  it('adds pass-through when element has children OR is a known container', async () => {
    // Case 1: known container with no type -> still gets pass-through
    readdirSync.mockReturnValueOnce(['c1.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'document' }], // no type, no ct
      },
    });

    let res = buildFromXsdDir('/fake1');
    expect(res.elements['w:document'].children).toEqual(expect.arrayContaining(H.PASS_THROUGH));

    // Case 2: non-container but has children -> gets pass-through too
    // Reset parser for new run
    readdirSync.mockReturnValueOnce(['c2.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'z', type: 'w:ZType' }],
        'xs:complexType': [{ name: 'ZType' }],
      },
    });
    const b = await getBuilder();
    b.resolveType.mockReturnValueOnce({ name: 'ZType' });
    b.contentRoot.mockReturnValueOnce({});
    b.expandContent.mockImplementation((_root, parts) => parts.push({ name: 'zz' }));
    b.resolveChildQName.mockImplementation((e, tns, nsMap) => `${nsMap[tns]}:${e.name}`);

    res = buildFromXsdDir('/fake2');
    expect(res.elements['w:z'].children).toEqual(expect.arrayContaining(['w:zz', ...H.PASS_THROUGH]));
  });

  it('adds stub entries for referenced-but-undefined elements (non-container)', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'wrapper', type: 'w:WrapperType' }],
        'xs:complexType': [{ name: 'WrapperType' }],
      },
    });

    const b = await getBuilder();
    b.resolveType.mockReturnValueOnce({ name: 'WrapperType' });
    b.contentRoot.mockReturnValueOnce({});
    b.expandContent.mockImplementation((_root, parts) => parts.push({ ref: 'w:foo' }));
    b.resolveChildQName.mockImplementation((e) => e.ref);

    const res = buildFromXsdDir('/fake');
    expect(res.elements['w:foo']).toEqual({ children: [], attributes: {} });
  });

  it('supports xsd:schema and xsd:import variants', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    // Use xsd:schema (not xs:schema) and xsd:import (not xs:import)
    H.parserParse.mockReturnValueOnce({
      'xsd:schema': {
        targetNamespace: 'urn:w',
        'xsd:import': [{ namespace: 'urn:a' }],
      },
    });

    const res = buildFromXsdDir('/fake');
    // namespace map should include original and imported one (auto-assigned)
    expect(res.namespaces['urn:w']).toBe('w');
    expect(res.namespaces['urn:a']).toBeDefined();
    expect(res.namespaces['urn:a']).not.toBe('w');
  });

  it('resolves elementRefs with unprefixed refs (falls back to same TNS)', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'wrapper', type: 'w:WrapperType' }],
        'xs:complexType': [{ name: 'WrapperType' }],
      },
    });

    const b = await getBuilder();
    b.resolveType.mockReturnValueOnce({ name: 'WrapperType' });
    b.contentRoot.mockReturnValueOnce({});
    // collectElements adds an unresolved **unprefixed** ref: "tbl"
    b.collectElements.mockImplementation((_node, tns, prefix, _elements, elementRefs) => {
      elementRefs.set('tbl', { tns: 'urn:w', prefix: 'w' });
    });
    // also reference it in content to mark it "referenced"
    b.expandContent.mockImplementation((_root, parts) => parts.push({ ref: 'tbl' }));
    b.resolveChildQName.mockImplementation((e) => (e.ref.includes(':') ? e.ref : `w:${e.ref}`));

    const res = buildFromXsdDir('/fake');
    expect(res.elements['w:tbl']).toBeDefined();
    // created as synthetic (empty children/attrs)
    expect(res.elements['w:tbl'].children).toEqual([]);
    expect(res.elements['w:tbl'].attributes).toEqual({});
  });

  it('does NOT create CT_ synthetic element when heuristic fails (name too long)', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        // CT_ name > 10 chars after "CT_" so heuristic should skip creating element
        'xs:complexType': [{ name: 'CT_ThisNameIsDefinitelyLong' }],
      },
    });

    const res = buildFromXsdDir('/fake');
    // Should NOT synthesize w:thisNameIsDefinitelyLong
    const maybe = Object.keys(res.elements).find((q) => /thisNameIsDefinitelyLong/i.test(q));
    expect(maybe).toBeUndefined();
  });

  it('extractDirectAttributes: resolves unprefixed attribute ref using current TNS', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'el', type: 'w:ElType' }],
        'xs:complexType': [
          {
            name: 'ElType',
            'xs:complexContent': {
              'xs:extension': {
                base: 'w:Base',
                // attribute ref WITHOUT prefix; should attach as "w:id"
                'xs:attribute': [{ ref: 'id', use: 'optional' }],
              },
            },
          },
          {
            name: 'Base',
            'xs:attribute': [{ name: 'baseAttr', type: 'xs:string' }],
          },
        ],
      },
    });

    const b = await getBuilder();
    b.resolveType
      .mockImplementationOnce((_t) => ({
        // resolve ElType
        'xs:complexContent': {
          'xs:extension': { base: 'w:Base', 'xs:attribute': [{ ref: 'id', use: 'optional' }] },
        },
      }))
      .mockImplementationOnce((_t) => ({
        // resolve Base
        'xs:attribute': [{ name: 'baseAttr', type: 'xs:string' }],
      }));
    b.contentRoot.mockReturnValue(null);

    const res = buildFromXsdDir('/fake');
    const attrs = res.elements['w:el'].attributes;
    expect(attrs['w:baseAttr']).toMatchObject({ type: 'xs:string' });
    // unprefixed ref -> prefix from current TNS (w)
    expect(attrs['w:id']).toMatchObject({ type: 'referenced', ref: 'id', use: 'optional' });
  });

  it('attributeGroup ref without prefix resolves within same TNS', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'el', type: 'w:ElType' }],
        'xs:complexType': [
          {
            name: 'ElType',
            'xs:complexContent': {
              'xs:extension': {
                base: 'w:Base',
                // attributeGroup ref WITHOUT prefix; should pull group from same TNS
                'xs:attributeGroup': [{ ref: 'runAttrs' }],
                'xs:anyAttribute': {}, // we’ll also hit the xsd:anyAttribute in the next test
              },
            },
          },
          { name: 'Base', 'xs:attribute': [{ name: 'fromBase', type: 'xs:string' }] },
        ],
        'xs:attributeGroup': [{ name: 'runAttrs', 'xs:attribute': [{ name: 'id', type: 'xs:string' }] }],
      },
    });

    const b = await getBuilder();
    b.resolveType
      .mockImplementationOnce((_t) => ({
        // ElType
        'xs:complexContent': {
          'xs:extension': {
            base: 'w:Base',
            'xs:attributeGroup': [{ ref: 'runAttrs' }],
            'xs:anyAttribute': {},
          },
        },
      }))
      .mockImplementationOnce((_t) => ({
        // Base
        'xs:attribute': [{ name: 'fromBase', type: 'xs:string' }],
      }));
    b.contentRoot.mockReturnValue(null);

    const res = buildFromXsdDir('/fake');
    const attrs = res.elements['w:el'].attributes;
    expect(attrs['w:fromBase']).toMatchObject({ type: 'xs:string' });
    // group from same TNS (ref had no prefix)
    expect(attrs['w:id']).toMatchObject({ type: 'xs:string' });
    expect(attrs['@anyAttribute']).toBe(true);
  });

  it('recognizes xsd:anyAttribute as well as xs:anyAttribute', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:element': [{ name: 'el', type: 'w:ElType' }],
        'xs:complexType': [
          {
            name: 'ElType',
            'xs:simpleContent': {
              'xs:extension': {
                // specifically test the xsd:anyAttribute branch here
                'xsd:anyAttribute': {},
              },
            },
          },
        ],
      },
    });

    const b = await getBuilder();
    b.resolveType.mockImplementation((_t) => ({
      'xs:simpleContent': { 'xs:extension': { 'xsd:anyAttribute': {} } },
    }));
    b.contentRoot.mockReturnValue(null);

    const res = buildFromXsdDir('/fake');
    const attrs = res.elements['w:el'].attributes;
    expect(attrs['@anyAttribute']).toBe(true);
  });

  it('ignores xs:import entries without a namespace', async () => {
    readdirSync.mockReturnValueOnce(['doc.xsd']);
    // imports include missing/empty namespace → should be ignored
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:import': [{}, { namespace: '' }],
      },
    });

    const res = buildFromXsdDir('/fake');
    // Should only have the original mapping; no new prefixes created
    expect(res.namespaces['urn:w']).toBe('w');
    // no bogus keys like '' or undefined
    expect(Object.keys(res.namespaces)).toEqual(expect.arrayContaining(['urn:w']));
    expect(Object.keys(res.namespaces)).not.toContain('');
  });

  it('does not overwrite an existing namespace mapping from xs:import', async () => {
    // Pre-seed NS_MAP with an existing mapping
    const { NS_MAP } = await getConstants();
    NS_MAP['urn:a'] = 'a';

    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        // one already-mapped (urn:a), one new (urn:b)
        'xs:import': [{ namespace: 'urn:a' }, { namespace: 'urn:b' }],
      },
    });

    const res = buildFromXsdDir('/fake');

    // Existing mapping preserved
    expect(res.namespaces['urn:a']).toBe('a');

    // New mapping auto-assigned (not 'w' or 'a')
    expect(res.namespaces['urn:b']).toBeDefined();
    expect(['w', 'a']).not.toContain(res.namespaces['urn:b']);
  });

  it('normalizes single-object xs:import and xsd:import via arr(...) and assigns prefixes for both', async () => {
    // Two files so each schema variant is processed (the SUT picks one schema per file)
    readdirSync.mockReturnValueOnce(['a.xsd', 'b.xsd']);

    H.parserParse
      // File 1: xs:schema with single-object xs:import
      .mockReturnValueOnce({
        'xs:schema': {
          targetNamespace: 'urn:w',
          'xs:import': { namespace: 'urn:a' }, // not an array
        },
      })
      // File 2: xsd:schema with single-object xsd:import
      .mockReturnValueOnce({
        'xsd:schema': {
          targetNamespace: 'urn:w',
          'xsd:import': { namespace: 'urn:b' }, // not an array
        },
      });

    const res = buildFromXsdDir('/fake');

    expect(res.namespaces['urn:w']).toBe('w');
    expect(res.namespaces['urn:a']).toBeDefined();
    expect(res.namespaces['urn:b']).toBeDefined();
    expect(res.namespaces['urn:a']).not.toBe('w');
    expect(res.namespaces['urn:b']).not.toBe('w');
    expect(res.namespaces['urn:a']).not.toBe(res.namespaces['urn:b']); // distinct autoprefixes
  });

  it('re-assigns a prefix when the namespace exists with a falsy mapping (e.g., empty string)', async () => {
    // Pre-seed NS_MAP with a falsy mapping for a namespace
    const { NS_MAP } = await getConstants();
    NS_MAP['urn:empty'] = ''; // falsy -> condition `!nsMap[imp.namespace]` should pass

    readdirSync.mockReturnValueOnce(['doc.xsd']);
    H.parserParse.mockReturnValueOnce({
      'xs:schema': {
        targetNamespace: 'urn:w',
        'xs:import': [{ namespace: 'urn:empty' }],
      },
    });

    const res = buildFromXsdDir('/fake');

    // Should get a real auto-assigned prefix (non-empty string)
    expect(res.namespaces['urn:empty']).toBeDefined();
    expect(res.namespaces['urn:empty']).not.toBe('');
    // And not collide with 'w'
    expect(res.namespaces['urn:empty']).not.toBe('w');
  });
});
