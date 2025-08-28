import { describe, it, expect, beforeEach, vi } from 'vitest';

const H = vi.hoisted(() => ({
  getSchema: vi.fn(),
}));

// Mock the module that provides getSchema BEFORE importing the SUT
vi.mock('./index.js', () => ({
  getSchema: H.getSchema,
}));

import { getAttributes } from './get-attributes.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAttributes(qname)', () => {
  it('returns null when element entry is missing', () => {
    H.getSchema.mockReturnValueOnce({ elements: {} });

    const out = getAttributes('w:missing');
    expect(H.getSchema).toHaveBeenCalledTimes(1);
    expect(out).toBeNull();
  });

  it('returns {} when attributes are missing on the element', () => {
    H.getSchema.mockReturnValueOnce({
      elements: {
        'w:p': { children: [] }, // no attributes field
      },
    });

    const out = getAttributes('w:p');
    expect(H.getSchema).toHaveBeenCalledTimes(1);
    expect(out).toEqual({});
  });

  it('returns a sorted copy of the attributes by key (stable/predictable order)', () => {
    // Intentionally unsorted keys
    const attrs = {
      'w:zeta': { type: 'xs:string' },
      'w:alpha': { type: 'xs:string' },
      'w:mid': { type: 'xs:int' },
    };

    H.getSchema.mockReturnValueOnce({
      elements: {
        'w:p': { attributes: attrs },
      },
    });

    const out = getAttributes('w:p');
    expect(out).toEqual({
      'w:alpha': { type: 'xs:string' },
      'w:mid': { type: 'xs:int' },
      'w:zeta': { type: 'xs:string' },
    });

    // Returned object should not be the same reference as the source attrs
    expect(out).not.toBe(attrs);
  });

  it('preserves attribute values while only reordering keys', () => {
    const attrs = {
      'w:c': { type: 'xs:boolean', use: 'optional' },
      'w:a': { type: 'xs:string', default: 'x' },
      'w:b': { type: 'xs:int', fixed: 3 },
    };

    H.getSchema.mockReturnValueOnce({
      elements: {
        'w:rPr': { attributes: attrs },
      },
    });

    const out = getAttributes('w:rPr');
    // Same entries, sorted by key
    expect(Object.keys(out)).toEqual(['w:a', 'w:b', 'w:c']);
    expect(out['w:a']).toEqual({ type: 'xs:string', default: 'x' });
    expect(out['w:b']).toEqual({ type: 'xs:int', fixed: 3 });
    expect(out['w:c']).toEqual({ type: 'xs:boolean', use: 'optional' });
  });

  // it('does not blow up with empty schema or missing elements key', () => {
  //   H.getSchema
  //     .mockReturnValueOnce({})
  //     .mockReturnValueOnce({ elements: null })
  //     .mockReturnValueOnce({ elements: undefined });

  //   expect(getAttributes('w:x')).toBeNull();
  //   expect(getAttributes('w:x')).toBeNull();
  //   expect(getAttributes('w:x')).toBeNull();
  // });
});
