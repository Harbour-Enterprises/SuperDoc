import { describe, it, expect } from 'vitest';
import { isList } from './is-list.js';

describe('isList', () => {
  it('returns true for paragraph nodes with numbering & list metadata', () => {
    const node = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { numId: 1, ilvl: 0 },
        listRendering: { numberingType: 'bullet' },
      },
    };

    expect(isList(node)).toBeTruthy();
  });

  it('returns false when numbering metadata is missing', () => {
    const node = {
      type: { name: 'paragraph' },
      attrs: {
        listRendering: { numberingType: 'decimal' },
      },
    };

    expect(isList(node)).toBeFalsy();
  });

  it('returns false when list rendering metadata is missing', () => {
    const node = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { numId: 2 },
      },
    };

    expect(isList(node)).toBeFalsy();
  });

  it('returns false for non-paragraph nodes even with list attributes', () => {
    const node = {
      type: { name: 'orderedList' },
      attrs: {
        numberingProperties: { numId: 5 },
        listRendering: { numberingType: 'decimal' },
      },
    };

    expect(isList(node)).toBeFalsy();
  });

  it('returns false when attrs are missing entirely', () => {
    const node = {
      type: { name: 'paragraph' },
    };

    expect(isList(node)).toBeFalsy();
  });

  it('returns false for null/undefined', () => {
    expect(isList(null)).toBeFalsy();
    expect(isList(undefined)).toBeFalsy();
  });
});
