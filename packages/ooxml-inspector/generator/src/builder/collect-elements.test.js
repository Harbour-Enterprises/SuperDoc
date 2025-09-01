import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collectElements } from './collect-elements.js';

vi.mock('./index.js', () => ({
  arr: vi.fn((x) => (Array.isArray(x) ? x : x ? [x] : [])),
}));

import { arr } from './index.js';

const TNS = 'urn:example';
const PFX = 'ex';

let elements;
let elementRefs;

beforeEach(() => {
  vi.clearAllMocks();
  elements = new Map();
  elementRefs = new Map();
});

describe('collectElements', () => {
  it('no-ops on falsy node and respects depth guard', () => {
    collectElements(null, TNS, PFX, elements, elementRefs, 0);
    expect(elements.size).toBe(0);
    expect(elementRefs.size).toBe(0);

    collectElements({}, TNS, PFX, elements, elementRefs, 11); // depth > 10
    expect(elements.size).toBe(0);
    expect(elementRefs.size).toBe(0);
  });

  it('collects direct named elements (xs:element & xsd:element)', () => {
    const node = {
      'xs:element': [{ name: 'Alpha' }],
      'xsd:element': [{ name: 'Beta' }],
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect([...elements.keys()].sort()).toEqual([`${TNS}::Alpha`, `${TNS}::Beta`]);
    expect(elements.get(`${TNS}::Alpha`)).toMatchObject({
      tns: TNS,
      prefix: PFX,
      name: 'Alpha',
    });
    expect(elements.get(`${TNS}::Beta`)).toMatchObject({
      tns: TNS,
      prefix: PFX,
      name: 'Beta',
    });
    expect(elementRefs.size).toBe(0);
  });

  it('tracks element refs (xs/xsd) in elementRefs without expanding', () => {
    const node = {
      'xs:element': [{ ref: 'a:Gamma' }],
      'xsd:element': [{ ref: 'Delta' }],
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.size).toBe(0);
    expect([...elementRefs.keys()].sort()).toEqual(['Delta', 'a:Gamma']);
    expect(elementRefs.get('a:Gamma')).toEqual({ tns: TNS, prefix: PFX });
    expect(elementRefs.get('Delta')).toEqual({ tns: TNS, prefix: PFX });
  });

  it('does not duplicate existing named elements', () => {
    const node = { 'xs:element': [{ name: 'Alpha' }, { name: 'Alpha' }] };
    collectElements(node, TNS, PFX, elements, elementRefs);
    expect(elements.size).toBe(1);
    expect(elements.has(`${TNS}::Alpha`)).toBe(true);
  });

  it('recurses into sequence/choice/all (xs & xsd variants)', () => {
    const node = {
      'xs:sequence': {
        'xsd:element': [{ name: 'SeqChild' }],
        'xs:choice': {
          'xs:element': [{ name: 'ChoiceChild' }],
        },
        'xsd:all': {
          'xsd:element': [{ name: 'AllChild' }],
        },
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::SeqChild`)).toBe(true);
    expect(elements.has(`${TNS}::ChoiceChild`)).toBe(true);
    expect(elements.has(`${TNS}::AllChild`)).toBe(true);
  });

  it('recurses through complexContent extension and restriction (xs/xsd)', () => {
    const node = {
      'xs:complexContent': {
        'xs:extension': {
          'xs:sequence': { 'xs:element': [{ name: 'FromExtension' }] },
        },
        'xsd:restriction': {
          'xsd:choice': { 'xsd:element': [{ name: 'FromRestriction' }] },
        },
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::FromExtension`)).toBe(true);
    expect(elements.has(`${TNS}::FromRestriction`)).toBe(true);
  });

  it('recurses through simpleContent extension and restriction (xs/xsd)', () => {
    const node = {
      'xsd:simpleContent': {
        'xsd:extension': {
          'xs:all': { 'xsd:element': [{ name: 'SCFromExt' }] },
        },
        'xs:restriction': {
          'xs:sequence': { 'xs:element': [{ name: 'SCFromRes' }] },
        },
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::SCFromExt`)).toBe(true);
    expect(elements.has(`${TNS}::SCFromRes`)).toBe(true);
  });

  it('depth guard includes items at depth 10 but prunes deeper', () => {
    // Build nested sequences; place elements at depth 10 and 11
    const makeDeep = (d) => (d === 0 ? {} : { 'xs:sequence': makeDeep(d - 1) });
    const deep = makeDeep(12);

    // Insert at depth 10 and 11
    let cursor = deep;
    for (let i = 0; i < 10; i++) cursor = cursor['xs:sequence'];
    cursor['xs:element'] = [{ name: 'At10' }];
    cursor = deep;
    for (let i = 0; i < 11; i++) cursor = cursor['xs:sequence'];
    cursor['xs:element'] = [{ name: 'At11' }];

    collectElements(deep, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::At10`)).toBe(true); // allowed
    expect(elements.has(`${TNS}::At11`)).toBe(false); // pruned
  });

  it('uses arr() to normalize singletons and arrays', () => {
    const node = {
      'xs:element': { name: 'Solo' }, // singleton
      'xsd:sequence': { 'xs:element': { name: 'NestedSolo' } }, // singleton nested
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(arr).toHaveBeenCalled(); // sanity: we used arr
    expect(elements.has(`${TNS}::Solo`)).toBe(true);
    expect(elements.has(`${TNS}::NestedSolo`)).toBe(true);
  });

  it('handles complexContent with only extension (no restriction)', () => {
    const node = {
      'xs:complexContent': {
        'xs:extension': {
          'xs:sequence': { 'xs:element': [{ name: 'OnlyExtension' }] },
        },
        // No restriction here - this covers the "false" branch of if (res)
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::OnlyExtension`)).toBe(true);
  });

  it('handles complexContent with only restriction (no extension)', () => {
    const node = {
      'xs:complexContent': {
        'xsd:restriction': {
          'xsd:choice': { 'xsd:element': [{ name: 'OnlyRestriction' }] },
        },
        // No extension here - this covers the "false" branch of if (ext)
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::OnlyRestriction`)).toBe(true);
  });

  it('handles simpleContent with only extension (no restriction)', () => {
    const node = {
      'xsd:simpleContent': {
        'xsd:extension': {
          'xs:all': { 'xsd:element': [{ name: 'SCOnlyExt' }] },
        },
        // No restriction here - this covers the "false" branch of if (res) in simpleContent
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::SCOnlyExt`)).toBe(true);
  });

  it('handles simpleContent with only restriction (no extension)', () => {
    const node = {
      'xsd:simpleContent': {
        'xs:restriction': {
          'xs:sequence': { 'xs:element': [{ name: 'SCOnlyRes' }] },
        },
        // No extension here - this covers the "false" branch of if (ext) in simpleContent
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.has(`${TNS}::SCOnlyRes`)).toBe(true);
  });

  it('handles complexContent with neither extension nor restriction', () => {
    const node = {
      'xs:complexContent': {
        // Neither extension nor restriction - covers both false branches
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.size).toBe(0); // No elements should be added
  });

  it('handles simpleContent with neither extension nor restriction', () => {
    const node = {
      'xsd:simpleContent': {
        // Neither extension nor restriction - covers both false branches
      },
    };
    collectElements(node, TNS, PFX, elements, elementRefs);

    expect(elements.size).toBe(0); // No elements should be added
  });
});
