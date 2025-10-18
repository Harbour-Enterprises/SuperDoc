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
});
