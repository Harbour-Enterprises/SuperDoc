import { test, expect } from '@playwright/test';
import config from '../../test-config.js';
import { goToPageAndWaitForEditor } from '../helpers.js';
import { loadDocumentsFromFolders } from './doc-loader.js';

// Layout-engine-only visual snapshots (pagination/layout on).
// Documents are auto-discovered from configured folders.

const shouldRun = process.env.LAYOUT_ENGINE === '1';

if (!shouldRun) {
  test.describe.skip('layout engine visuals (layout=1)', () => {
    test('skipped: set LAYOUT_ENGINE=1 to run these tests', () => {});
  });
} else {
  const ignore = new Set(config.ignoreDocuments || []);

  const folders = [
    { key: 'basic-documents', folder: config.basicDocumentsFolder },
    { key: 'comments-documents', folder: config.commentsDocumentsFolder },
  ];

  const layoutEngineDocs = loadDocumentsFromFolders(folders, ignore);

  test.describe('layout engine visuals (layout=1)', () => {
    layoutEngineDocs.forEach(({ id, filePath }) => {
      test(id, async ({ page }) => {
        test.setTimeout(50_000);

        await goToPageAndWaitForEditor(page, { layout: 1 });
        await page.locator('input[type="file"]').setInputFiles(filePath);

        await page.waitForFunction(() => window.superdoc !== undefined && window.editor !== undefined, null, {
          polling: 100,
          timeout: 10_000,
        });

        await expect(page).toHaveScreenshot({
          name: `${id}.png`,
          fullPage: true,
          timeout: 30_000,
        });
      });
    });
  });
}
