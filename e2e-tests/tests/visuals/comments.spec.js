import { test, expect } from '@playwright/test';
import fs from 'fs';
import { goToPageAndWaitForEditor } from '../helpers';
import config from '../../test-config';

// Run this test with each file on the test-data/comments-documents folder
// and compare the screenshot with the reference image
const testData = fs
  .readdirSync(config.commentsDocumentsFolder)
  .filter((file) => !config.ignoreDocuments.includes(file));

test.describe('documents with comments', () => {
  testData.forEach((fileName) => {
    test(`${fileName}`, async ({ page }) => {
      await goToPageAndWaitForEditor(page, { includeComments: true });
      await page.locator('input[type="file"]').setInputFiles(`${config.commentsDocumentsFolder}/${fileName}`);

      await page.waitForFunction(() => window.superdoc !== undefined && window.editor !== undefined, null, {
        polling: 100,
        timeout: 10_000,
      });

      await expect(page).toHaveScreenshot({
        path: `${fileName}.png`,
        fullPage: true,
        timeout: 30_000,
      });
    });
  });
});
