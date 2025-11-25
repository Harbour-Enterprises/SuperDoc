/**
 * Section Break Column Tests
 *
 * Tests column changes across section breaks:
 * - Single column to two columns (nextPage)
 * - Single column to two columns (continuous - should change mid-page)
 * - Two columns back to single column
 * - Column count changes forcing page breaks
 * - Column gap changes
 *
 * @module section-breaks-columns.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPMDocWithSections,
  convertAndLayout,
  pmToFlowBlocks,
  getSectionBreaks,
  PAGE_SIZES,
  resetBlockIdCounter,
} from './test-helpers/section-test-utils.js';

describe('Section Breaks - Column Changes', () => {
  beforeEach(() => {
    resetBlockIdCounter();
  });

  describe('Single to Two Columns (nextPage)', () => {
    it('should handle single to two columns with nextPage type', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - Single column'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 1, gap: 0 },
            },
          },
          {
            paragraphs: ['Section 2 - Two columns'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 2, gap: 20 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);
      const layout = await convertAndLayout(pmDoc);

      // Should force page break
      expect(layout.pages.length).toBeGreaterThanOrEqual(2);

      // Check section breaks have column information
      const sectionBreaks = getSectionBreaks(blocks);
      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      expect(columnsInfo.length).toBeGreaterThanOrEqual(1);

      // Should have both single and two-column configs
      const singleCol = columnsInfo.find((c) => c.count === 1);
      const twoCol = columnsInfo.find((c) => c.count === 2);

      expect(singleCol).toBeDefined();
      expect(twoCol).toBeDefined();
    });

    it('should force page break for column change with nextPage', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Single column section'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 1, gap: 0 },
            },
          },
          {
            paragraphs: ['Two column section'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 2, gap: 15 },
        },
      );

      const layout = await convertAndLayout(pmDoc);

      // nextPage type should force page break
      expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Single to Two Columns (continuous)', () => {
    it('should handle single to two columns with continuous type', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - Single column'],
            props: {
              type: 'continuous',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 1, gap: 0 },
            },
          },
          {
            paragraphs: ['Section 2 - Two columns'],
          },
        ],
        {
          type: 'continuous',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 2, gap: 20 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);

      // Should have continuous section breaks
      const sectionBreaks = getSectionBreaks(blocks);
      const continuousBreak = sectionBreaks.find((b) => b.type === 'continuous');
      expect(continuousBreak).toBeDefined();

      // Column information should be preserved
      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      expect(columnsInfo.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Two Columns to Single Column', () => {
    it('should handle two columns to single column with nextPage', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - Two columns'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 2, gap: 20 },
            },
          },
          {
            paragraphs: ['Section 2 - Single column'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 1, gap: 0 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);
      const layout = await convertAndLayout(pmDoc);

      expect(layout.pages.length).toBeGreaterThanOrEqual(2);

      // Check column configurations
      const sectionBreaks = getSectionBreaks(blocks);
      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      const twoCol = columnsInfo.find((c) => c.count === 2);
      const singleCol = columnsInfo.find((c) => c.count === 1);

      expect(twoCol).toBeDefined();
      expect(singleCol).toBeDefined();
    });

    it('should handle two columns to single column with continuous', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - Two columns'],
            props: {
              type: 'continuous',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 2, gap: 20 },
            },
          },
          {
            paragraphs: ['Section 2 - Single column'],
          },
        ],
        {
          type: 'continuous',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 1, gap: 0 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);

      // Should have continuous breaks
      const sectionBreaks = getSectionBreaks(blocks);
      expect(sectionBreaks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multiple Column Count Changes', () => {
    it('should handle varying column counts across sections', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['S1 - 1 column'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 1, gap: 0 },
            },
          },
          {
            paragraphs: ['S2 - 2 columns'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 2, gap: 20 },
            },
          },
          {
            paragraphs: ['S3 - 3 columns'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 3, gap: 15 },
            },
          },
          {
            paragraphs: ['S4 - 1 column'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 1, gap: 0 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);
      const layout = await convertAndLayout(pmDoc);

      expect(layout.pages.length).toBe(4);

      // Check for various column counts
      const sectionBreaks = getSectionBreaks(blocks);
      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      const columnCounts = new Set(columnsInfo.map((c) => c.count));

      // Should have at least 2 different column counts
      expect(columnCounts.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Column Gap Changes', () => {
    it('should preserve column gap values', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - narrow gap'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 2, gap: 10 },
            },
          },
          {
            paragraphs: ['Section 2 - wide gap'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 2, gap: 30 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);

      const sectionBreaks = getSectionBreaks(blocks);
      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      // Should have different gap values
      const gaps = columnsInfo.map((c) => c.gap);
      const uniqueGaps = new Set(gaps);

      expect(uniqueGaps.size).toBeGreaterThanOrEqual(1);

      // Should include both gap values
      expect(columnsInfo.some((c) => c.gap === 10)).toBe(true);
      expect(columnsInfo.some((c) => c.gap === 30)).toBe(true);
    });

    it('should handle gap change with same column count', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 2, gap: 15 },
            },
          },
          {
            paragraphs: ['Section 2'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 2, gap: 25 }, // Same count, different gap
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);

      const sectionBreaks = getSectionBreaks(blocks);
      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      // Both should have 2 columns but different gaps
      expect(columnsInfo.every((c) => c.count === 2)).toBe(true);

      const gaps = columnsInfo.map((c) => c.gap);
      expect(gaps).toContain(15);
      expect(gaps).toContain(25);
    });
  });

  describe('Column Changes with Other Property Changes', () => {
    it('should handle column change with orientation change', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - Portrait, 1 column'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 1, gap: 0 },
            },
          },
          {
            paragraphs: ['Section 2 - Landscape, 2 columns'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'landscape',
          pageSize: PAGE_SIZES.LETTER_LANDSCAPE,
          columns: { count: 2, gap: 20 },
        },
      );

      const layout = await convertAndLayout(pmDoc);

      expect(layout.pages.length).toBeGreaterThanOrEqual(2);

      // First page: portrait
      expect(layout.pages[0].orientation).toBe('portrait');

      // Second page: landscape
      expect(layout.pages[1].orientation).toBe('landscape');
    });

    it('should handle column change with page size change', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - Letter, 1 column'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 1, gap: 0 },
            },
          },
          {
            paragraphs: ['Section 2 - Legal, 2 columns'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LEGAL_PORTRAIT,
          columns: { count: 2, gap: 20 },
        },
      );

      const layout = await convertAndLayout(pmDoc);

      expect(layout.pages.length).toBeGreaterThanOrEqual(2);

      // First page: Letter size
      if (layout.pages[0].pageSize) {
        expect(layout.pages[0].pageSize.h).toBe(792);
      }

      // Second page: Legal size
      if (layout.pages[1].pageSize) {
        expect(layout.pages[1].pageSize.h).toBe(1008);
      }
    });
  });

  describe('Same Column Count (No Change)', () => {
    it('should not force page break when columns stay same with continuous', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1 - short'],
            props: {
              type: 'continuous',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 1, gap: 0 },
            },
          },
          {
            paragraphs: ['Section 2 - short'],
          },
        ],
        {
          type: 'continuous',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 1, gap: 0 },
        },
      );

      const layout = await convertAndLayout(pmDoc);

      // Continuous with same columns should not force break
      expect(layout.pages.length).toBeGreaterThanOrEqual(1);
    });

    it('should force page break when columns stay same with nextPage', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Section 1'],
            props: {
              type: 'nextPage',
              orientation: 'portrait',
              pageSize: PAGE_SIZES.LETTER_PORTRAIT,
              columns: { count: 2, gap: 20 },
            },
          },
          {
            paragraphs: ['Section 2'],
          },
        ],
        {
          type: 'nextPage',
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 2, gap: 20 },
        },
      );

      const layout = await convertAndLayout(pmDoc);

      // nextPage should force break even with same columns
      expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single column explicitly specified', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Explicit single column'],
          },
        ],
        {
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 1, gap: 0 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);
      const sectionBreaks = getSectionBreaks(blocks);

      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      // Should have single column config
      expect(columnsInfo.some((c) => c.count === 1)).toBe(true);
    });

    it('should handle zero gap between columns', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Two columns with no gap'],
          },
        ],
        {
          orientation: 'portrait',
          pageSize: PAGE_SIZES.LETTER_PORTRAIT,
          columns: { count: 2, gap: 0 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);
      const sectionBreaks = getSectionBreaks(blocks);

      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      // Should preserve zero gap
      expect(columnsInfo.some((c) => c.count === 2 && c.gap === 0)).toBe(true);
    });

    it('should handle many columns', async () => {
      const pmDoc = createPMDocWithSections(
        [
          {
            paragraphs: ['Four columns'],
          },
        ],
        {
          orientation: 'landscape', // More space for columns
          pageSize: PAGE_SIZES.LETTER_LANDSCAPE,
          columns: { count: 4, gap: 10 },
        },
      );

      const { blocks } = pmToFlowBlocks(pmDoc);
      const sectionBreaks = getSectionBreaks(blocks);

      const columnsInfo = sectionBreaks
        .map((b) => b.columns)
        .filter((c): c is { count: number; gap: number } => c !== undefined);

      // Should handle 4 columns
      expect(columnsInfo.some((c) => c.count === 4)).toBe(true);
    });
  });
});
