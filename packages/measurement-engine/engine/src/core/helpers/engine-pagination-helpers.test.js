// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../field-annotations-measurements/index.js', () => ({
  computeHtmlFieldSegments: vi.fn(() => []),
}));

import { computeHtmlFieldSegments } from '../field-annotations-measurements/index.js';
import { ENGINE_PAGINATION_INTERNALS } from './engine-pagination-helpers.js';
import { generatePageBreaks } from '../../page-breaks/index.js';
import * as BreakHelpers from '../../page-breaks/helpers/index.js';

const {
  computeNextVisualTop,
  getExactBreakPosition,
  findTableRowOverflow,
  recordBreak,
  finalizePages,
  createPageEntry,
  normalizeLayout,
  createHeaderFooterAreas,
  formatHeaderFooterArea,
  snapshotMeasurementDocument,
  createFallbackRect,
  resolvePageWidthPx,
  resolveContentWidthPx,
  getSafeNumber,
  resolvePageLayoutForIndex,
  checkForHardBreak,
} = ENGINE_PAGINATION_INTERNALS;

describe('engine pagination helpers', () => {
  afterEach(() => {
    vi.clearAllMocks();
    computeHtmlFieldSegments.mockReset();
    vi.restoreAllMocks();
  });

  it('computes next visual offset', () => {
    expect(computeNextVisualTop(100, 600, 20)).toBe(720);
    expect(computeNextVisualTop(undefined, 500, 0)).toBe(500);
  });

  it('selects first finite value with getSafeNumber', () => {
    expect(getSafeNumber(undefined, NaN, 42, 7)).toBe(42);
    expect(getSafeNumber()).toBe(0);
  });

  it('creates fallback rect from element offsets', () => {
    const rect = createFallbackRect({ offsetTop: 5, offsetLeft: 10, offsetWidth: 20, offsetHeight: 30 });
    expect(rect).toEqual({ top: 5, bottom: 35, left: 10, right: 30, width: 20, height: 30 });
  });

  it('snapshots measurement document when available', () => {
    const doc = { toJSON: () => ({ foo: 'bar' }) };
    expect(snapshotMeasurementDocument({ state: { doc } })).toEqual({ foo: 'bar' });
    expect(snapshotMeasurementDocument({})).toEqual({});
  });

  it('resolves page width and content width', () => {
    expect(resolvePageWidthPx({ explicitWidthPx: 720, containerRect: {}, dom: {} })).toBe(720);
    expect(
      resolvePageWidthPx({
        explicitWidthPx: null,
        containerRect: { width: 640 },
        dom: { offsetWidth: 0, scrollWidth: 0, clientWidth: 0 },
      }),
    ).toBe(640);

    expect(
      resolveContentWidthPx({
        pageWidthPx: 600,
        baseMarginsPx: { left: 50, right: 50 },
        containerRect: { width: 0 },
      }),
    ).toBe(500);
  });

  it('normalizes layout values', () => {
    const layout = normalizeLayout({
      layout: { margins: { top: 20, bottom: 30 }, usableHeightPx: 400 },
      baseMarginsPx: { top: 10, bottom: 10 },
      pageHeightPx: 500,
    });
    expect(layout).toEqual({
      sections: null,
      margins: { top: 20, bottom: 30 },
      usableHeightPx: 400,
      pageHeightPx: 500,
      pageGapPx: null,
    });
  });

  it('creates header/footer area descriptors', () => {
    const areas = createHeaderFooterAreas({
      sections: {
        header: { metrics: { distancePx: 10, contentHeightPx: 40, effectiveHeightPx: 52 }, id: 'h1' },
        footer: { metrics: { distancePx: 15, contentHeightPx: 30, effectiveHeightPx: 50 }, id: 'f1' },
      },
      marginTopPx: 12,
      marginBottomPx: 14,
      marginLeftPx: 20,
      marginRightPx: 24,
    });
    expect(areas.header).toMatchObject({
      reservedHeightPx: 52,
      sectionId: 'h1',
      slotTopPx: 10,
      slotHeightPx: 40,
      slotLeftPx: 20,
      slotRightPx: 24,
    });
    expect(areas.footer).toMatchObject({
      reservedHeightPx: 50,
      sectionId: 'f1',
      slotRightPx: 24,
      slotLeftPx: 20,
    });
    expect(formatHeaderFooterArea(null, 20, 'footer')).toEqual({
      heightPx: 20,
      reservedHeightPx: 20,
      metrics: { offsetPx: 20, contentHeightPx: 0, effectiveHeightPx: 20 },
      slotTopPx: 0,
      slotHeightPx: 0,
      slotMaxHeightPx: 0,
      slotLeftPx: 0,
      slotRightPx: 0,
      role: 'footer',
    });
  });

  it('resolves page layout for index', () => {
    const layout = resolvePageLayoutForIndex({
      pageIndex: 0,
      options: { isLastPage: false },
      resolveHeaderFooter: () => ({
        header: { metrics: { effectiveHeightPx: 80 } },
        footer: { metrics: { effectiveHeightPx: 60 } },
      }),
      baseMarginsPx: { top: 40, bottom: 40 },
      pageHeightPx: 500,
    });
    expect(layout.margins.top).toBe(80);
    expect(layout.margins.bottom).toBe(60);
    expect(layout.usableHeightPx).toBe(500 - 80 - 60);
  });

  it('detects hard break spans', () => {
    const element = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('linebreaktype', 'page');
    Object.defineProperty(span, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 150, bottom: 180 }),
    });
    element.appendChild(span);

    const view = {
      state: { doc: {} },
      posAtDOM: vi.fn(() => 12),
    };

    vi.spyOn(BreakHelpers, 'extendBreakPositionWithSectionMarkers').mockImplementation((_doc, pos) => pos);

    const breakInfo = checkForHardBreak(view, element, { top: 100, bottom: 500 }, 0, Number.POSITIVE_INFINITY);

    expect(breakInfo).toEqual({ top: 50, bottom: 80, pos: 12 });
  });

  it('falls back when locating exact break position fails', () => {
    const block = document.createElement('div');
    Object.defineProperty(block, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 200, bottom: 260 }),
    });

    const pagination = { pageStart: 100, lastBreakPos: null };

    const view = {
      posAtDOM: vi.fn(() => {
        throw new Error('no dom position');
      }),
      posAtCoords: vi.fn(() => ({ pos: 20 })),
      state: { doc: { nodeAt: vi.fn(() => null) } },
    };

    vi.spyOn(BreakHelpers, 'safeCoordsAtPos').mockReturnValue({ top: 210, bottom: 240 });
    vi.spyOn(BreakHelpers, 'findBreakPosInBlock').mockReturnValue(null);
    vi.spyOn(BreakHelpers, 'findBreakPosInTable').mockReturnValue(null);
    vi.spyOn(BreakHelpers, 'findBreakPosInTableRow').mockReturnValue(null);

    const result = getExactBreakPosition({
      view,
      block,
      containerRect: { top: 0 },
      pageLimit: 220,
      pagination,
    });

    expect(result).toEqual({ fittedTop: 210, fittedBottom: 220, pos: 20, breakY: 210 });
  });

  it('ignores table row overflow when boundary missing', () => {
    expect(findTableRowOverflow(null, { boundary: NaN })).toBeNull();
  });

  it('records breaks and creates subsequent pages', () => {
    const pagination = {
      pages: [],
      pageStart: 0,
      pageIndex: 0,
      blockIndex: 0,
      baseMarginsPx: { top: 10, bottom: 10, left: 10, right: 10 },
      pageHeightPx: 400,
      pageWidthPx: 320,
      pageGapPx: 16,
      contentWidthPx: 300,
      pageLayout: { margins: { top: 10, bottom: 10 }, usableHeightPx: 380 },
      visualStackTop: 0,
      docEndPos: 100,
      currentFittedBottomPx: null,
      lastBreakPos: null,
    };

    const firstPage = createPageEntry({
      pagination,
      pageIndex: 0,
      layout: pagination.pageLayout,
      pageStartPx: 0,
      breakPos: -1,
      breakTop: null,
      breakBottom: null,
      breakFittedTop: null,
      visualTopPx: 0,
    });
    pagination.pages.push(firstPage);
    expect(firstPage.contentArea).toEqual({ startPx: 0, endPx: 380, usableHeightPx: 380 });

    const resolveLayout = vi.fn(() => ({
      margins: { top: 10, bottom: 10 },
      usableHeightPx: 380,
      pageHeightPx: 420,
      pageGapPx: 24,
    }));

    recordBreak({
      pagination,
      breakTop: 300,
      breakBottom: 300,
      breakPos: 42,
      resolveLayout,
      lastFitTop: 280,
    });

    expect(pagination.pageIndex).toBe(1);
    expect(pagination.pages).toHaveLength(2);
    expect(pagination.pages[0].break).toMatchObject({ pos: 42, top: 280, bottom: 300 });
    expect(pagination.pageHeightPx).toBe(420);
    expect(pagination.pageGapPx).toBe(24);
    expect(pagination.pages[1].metrics.pageHeightPx).toBe(420);
    expect(pagination.pages[1].pageGapPx).toBe(24);
  });

  it('finalizes pages with refreshed layout', () => {
    const pagination = {
      pages: [],
      pageStart: 0,
      pageIndex: 0,
      blockIndex: 0,
      baseMarginsPx: { top: 10, bottom: 10, left: 10, right: 10 },
      pageHeightPx: 400,
      pageWidthPx: 320,
      pageGapPx: 16,
      contentWidthPx: 300,
      pageLayout: { margins: { top: 10, bottom: 10 }, usableHeightPx: 380 },
      visualStackTop: 0,
      docEndPos: 100,
      currentFittedBottomPx: null,
      lastBreakPos: null,
    };

    pagination.pages.push(
      createPageEntry({
        pagination,
        pageIndex: 0,
        layout: pagination.pageLayout,
        pageStartPx: 0,
        breakPos: 80,
        breakTop: 250,
        breakBottom: 300,
        breakFittedTop: 250,
        visualTopPx: 0,
      }),
    );

    const result = finalizePages({
      pagination,
      resolveLayout: vi.fn(() => ({
        margins: { top: 15, bottom: 15 },
        usableHeightPx: 360,
      })),
    });

    expect(result).toHaveLength(1);
    expect(result[0].metrics.marginTopPx).toBe(15);
    expect(result[0].contentArea).toEqual({ startPx: 0, endPx: 360, usableHeightPx: 360 });
  });

  it('respects per-page height overrides when calculating spacing', () => {
    const pagination = {
      pages: [],
      pageStart: 0,
      pageIndex: 0,
      blockIndex: 0,
      baseMarginsPx: { top: 110, bottom: 90, left: 10, right: 10 },
      pageHeightPx: 720,
      pageWidthPx: 480,
      pageGapPx: 16,
      contentWidthPx: 360,
      pageLayout: {
        margins: { top: 110, bottom: 90 },
        pageHeightPx: 900,
        pageGapPx: 32,
      },
      visualStackTop: 0,
      docEndPos: 1000,
      currentFittedBottomPx: null,
      lastBreakPos: null,
    };

    const firstPage = createPageEntry({
      pagination,
      pageIndex: 0,
      layout: pagination.pageLayout,
      pageStartPx: 0,
      breakPos: 120,
      breakTop: 650,
      breakBottom: 650,
      breakFittedTop: 650,
      visualTopPx: 0,
    });

    expect(firstPage.metrics.pageHeightPx).toBe(900);
    expect(firstPage.pageGapPx).toBe(32);
    expect(firstPage.pageBottomSpacingPx).toBe(50);
  });

  it('returns baseline package when measurement view is unavailable', () => {
    const measurementEditor = {
      state: {
        doc: {
          toJSON: () => ({ doc: true }),
        },
      },
      view: null,
    };

    const result = generatePageBreaks(measurementEditor);

    expect(result.document).toEqual({ doc: true });
    expect(result.units).toEqual({ unit: 'px', dpi: 96 });
    expect(result.pages).toEqual([]);
  });

  it('includes field segments produced by helpers', () => {
    computeHtmlFieldSegments.mockReturnValue([{ id: 'field-1' }]);

    const dom = document.createElement('div');
    Object.defineProperty(dom, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 0,
        bottom: 600,
        left: 0,
        right: 816,
        width: 816,
        height: 600,
      }),
    });

    const measurementEditor = {
      state: {
        doc: {
          toJSON: () => ({ doc: true }),
        },
      },
      view: {
        dom,
        state: {
          doc: {
            content: { size: 0 },
          },
        },
      },
    };

    const result = generatePageBreaks(measurementEditor, {
      pageHeightPx: 600,
      pageWidthPx: 816,
      marginsPx: { top: 96, bottom: 96, left: 96, right: 96 },
    });

    expect(result.pages).toHaveLength(1);
    expect(result.fieldSegments).toEqual([{ id: 'field-1' }]);
    expect(computeHtmlFieldSegments).toHaveBeenCalledWith(
      expect.objectContaining({
        view: measurementEditor.view,
        pages: result.pages,
      }),
    );
  });
});
