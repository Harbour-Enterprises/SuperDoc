// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMeasurementHarness } from './test-harness.js';

let harness;

beforeAll(async () => {
  harness = await createMeasurementHarness('header-footer-expands.docx');
});

afterAll(() => {
  harness?.destroy();
});

describe('header-footer-expands measurement regression', () => {
  it('keeps the entire document on a single page with expanded bands', () => {
    const { layout, docContentSize } = harness;
    expect(layout).toBeTruthy();
    const pages = Array.isArray(layout?.pages) ? layout.pages : [];
    expect(pages).toHaveLength(1);

    const page = pages[0];
    expect(page.break?.pos).toBe(docContentSize);
    expect(page.break?.startOffsetPx).toBe(0);
    expect(page.break?.fittedBottom).toBe(page.break?.bottom);
    expect(page.break?.bottom).toBeGreaterThanOrEqual(32);

    expect(page.pageBottomSpacingPx).toBeGreaterThan(700);
    expect(page.pageGapPx).toBe(20);

    const headerMetrics = page.headerFooterAreas?.header?.metrics ?? null;
    const footerMetrics = page.headerFooterAreas?.footer?.metrics ?? null;
    expect(headerMetrics?.effectiveHeightPx).toBe(page.metrics?.marginTopPx);
    expect(footerMetrics?.effectiveHeightPx).toBe(page.metrics?.marginBottomPx);
    expect(headerMetrics?.offsetPx).toBe(96);
    expect(footerMetrics?.offsetPx).toBe(96);
    expect(headerMetrics?.contentHeightPx).toBe(0);
    expect(footerMetrics?.contentHeightPx).toBe(0);
  });

  it('allocates header and footer areas with zero content height', () => {
    const { layout } = harness;
    const page = layout.pages[0];
    const { header, footer } = page.headerFooterAreas;

    expect(header).toBeDefined();
    expect(footer).toBeDefined();

    expect(header.metrics.contentHeightPx).toBe(0);
    expect(footer.metrics.contentHeightPx).toBe(0);

    // Even with zero content, effective height should equal the distance/offset
    expect(header.metrics.effectiveHeightPx).toBeGreaterThan(0);
    expect(footer.metrics.effectiveHeightPx).toBeGreaterThan(0);
  });

  it('reserves space for headers and footers in page metrics', () => {
    const { layout } = harness;
    const page = layout.pages[0];

    expect(page.metrics.headerHeightPx).toBeDefined();
    expect(page.metrics.footerHeightPx).toBeDefined();
    expect(page.metrics.headerHeightPx).toBeGreaterThanOrEqual(0);
    expect(page.metrics.footerHeightPx).toBeGreaterThanOrEqual(0);
  });

  it('calculates reserved height for header and footer areas', () => {
    const { layout } = harness;
    const page = layout.pages[0];
    const { header, footer } = page.headerFooterAreas;

    expect(header.reservedHeightPx).toBeDefined();
    expect(footer.reservedHeightPx).toBeDefined();

    expect(header.reservedHeightPx).toBeGreaterThanOrEqual(header.metrics.effectiveHeightPx);
    expect(footer.reservedHeightPx).toBeGreaterThanOrEqual(footer.metrics.effectiveHeightPx);
  });

  it('maintains correct content area height after header/footer expansion', () => {
    const { layout } = harness;
    const page = layout.pages[0];

    const totalPageHeight = page.metrics.pageHeightPx;
    const contentHeight = page.metrics.contentHeightPx;
    const headerHeight = page.metrics.headerHeightPx;
    const footerHeight = page.metrics.footerHeightPx;
    const marginTop = page.metrics.marginTopPx;
    const marginBottom = page.metrics.marginBottomPx;

    // Content area should account for headers, footers, and margins
    expect(contentHeight).toBeGreaterThan(0);
    expect(contentHeight).toBeLessThan(totalPageHeight);

    // Verify total doesn't exceed page height
    const usedSpace = marginTop + marginBottom + contentHeight;
    expect(usedSpace).toBeLessThanOrEqual(totalPageHeight);
  });

  it('provides layout package with required top-level properties', () => {
    const { layout } = harness;

    expect(layout).toHaveProperty('pages');
    expect(layout).toHaveProperty('units');
    expect(layout).toHaveProperty('document');
    expect(layout).toHaveProperty('fieldSegments');

    expect(Array.isArray(layout.pages)).toBe(true);
    expect(layout.units.unit).toBe('px');
    expect(layout.units.dpi).toBeGreaterThan(0);
  });

  it('includes page gap spacing in layout', () => {
    const { layout } = harness;
    const page = layout.pages[0];

    expect(page.pageGapPx).toBeDefined();
    expect(typeof page.pageGapPx).toBe('number');
    expect(page.pageGapPx).toBeGreaterThanOrEqual(0);
  });

  it('calculates fittedBottom to match bottom for single-page document', () => {
    const { layout } = harness;
    const page = layout.pages[0];

    expect(page.break?.fittedBottom).toBeDefined();
    expect(page.break?.bottom).toBeDefined();
    expect(page.break.fittedBottom).toBe(page.break.bottom);
  });

  it('provides header footer summary in layout', () => {
    const { layout } = harness;

    expect(layout).toHaveProperty('headerFooterSummary');
    if (layout.headerFooterSummary) {
      expect(layout.headerFooterSummary).toHaveProperty('sectionMetricsById');
      expect(layout.headerFooterSummary).toHaveProperty('variantLookup');
    }
  });

  it('calculates page bottom spacing correctly for trailing page', () => {
    const { layout, docContentSize } = harness;
    const page = layout.pages[0];

    expect(page.pageBottomSpacingPx).toBeDefined();
    expect(page.pageBottomSpacingPx).toBeGreaterThan(0);

    // For a single-page document with minimal content, spacing should be substantial
    expect(page.pageBottomSpacingPx).toBeGreaterThan(700);
  });

  it('sets correct page index for single page', () => {
    const { layout } = harness;
    const page = layout.pages[0];

    expect(page.pageIndex).toBe(0);
  });

  it('positions break at end of document content', () => {
    const { layout, docContentSize } = harness;
    const page = layout.pages[0];

    expect(page.break.pos).toBe(docContentSize);
    expect(docContentSize).toBeGreaterThan(0);
  });
});
