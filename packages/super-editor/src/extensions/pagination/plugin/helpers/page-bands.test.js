import { describe, it, expect } from 'vitest';
import { getPageCountFromBreaks, resolveSectionIdForPage, resolveSectionIdFromSummary } from './page-bands.js';

describe('page-bands helpers', () => {
  it('computes page counts from break arrays', () => {
    expect(getPageCountFromBreaks([])).toBe(1);
    expect(getPageCountFromBreaks([{ pageIndex: 0 }, { pageIndex: 1 }])).toBe(3);
    expect(getPageCountFromBreaks([{ pageIndex: 4 }, { pageIndex: 7 }])).toBe(9);
    expect(getPageCountFromBreaks([{ pageIndex: 1 }, {}])).toBe(3);
  });

  it('resolves section ids given converter settings', () => {
    const editor = {
      converter: {
        headerIds: { default: 'header-default', first: 'header-first', odd: 'header-odd', even: 'header-even' },
        footerIds: { default: 'footer-default' },
        pageStyles: { alternateHeaders: true },
      },
    };
    expect(resolveSectionIdForPage(editor, 1, 'headerIds')).toBe('header-first');
    expect(resolveSectionIdForPage(editor, 2, 'headerIds')).toBe('header-even');
    expect(resolveSectionIdForPage(editor, 3, 'headerIds')).toBe('header-odd');
    expect(resolveSectionIdForPage(editor, 1, 'footerIds')).toBe('footer-default');
    expect(resolveSectionIdForPage({}, 1, 'headerIds')).toBeNull();
  });

  it('resolves section ids from summary lookups', () => {
    const mapLookup = new Map([
      ['first', 'map-first'],
      ['even', 'map-even'],
      ['last', 'map-last'],
      ['default', 'map-default'],
    ]);
    const summary = {
      variantLookup: {
        header: mapLookup,
      },
    };
    expect(resolveSectionIdFromSummary(summary, 'header', 0, false)).toBe('map-first');
    expect(resolveSectionIdFromSummary(summary, 'header', 1, false)).toBe('map-even');
    expect(resolveSectionIdFromSummary(summary, 'header', 2, true)).toBe('map-last');

    const objectLookup = {
      header: {
        odd: 'odd-object',
        default: 'default-object',
      },
    };
    expect(resolveSectionIdFromSummary({ variantLookup: objectLookup }, 'header', 4, false)).toBe('odd-object');
    expect(resolveSectionIdFromSummary({ variantLookup: objectLookup }, 'header', 5, false)).toBe('default-object');
  });

  it('handles null or undefined inputs gracefully', () => {
    expect(getPageCountFromBreaks(null)).toBe(1);
    expect(getPageCountFromBreaks(undefined)).toBe(1);

    expect(resolveSectionIdForPage(null, 1, 'headerIds')).toBeNull();
    expect(resolveSectionIdForPage(undefined, 1, 'headerIds')).toBeNull();

    expect(resolveSectionIdFromSummary(null, 'header', 0, false)).toBeNull();
    expect(resolveSectionIdFromSummary(undefined, 'header', 0, false)).toBeNull();
  });

  it('handles breaks with missing pageIndex', () => {
    expect(getPageCountFromBreaks([{}, {}])).toBe(3);
    expect(getPageCountFromBreaks([{ pageIndex: null }, { pageIndex: undefined }])).toBe(3);
  });

  it('returns null when converter is missing required sections', () => {
    const editor = {
      converter: {},
    };
    expect(resolveSectionIdForPage(editor, 1, 'headerIds')).toBeNull();
    expect(resolveSectionIdForPage(editor, 1, 'footerIds')).toBeNull();
  });

  it('returns null when section variant does not exist', () => {
    const editor = {
      converter: {
        headerIds: { default: 'header-default' },
        pageStyles: {},
      },
    };
    expect(resolveSectionIdForPage(editor, 2, 'headerIds')).toBe('header-default'); // Falls back to default
  });

  it('returns default when first page has no alternateHeaders', () => {
    const editor = {
      converter: {
        headerIds: { default: 'header-default', first: 'header-first' },
        pageStyles: {},
      },
    };
    // Without alternateHeaders, returns default even for page 1
    expect(resolveSectionIdForPage(editor, 1, 'headerIds')).toBe('header-default');
  });

  it('handles empty variantLookup in summary', () => {
    const summary = {
      variantLookup: {
        header: new Map(),
      },
    };
    expect(resolveSectionIdFromSummary(summary, 'header', 0, false)).toBeNull();
  });

  it('uses last variant for footer on last page', () => {
    const mapLookup = new Map([
      ['default', 'map-default'],
      ['last', 'map-last'],
    ]);
    const summary = {
      variantLookup: {
        footer: mapLookup,
      },
    };
    expect(resolveSectionIdFromSummary(summary, 'footer', 5, true)).toBe('map-last');
    expect(resolveSectionIdFromSummary(summary, 'footer', 5, false)).not.toBe('map-last');
  });

  it('handles variantLookup as plain object', () => {
    const objectLookup = {
      header: {
        first: 'object-first',
        default: 'object-default',
      },
    };
    const result = resolveSectionIdFromSummary({ variantLookup: objectLookup }, 'header', 0, false);
    expect(result).toBe('object-first');
  });

  it('returns highest pageIndex + 1 when all pages have valid indices', () => {
    expect(getPageCountFromBreaks([{ pageIndex: 0 }, { pageIndex: 1 }, { pageIndex: 2 }])).toBe(4);
    expect(getPageCountFromBreaks([{ pageIndex: 5 }])).toBe(7);
  });
});
