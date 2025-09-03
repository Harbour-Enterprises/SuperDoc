import { describe, it, expect } from 'vitest';
import { getQuickFormatList } from './helpers.js';

describe('getQuickFormatList', () => {
  it('returns [] when editor is missing', () => {
    expect(getQuickFormatList(undefined)).toEqual([]);
    expect(getQuickFormatList(null)).toEqual([]);
    expect(getQuickFormatList({})).toEqual([]);
    expect(getQuickFormatList({ converter: {} })).toEqual([]);
    expect(getQuickFormatList({ converter: { linkedStyles: null } })).toEqual([]);
  });

  it('returns [] when linkedStyles is empty', () => {
    const editor = { converter: { linkedStyles: [] } };
    expect(getQuickFormatList(editor)).toEqual([]);
  });

  it('filters to paragraph styles with definition.attrs present', () => {
    const editor = {
      converter: {
        linkedStyles: [
          // kept: paragraph + attrs
          { type: 'paragraph', definition: { attrs: { name: 'Para A', foo: 1 } } },
          // dropped: not paragraph
          { type: 'heading', definition: { attrs: { name: 'Heading 1' } } },
          // dropped: paragraph without attrs
          { type: 'paragraph', definition: {} },
          // dropped: paragraph with no definition
          { type: 'paragraph' },
        ],
      },
    };

    const out = getQuickFormatList(editor);
    expect(out).toHaveLength(1);
    expect(out[0].definition.attrs.name).toBe('Para A');
  });

  it('sorts by attrs.name (undefined treated as empty string)', () => {
    const editor = {
      converter: {
        linkedStyles: [
          // name undefined -> treated as ''
          { type: 'paragraph', definition: { attrs: {} } },
          { type: 'paragraph', definition: { attrs: { name: 'Zebra' } } },
          { type: 'paragraph', definition: { attrs: { name: 'alpha' } } },
          { type: 'paragraph', definition: { attrs: { name: 'Beta' } } },
          // non-paragraph should be ignored regardless of name
          { type: 'heading', definition: { attrs: { name: 'AAA' } } },
        ],
      },
    };

    const out = getQuickFormatList(editor);
    const names = out.map((s) => s.definition.attrs.name ?? '');
    // Expect empty-string entry first, then ascending by localeCompare
    expect(names[0]).toBe(''); // the undefined-name entry
    // The rest should be sorted lexicographically per localeCompare
    expect(names.slice(1)).toEqual([...names.slice(1)].sort((a, b) => a.localeCompare(b)));
  });

  it('does not throw if some items lack definition entirely (they are filtered out)', () => {
    const editor = {
      converter: {
        linkedStyles: [
          { type: 'paragraph' },
          { type: 'paragraph', definition: null },
          { type: 'paragraph', definition: { attrs: { name: 'Keep me' } } },
        ],
      },
    };

    const out = getQuickFormatList(editor);
    expect(out).toHaveLength(1);
    expect(out[0].definition.attrs.name).toBe('Keep me');
  });

  it('does not mutate the original linkedStyles array', () => {
    const linkedStyles = [
      { type: 'paragraph', definition: { attrs: { name: 'B' } } },
      { type: 'paragraph', definition: { attrs: { name: 'A' } } },
    ];
    const editor = { converter: { linkedStyles } };

    const before = JSON.stringify(linkedStyles);
    const out = getQuickFormatList(editor);

    expect(out.map((s) => s.definition.attrs.name)).toEqual(['A', 'B']); // sorted
    expect(JSON.stringify(linkedStyles)).toBe(before); // original unchanged
  });
});
