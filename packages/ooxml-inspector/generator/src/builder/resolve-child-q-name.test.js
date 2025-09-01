import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveChildQName } from './resolve-child-q-name.js';

vi.mock('./index.js', () => {
  return {
    qn: vi.fn((pfx, local) => `${pfx}:${local}`),
    autoPrefix: vi.fn(() => 'auto'),
  };
});

import { qn, autoPrefix } from './index.js';

const TNS_A = 'urn:a';
const TNS_B = 'urn:b';
const TNS_C = 'urn:c';

let nsMap;

beforeEach(() => {
  vi.clearAllMocks();
  nsMap = {
    [TNS_A]: 'a',
    [TNS_B]: 'b',
    // note: TNS_C intentionally not present in default map
  };
});

describe('resolveChildQName', () => {
  it('returns null when neither ref nor name is provided', () => {
    expect(resolveChildQName({}, TNS_A, nsMap)).toBeNull();
  });

  describe('when e.ref is present', () => {
    it('resolves prefixed ref using nsMap -> qn(prefix, local)', () => {
      const e = { ref: 'b:Child' }; // prefix "b" -> TNS_B
      const out = resolveChildQName(e, TNS_A, nsMap);
      expect(out).toBe('b:Child');
      expect(qn).toHaveBeenCalledWith('b', 'Child');
      expect(autoPrefix).not.toHaveBeenCalled();
    });

    it('returns null for unknown prefix', () => {
      const e = { ref: 'z:Foo' }; // no matching prefix in nsMap
      const out = resolveChildQName(e, TNS_A, nsMap);
      expect(out).toBeNull();
      expect(qn).not.toHaveBeenCalled();
      expect(autoPrefix).not.toHaveBeenCalled();
    });

    it('uses context namespace when ref has no prefix', () => {
      const e = { ref: 'LocalName' };
      const out = resolveChildQName(e, TNS_A, nsMap);
      expect(out).toBe('a:LocalName'); // nsMap[TNS_A] === 'a'
      expect(qn).toHaveBeenCalledWith('a', 'LocalName');
      expect(autoPrefix).not.toHaveBeenCalled();
    });

    it('falls back to "unknown" prefix when contextTns is unmapped', () => {
      const e = { ref: 'Thing' };
      const out = resolveChildQName(e, TNS_C, nsMap); // TNS_C not in nsMap
      expect(out).toBe('unknown:Thing');
      expect(qn).toHaveBeenCalledWith('unknown', 'Thing');
      expect(autoPrefix).not.toHaveBeenCalled();
    });
  });

  describe('when e.name is present (inline element)', () => {
    it('uses contextTns mapping when _contextTns is not provided', () => {
      const e = { name: 'Inline' };
      const out = resolveChildQName(e, TNS_A, nsMap);
      expect(out).toBe('a:Inline');
      expect(qn).toHaveBeenCalledWith('a', 'Inline');
      expect(autoPrefix).not.toHaveBeenCalled();
    });

    it('uses element _contextTns mapping when present', () => {
      const e = { name: 'Inline', _contextTns: TNS_B };
      const out = resolveChildQName(e, TNS_A, nsMap);
      expect(out).toBe('b:Inline');
      expect(qn).toHaveBeenCalledWith('b', 'Inline');
      expect(autoPrefix).not.toHaveBeenCalled();
    });

    it('calls autoPrefix when _contextTns is unmapped and uses its returned prefix', () => {
      // make autoPrefix return a deterministic value
      autoPrefix.mockReturnValueOnce('gen');

      const e = { name: 'Inline', _contextTns: TNS_C }; // TNS_C not in nsMap
      const out = resolveChildQName(e, TNS_A, nsMap);

      expect(autoPrefix).toHaveBeenCalledTimes(1);
      expect(autoPrefix).toHaveBeenCalledWith(TNS_C, nsMap);
      expect(out).toBe('gen:Inline');
      expect(qn).toHaveBeenCalledWith('gen', 'Inline');
    });
  });
});
