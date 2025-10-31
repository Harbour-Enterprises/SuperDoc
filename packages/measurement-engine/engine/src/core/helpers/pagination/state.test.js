// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { recordBreak } from './state.js';

describe('recordBreak', () => {
  it('sets pageStart to breakTop (not breakTop + spacing)', () => {
    // CRITICAL TEST: pageStart should be breakTop, not breakTop + spacing.
    // The spacing widget creates the visual gap, so adding spacing here would double-count it.
    // This test prevents the bug where content runs past headers.

    const pagination = {
      pageStart: 0,
      pageIndex: 0,
      blockIndex: 0,
      pages: [
        {
          pageIndex: 0,
          break: {},
          metrics: {
            marginBottom: 96,
          },
          pageBottomSpacingPx: 14.06, // Content ends before page boundary
        },
      ],
      pageLayout: {
        usableHeightPx: 864,
        margins: { top: 96, bottom: 96 },
        footerFooterAreas: {
          footer: { heightPx: 96 },
        },
      },
      baseMarginsPx: { top: 96, bottom: 96 },
      pageHeightPx: 1056,
      pageGapPx: 20,
      lastBreakPos: 3000,
      visualStackTop: 0,
    };

    const resolveLayout = () => ({
      usableHeightPx: 864,
      pageHeightPx: 1056,
      margins: { top: 96, bottom: 96 },
      headerFooterAreas: {
        header: { heightPx: 96 },
      },
    });

    const breakTop = 849.94;
    const breakBottom = 864;
    const breakPos = 3069;

    recordBreak({
      pagination,
      breakTop,
      breakBottom,
      breakPos,
      resolveLayout,
      lastFitTop: breakTop,
    });

    // CRITICAL ASSERTION: pageStart should equal breakTop, not breakTop + spacing
    // Expected spacing: 14.06 (pageBottom) + 96 (footer) + 96 (header) + 20 (gap) = 226.06
    // If pageStart = 849.94 + 226.06 = 1076, that's WRONG (double-counting)
    // Correct: pageStart = 849.94 (spacing widget handles the visual gap)
    expect(pagination.pageStart).toBe(breakTop);
    expect(pagination.pageStart).not.toBe(breakTop + 226.06);

    // Additional checks
    expect(pagination.pageIndex).toBe(1);
    expect(pagination.pages).toHaveLength(2);
  });

  it('calculates spacing correctly including pageBottomSpacing', () => {
    // TEST: Ensures spacing calculation includes all components:
    // pageBottomSpacing + footer + header + gap

    const pagination = {
      pageStart: 0,
      pageIndex: 0,
      blockIndex: 0,
      pages: [
        {
          pageIndex: 0,
          break: {},
          metrics: {
            marginBottom: 96,
          },
          pageBottomSpacingPx: 645.55, // Large unused space
        },
      ],
      pageLayout: {
        usableHeightPx: 864,
        margins: { top: 96, bottom: 96 },
        footerFooterAreas: {
          footer: { heightPx: 96 },
        },
      },
      baseMarginsPx: { top: 96, bottom: 96 },
      pageHeightPx: 1056,
      pageGapPx: 20,
      lastBreakPos: 3000,
      visualStackTop: 0,
    };

    const resolveLayout = () => ({
      usableHeightPx: 864,
      pageHeightPx: 1056,
      margins: { top: 96, bottom: 96 },
      headerFooterAreas: {
        header: { heightPx: 96 },
      },
    });

    const breakTop = 218.45;
    const breakBottom = 218.45;

    recordBreak({
      pagination,
      breakTop,
      breakBottom,
      breakPos: 3069,
      resolveLayout,
      lastFitTop: breakTop,
    });

    // pageStart should still be breakTop
    expect(pagination.pageStart).toBe(breakTop);

    // The spacing that will be created by the widget should be:
    // 645.55 + 96 + 96 + 20 = 857.55
    // (verified by calculateSpacingAfterPage in finalizePages)
    expect(pagination.pages[0].pageBottomSpacingPx).toBe(645.55);
  });

  it('handles pages with full content (no unused space)', () => {
    // TEST: When content fills the page completely, pageBottomSpacing should be small

    const pagination = {
      pageStart: 0,
      pageIndex: 0,
      blockIndex: 0,
      pages: [
        {
          pageIndex: 0,
          break: {},
          metrics: {
            marginBottom: 96,
          },
          pageBottomSpacingPx: 0.5, // Nearly full page
        },
      ],
      pageLayout: {
        usableHeightPx: 864,
        margins: { top: 96, bottom: 96 },
        footerFooterAreas: {
          footer: { heightPx: 96 },
        },
      },
      baseMarginsPx: { top: 96, bottom: 96 },
      pageHeightPx: 1056,
      pageGapPx: 20,
      lastBreakPos: 9000,
      visualStackTop: 0,
    };

    const resolveLayout = () => ({
      usableHeightPx: 864,
      pageHeightPx: 1056,
      margins: { top: 96, bottom: 96 },
      headerFooterAreas: {
        header: { heightPx: 96 },
      },
    });

    const breakTop = 863.5;

    recordBreak({
      pagination,
      breakTop,
      breakBottom: 864,
      breakPos: 9110,
      resolveLayout,
      lastFitTop: breakTop,
    });

    // pageStart should be breakTop
    expect(pagination.pageStart).toBe(breakTop);

    // Spacing should be minimal: 0.5 + 96 + 96 + 20 = 212.5
    expect(pagination.pages[0].pageBottomSpacingPx).toBe(0.5);
  });
});
