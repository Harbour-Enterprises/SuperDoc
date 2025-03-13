import { test, expect } from '@playwright/test';

let page;

test.describe('pagination', () => {
  test.describe('blank document', () => {
    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      page = await context.newPage();
      await page.goto('http://localhost:4173?file=blank');
    });
  
    test('should be positioned at (0, 0) and have the correct dimensions', async () => {
      await page.waitForSelector('#editor');
      const editorDiv = await page.$('#editor');
      const rect = await editorDiv.boundingBox();

      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
    });

    test('should render pagination elements', async () => {
      await page.waitForSelector('.pagination-page-spacer.ProseMirror-widget');
      await page.waitForSelector('.pagination-break-wrapper.ProseMirror-widget');

      const spacers = await page.$$('.pagination-page-spacer.ProseMirror-widget');
      const breaks = await page.$$('.pagination-break-wrapper.ProseMirror-widget');

      expect(spacers.length).toBe(1);
      expect(breaks.length).toBe(2);
    });

    test('should have header with correct dimensions', async () => {
      await page.waitForSelector('.pagination-section-header');
      const header = await page.$('.pagination-section-header');
      const headerBox = await header.boundingBox();

      expect(headerBox.height).toBe(96);
    });

    test('should have footer with correct dimensions', async () => {
      await page.waitForSelector('.pagination-section-footer');
      const footer = await page.$('.pagination-section-footer');
      const styles = await footer.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const height = styles.getPropertyValue('height');
        const marginBottom = styles.getPropertyValue('margin-bottom');
        return {
          height,
          marginBottom,
        };
      });

      expect(styles.height).toBe('48px');
      expect(styles.marginBottom).toBe('48px');
    });

    test('should have page spacer with correct dimensions', async () => {
      await page.waitForSelector('#editor');
      await page.waitForSelector('.ProseMirror p');
      await page.waitForSelector('.pagination-page-spacer.ProseMirror-widget');

      const editorHeight = 1069.66;
      const firstParagraphMarginTop = 14.667;
      const firstParagraphMarginBottom = 14.667;
      const firstParagraphHeight = 16.86 + firstParagraphMarginTop + firstParagraphMarginBottom;
      const headerHeight = 96;
      const footerHeight = 96;
      const expectedSpacerHeight = parseInt(editorHeight - firstParagraphHeight - headerHeight - footerHeight);

      const spacer = await page.$('.pagination-page-spacer.ProseMirror-widget');
      const spacerBox = await spacer.boundingBox();
      const spacerHeight = parseInt(spacerBox.height);

      expect(spacerHeight).toBe(expectedSpacerHeight);
    });
  });

  test.describe('document with hard break', () => {
    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      page = await context.newPage();
      await page.goto('http://localhost:4173?file=hard-break');
    });

    test('should render pagination elements', async () => {
      await page.waitForLoadState('networkidle');

      const spacers = await page.$$('.pagination-page-spacer.ProseMirror-widget');
      const breaks = await page.$$('.pagination-break-wrapper.ProseMirror-widget');

      expect(spacers.length).toBe(2);
      expect(breaks.length).toBe(3);
    });

    test('should have header with correct dimensions', async () => {
      await page.waitForSelector('.pagination-section-header');
      const header = await page.$('.pagination-section-header');
      const headerBox = await header.boundingBox();

      expect(Math.round(headerBox.height)).toBe(192);
    });

    test('should have footer with correct dimensions', async () => {
      await page.waitForSelector('.pagination-section-footer');
      const footer = await page.$('.pagination-section-footer');
      const footerBox = await footer.boundingBox();
      const footerMarginBottom = await footer.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.getPropertyValue('margin-bottom').replace('px', ''));
      });

      expect(Math.round(footerBox.height + footerMarginBottom)).toBe(192);
    });

    test('should have page spacer with correct dimensions', async () => {
      await page.waitForSelector('#editor');
      await page.waitForSelector('.ProseMirror p');
      await page.waitForSelector('.pagination-page-spacer.ProseMirror-widget');
      
      const spacers = await page.$$('.pagination-page-spacer.ProseMirror-widget');

      for (const spacer of spacers) {
        const spacerBox = await spacer.boundingBox();
        const spacerHeight = parseInt(spacerBox.height);
        // Might not be exactly 620px due to rounding errors, so we check for a range
        expect(Math.round(spacerHeight)).toBeGreaterThanOrEqual(619);
        expect(Math.round(spacerHeight)).toBeLessThanOrEqual(621);
      }
    });
  });
});
