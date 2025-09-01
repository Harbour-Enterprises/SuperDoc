import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expandContent } from './expand-content.js';

vi.mock('./index.js', () => {
  return {
    arr: vi.fn((x) => (Array.isArray(x) ? x : x ? [x] : [])),
    autoPrefix: vi.fn(() => 'gen'),
  };
});

import { arr, autoPrefix } from './index.js';

const TNS_A = 'urn:a';
const TNS_B = 'urn:b';

let nsMap;
let elementsMap;
let groups;

beforeEach(() => {
  vi.clearAllMocks();
  nsMap = {
    [TNS_A]: 'a',
    [TNS_B]: 'b',
  };
  elementsMap = new Map();
  groups = new Map();
});

describe('expandContent', () => {
  it('no-ops on falsy node and respects depth guard', () => {
    const outEls = [];
    expandContent(null, outEls, TNS_A, 0, elementsMap, nsMap, groups);
    expect(outEls).toEqual([]);

    expandContent({}, outEls, TNS_A, 11, elementsMap, nsMap, groups); // depth > 10
    expect(outEls).toEqual([]);
  });

  it('collects direct elements (xs:element & xsd:element) and stamps _contextTns', () => {
    const outEls = [];
    const node = {
      'xs:element': [{ name: 'Alpha' }],
      'xsd:element': [{ ref: 'b:Beta' }],
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    // outEls should contain both, with _contextTns
    expect(outEls).toHaveLength(2);
    expect(outEls[0]).toMatchObject({ name: 'Alpha', _contextTns: TNS_A });
    expect(outEls[1]).toMatchObject({ ref: 'b:Beta', _contextTns: TNS_A });

    // elementsMap should have a record for named element Alpha in context A
    const alphaKey = `${TNS_A}::Alpha`;
    expect(elementsMap.get(alphaKey)).toMatchObject({
      tns: TNS_A,
      prefix: 'a',
      name: 'Alpha',
    });

    // and for referenced element Beta (resolved to TNS_B, local 'Beta')
    const betaKey = `${TNS_B}::Beta`;
    expect(elementsMap.get(betaKey)).toMatchObject({
      tns: TNS_B,
      prefix: 'b',
      name: 'Beta',
    });

    // autoPrefix not needed here (both namespaces mapped)
    expect(autoPrefix).not.toHaveBeenCalled();
  });

  it('uses autoPrefix for named element when contextTns is unmapped', () => {
    const outEls = [];
    autoPrefix.mockReturnValueOnce('ap'); // deterministic
    const node = { 'xs:element': [{ name: 'Gamma' }] };

    expandContent(node, outEls, 'urn:unmapped', 0, elementsMap, nsMap, groups);

    // one element collected
    expect(outEls).toHaveLength(1);
    expect(outEls[0]).toMatchObject({ name: 'Gamma', _contextTns: 'urn:unmapped' });

    // elementsMap entry uses autoPrefix result
    const key = `urn:unmapped::Gamma`;
    expect(elementsMap.get(key)).toMatchObject({
      tns: 'urn:unmapped',
      prefix: 'ap',
      name: 'Gamma',
    });

    expect(autoPrefix).toHaveBeenCalledWith('urn:unmapped', nsMap);
  });

  it('uses autoPrefix for referenced element when ref TNS is unmapped', () => {
    const outEls = [];
    // Arrange: nsMap doesn’t have a prefix for this ref’s TNS
    const UNMAPPED = 'urn:zzz';
    nsMap[UNMAPPED] = undefined; // ensure missing
    autoPrefix.mockReturnValueOnce('zp');

    // e.ref without prefix -> uses contextTns (UNMAPPED) in this case
    const node = { 'xs:element': [{ ref: 'Zed' }] };

    expandContent(node, outEls, UNMAPPED, 0, elementsMap, nsMap, groups);

    const key = `${UNMAPPED}::Zed`;
    expect(elementsMap.get(key)).toMatchObject({
      tns: UNMAPPED,
      prefix: 'zp',
      name: 'Zed',
      el: expect.objectContaining({ name: 'Zed' }),
    });
    expect(autoPrefix).toHaveBeenCalledWith(UNMAPPED, nsMap);
  });

  it('recurses into nested content models (sequence/choice/all, xs/xsd)', () => {
    const outEls = [];
    const node = {
      'xs:sequence': {
        'xsd:element': [{ name: 'SeqEl' }],
        'xs:choice': {
          'xs:element': [{ name: 'ChoiceEl' }],
        },
        'xsd:all': {
          'xsd:element': [{ name: 'AllEl' }],
        },
      },
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    const names = outEls.map((e) => e.name || e.ref);
    expect(names).toEqual(expect.arrayContaining(['SeqEl', 'ChoiceEl', 'AllEl']));

    // all should be recorded into elementsMap too
    expect(elementsMap.has(`${TNS_A}::SeqEl`)).toBe(true);
    expect(elementsMap.has(`${TNS_A}::ChoiceEl`)).toBe(true);
    expect(elementsMap.has(`${TNS_A}::AllEl`)).toBe(true);
  });

  it('handles inline group definitions (xs:group with name + inner sequence/choice/all)', () => {
    const outEls = [];
    const node = {
      'xs:group': [
        {
          name: 'InlineGroup',
          'xs:choice': { 'xs:element': [{ name: 'InlineEl' }] },
        },
      ],
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    const names = outEls.map((e) => e.name || e.ref);
    expect(names).toContain('InlineEl');
    expect(elementsMap.has(`${TNS_A}::InlineEl`)).toBe(true);
  });

  it('expands group references by local name using current context TNS', () => {
    const outEls = [];
    // groups map stores definitions keyed by `${tns}::${name}`
    groups.set(`${TNS_A}::MyGroup`, {
      'xs:sequence': { 'xs:element': [{ name: 'GEl' }] },
    });

    const node = {
      'xs:group': [{ ref: 'MyGroup' }],
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    const names = outEls.map((e) => e.name || e.ref);
    expect(names).toContain('GEl');
    expect(elementsMap.has(`${TNS_A}::GEl`)).toBe(true);
  });

  it('expands group references with prefix using nsMap to resolve TNS', () => {
    const outEls = [];
    groups.set(`${TNS_B}::OtherGroup`, {
      'xsd:all': { 'xsd:element': [{ name: 'OtherEl' }] },
    });

    const node = {
      'xsd:group': [{ ref: 'b:OtherGroup' }],
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    const names = outEls.map((e) => e.name || e.ref);
    expect(names).toContain('OtherEl');
    expect(elementsMap.has(`${TNS_B}::OtherEl`)).toBe(true);
  });

  it('does nothing for unknown group prefix or missing group definition', () => {
    const outEls = [];
    const node = {
      'xs:group': [{ ref: 'z:Nope' }, { ref: 'MissingGroup' }],
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);
    expect(outEls).toHaveLength(0);
    expect(elementsMap.size).toBe(0);
  });

  it('depth guard prevents collecting too-deep nested elements', () => {
    const makeDeep = (depth) =>
      depth === 0
        ? { 'xs:element': [{ name: 'TooDeep' }] } // will land deeper than the guard
        : { 'xs:sequence': makeDeep(depth - 1) };

    // Build 12 levels of nested sequences; the base element is beyond depth 10
    const deep = makeDeep(12);

    // Insert an element exactly at depth 10 so it should be included
    let cursor = deep;
    for (let i = 0; i < 10; i++) cursor = cursor['xs:sequence'];
    cursor['xs:element'] = [{ name: 'AtDepth10' }];

    const outEls = [];
    expandContent(deep, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    const names = outEls.map((e) => e.name || e.ref);
    expect(names).toContain('AtDepth10'); // depth 10 is allowed
    expect(names).not.toContain('TooDeep'); // pruned at depth > 10
  });

  it('handles element ref with unknown prefix (refTns becomes undefined)', () => {
    const outEls = [];
    const node = {
      'xs:element': [{ ref: 'unknown:Element' }], // prefix not in nsMap
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    // Element should still be added to outEls but not to elementsMap
    expect(outEls).toHaveLength(1);
    expect(outEls[0]).toMatchObject({ ref: 'unknown:Element', _contextTns: TNS_A });

    // No entry should be added to elementsMap because refTns is undefined
    expect(elementsMap.size).toBe(0);
  });

  it('handles group definition with no content models', () => {
    const outEls = [];

    // Group exists but has no sequence/choice/all content
    groups.set(`${TNS_A}::EmptyGroup`, {
      // No xs:sequence, xs:choice, xs:all, etc.
      someOtherProperty: 'value',
    });

    const node = {
      'xs:group': [{ ref: 'EmptyGroup' }],
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    // Should find the group but do nothing since it has no content
    expect(outEls).toHaveLength(0);
    expect(elementsMap.size).toBe(0);
  });

  it('handles inline group definition with no content models', () => {
    const outEls = [];
    const node = {
      'xs:group': [
        {
          name: 'InlineEmptyGroup',
          // No xs:sequence, xs:choice, xs:all content
          someAttribute: 'value',
        },
      ],
    };

    expandContent(node, outEls, TNS_A, 0, elementsMap, nsMap, groups);

    // Should process the inline group but do nothing since it has no content
    expect(outEls).toHaveLength(0);
    expect(elementsMap.size).toBe(0);
  });
});
