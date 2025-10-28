import { describe, it, expect } from 'vitest';
import {
  getPageCountFromBreaks,
  resolveSectionIdForPage,
  resolveSectionIdFromSummary,
  resolveLayoutBandForPage,
  resolveLayoutBands,
  computeInterPageGap,
  getSectionHeightFromStorage,
  headerSpacingFallbackPx,
  footerSpacingFallbackPx,
  getBandHeightFromSummary,
  getHeaderHeightForPage,
  getFooterHeightForPage,
  getLeadingHeaderSpacingPx,
  getTrailingFooterSpacingPx,
  resolvePageBandHeights,
} from './page-bands.js';

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

  it('resolves layout bands with fallbacks', () => {
    const page = {
      metrics: {
        marginTopPx: 12,
        marginBottomPx: 14,
        pageHeightPx: 720,
        pageGapPx: 32,
      },
      pageTopOffsetPx: 96,
      pageGapPx: 20,
      headerFooterAreas: {
        header: {
          heightPx: 24,
          metrics: { effectiveHeightPx: 30, offsetPx: 6 },
        },
        footer: {
          heightPx: 16,
          metrics: { effectiveHeightPx: 18, offsetPx: 8 },
        },
      },
    };

    const band = resolveLayoutBandForPage(page, 'header');
    expect(band).toEqual({
      heightPx: 30,
      marginPx: 12,
      offsetPx: 6,
      contentHeightPx: 0,
      rawHeightPx: 24,
      effectiveHeightPx: 30,
    });

    const bands = resolveLayoutBands([page]);
    expect(bands[0].header.heightPx).toBe(30);
    expect(bands[0].footer.heightPx).toBe(18);
    expect(bands[0].pageHeightPx).toBe(720);
    expect(bands[0].pageTopOffsetPx).toBe(96);
    expect(bands[0].pageGapPx).toBe(20);
    expect(resolveLayoutBandForPage(null, 'header')).toEqual({
      heightPx: 0,
      marginPx: 0,
      offsetPx: 0,
      contentHeightPx: 0,
      rawHeightPx: 0,
      effectiveHeightPx: 0,
    });
  });

  it('computes inter-page gaps using offsets and fallback metrics', () => {
    const current = { pageTopOffsetPx: 100, pageHeightPx: 700, pageGapPx: 18 };
    const next = { pageTopOffsetPx: 860 };
    expect(computeInterPageGap(current, next)).toBe(60);
    expect(computeInterPageGap({ pageGapPx: 12 }, {})).toBe(12);
    expect(computeInterPageGap(null, next)).toBe(0);
  });

  it('extracts section heights from storage structures', () => {
    const storage = {
      sectionData: {
        headers: {
          a: { reservedHeight: 40 },
          b: { height: 32 },
          c: { measuredHeight: 28 },
          d: { baselineHeight: 10, offsetHeight: 5 },
          e: { baselineHeight: 12 },
        },
      },
    };
    expect(getSectionHeightFromStorage(storage, 'headers', 'a')).toBe(40);
    expect(getSectionHeightFromStorage(storage, 'headers', 'b')).toBe(32);
    expect(getSectionHeightFromStorage(storage, 'headers', 'c')).toBe(28);
    expect(getSectionHeightFromStorage(storage, 'headers', 'd')).toBe(15);
    expect(getSectionHeightFromStorage(storage, 'headers', 'e')).toBe(12);
    expect(getSectionHeightFromStorage(storage, 'headers', 'missing')).toBe(0);
  });

  it('provides spacing fallbacks using converter margins', () => {
    const editor = {
      converter: {
        pageStyles: { pageMargins: { top: 1.5, bottom: 2 } },
      },
    };
    expect(headerSpacingFallbackPx(editor)).toBe(144);
    expect(footerSpacingFallbackPx(editor)).toBe(192);
    expect(headerSpacingFallbackPx({})).toBe(0);
    expect(footerSpacingFallbackPx({})).toBe(0);
  });

  it('derives band heights from summary metrics', () => {
    const summary = {
      sectionMetricsById: new Map([
        [
          'header-1',
          {
            effectiveHeightPx: 44,
          },
        ],
        [
          'header-2',
          {
            contentHeightPx: 20,
            distancePx: 10,
          },
        ],
      ]),
      variantLookup: {
        header: {
          first: 'header-1',
          default: 'header-2',
        },
      },
    };

    const first = getBandHeightFromSummary(summary, 'header', 0, false);
    const later = getBandHeightFromSummary(summary, 'header', 2, false);
    expect(first).toBe(44);
    expect(later).toBe(30);
    expect(getBandHeightFromSummary(null, 'header', 0, false)).toBe(0);
  });

  it('computes header and footer heights for pages', () => {
    const layoutPages = [
      {
        metrics: { marginTopPx: 12, marginBottomPx: 18 },
        headerFooterAreas: {
          header: { heightPx: 24, metrics: { effectiveHeightPx: 30 } },
          footer: { heightPx: 16, metrics: { effectiveHeightPx: 22 } },
        },
      },
    ];
    const storage = {
      pagination: {
        layoutPages,
        sectionData: {
          headers: { defaultHeader: { reservedHeight: 26 } },
          footers: { defaultFooter: { reservedHeight: 40 } },
        },
        headerFooterSummary: {
          variantLookup: {
            header: { default: 'summaryHeader' },
            footer: {},
          },
          sectionMetricsById: {
            summaryHeader: { effectiveHeightPx: 28 },
          },
        },
      },
    };

    const editor = { storage };
    expect(getHeaderHeightForPage(editor, 0, null, false)).toBe(30);
    expect(getFooterHeightForPage(editor, 0, null, false)).toBe(22);

    storage.pagination.layoutPages = null;
    editor.converter = {
      headerIds: { default: 'defaultHeader' },
      footerIds: { default: 'defaultFooter' },
      pageStyles: { pageMargins: { top: 0.2, bottom: 0.2 } },
    };

    const summary = storage.pagination.headerFooterSummary;
    expect(getHeaderHeightForPage(editor, 0, summary, false)).toBe(28);
    expect(getFooterHeightForPage(editor, 0, summary, false)).toBe(40);
  });

  it('uses leading and trailing spacing fallbacks', () => {
    const editor = {
      storage: {
        pagination: {
          layoutPages: null,
          sectionData: {
            headers: {
              first: { reservedHeight: 60 },
            },
            footers: {
              even: { reservedHeight: 70 },
            },
          },
          headerFooterSummary: {
            variantLookup: {
              header: { default: 'first' },
              footer: { last: 'even' },
            },
            sectionMetricsById: new Map([['first', { effectiveHeightPx: 55 }]]),
          },
        },
      },
      converter: {
        headerIds: { default: 'first' },
        footerIds: { default: 'even' },
        pageStyles: { pageMargins: { top: 0.25, bottom: 0.25 } },
      },
    };

    const headerSpacing = getLeadingHeaderSpacingPx(editor);
    expect(headerSpacing).toBe(60);

    const footerSpacing = getTrailingFooterSpacingPx(editor, [{ pageIndex: 0 }, { pageIndex: 1 }]);
    expect(footerSpacing).toBe(70);
  });

  it('resolves page band heights from layout pages or summary', () => {
    const editor = {
      storage: {
        pagination: {
          layoutPages: [
            {
              headerFooterAreas: {
                header: { heightPx: 24, metrics: { effectiveHeightPx: 28 } },
                footer: { heightPx: 16, metrics: { effectiveHeightPx: 20 } },
              },
            },
            {
              headerFooterAreas: {
                header: { heightPx: 12, metrics: { effectiveHeightPx: 14 } },
                footer: { heightPx: 10, metrics: { effectiveHeightPx: 12 } },
              },
            },
          ],
        },
      },
    };

    const layoutHeights = resolvePageBandHeights(editor, [{ pageIndex: 0 }, { pageIndex: 1 }]);
    expect(layoutHeights).toEqual({
      headerHeights: [28, 14, 0],
      footerHeights: [20, 12, 0],
    });

    editor.storage.pagination.layoutPages = null;
    editor.storage.pagination.headerFooterSummary = {
      variantLookup: {},
      sectionMetricsById: new Map(),
    };
    editor.storage.pagination.sectionData = {
      headers: { h: { reservedHeight: 32 } },
      footers: { f: { reservedHeight: 48 } },
    };
    editor.converter = {
      headerIds: { default: 'h' },
      footerIds: { default: 'f' },
      pageStyles: { pageMargins: { top: 0.2, bottom: 0.2 } },
    };

    const derivedHeights = resolvePageBandHeights(editor, [{ pageIndex: 0 }, { pageIndex: 1 }]);
    expect(derivedHeights.headerHeights).toEqual([32, 32, 32]);
    expect(derivedHeights.footerHeights).toEqual([48, 48, 48]);
  });
});
