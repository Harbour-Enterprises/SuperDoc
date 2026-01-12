import { test, expect } from '@playwright/test';
import { goToPageAndWaitForEditor, sleep } from '../helpers.js';
import { fileURLToPath } from 'url';
import path from 'path';

test.describe('track changes imports', () => {
  const __filename = fileURLToPath(import.meta.url);
  const testDataFolder = __filename.split('/tests/')[0] + '/test-data';

  const wordTrackedChangeSnippets = [
    'Added: ACCEPT ADDITION',
    'Deleted: adipiscing',
    'Added: REJECT ADDITION',
    'Deleted: porttitor',
    'Added: ACCEPT REPLACEMENT ADDITION',
    'Added: REJECT REPLACEMENT ADDITION',
    'Added: ACCEPT ADDITION AND DELETION PLUS EXTRA TEXT',
    'Added: REJECT ADDITION AND DELETION PLUS EXTRA TEXT',
    'Deleted: rhoncus',
  ];

  const googleTrackedChangeSnippets = [
    'Added: ACCEPT ADDITION',
    'Deleted: adipiscing',
    'Added: REJECT ADDITION',
    'Deleted: Etiam',
    'Added: ACCEPT REPLACEMENT',
    'Added: REJECT REPLACEMENT',
    'Added: ACCEPT REPLACEMENT ADDITION',
    'Added: REJECT REPLACEMT ADDITION',
    'Added: ACCEPT REPLACEMENT DELETION',
    'Added: REJECT REPLACEMENT DELETION',
    'Added: ACCEPT ADDITION AND DELETION',
    'Deleted: massa',
    'Added: REJECT ADDITION AND DELETION',
    'Deleted: ligula',
    'Added: ACCEPT ADDITION AND DELETION PLUS EXTRA TEXT',
    'Deleted: Morbi',
    'Added: REJECT ADDITION AND DELETION PLUS EXTRA TEXT',
    'Deleted: gravida',
  ];

  const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();

  const getTrackedChangeText = async (locator) => {
    const contents = await locator.allTextContents();
    return normalizeText(contents.join(' '));
  };

  test('imports tracked changes from MS Word redlines', async ({ page }) => {
    await goToPageAndWaitForEditor(page, { includeComments: true });
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(testDataFolder, 'comments-documents/MSWordRedlined.docx'));

    await page.waitForFunction(() => window.superdoc !== undefined && window.editor !== undefined, null, {
      polling: 100,
      timeout: 10_000,
    });

    await sleep(1000);

    const trackedChanges = page.getByRole('dialog').filter({ hasText: 'Elliot Burton (imported)', visible: true });

    const trackedChangeCount = await trackedChanges.count();
    expect(trackedChangeCount).toBe(30);

    const trackedChangeText = await getTrackedChangeText(trackedChanges);
    wordTrackedChangeSnippets.forEach((snippet) => expect(trackedChangeText).toContain(snippet));
  });

  test('imports tracked changes from Google Docs redlines', async ({ page }) => {
    await goToPageAndWaitForEditor(page, { includeComments: true });
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(testDataFolder, 'comments-documents/GoogleDocsRedlined.docx'));

    await page.waitForFunction(() => window.superdoc !== undefined && window.editor !== undefined, null, {
      polling: 100,
      timeout: 10_000,
    });

    await sleep(1000);

    const trackedChanges = page.getByRole('dialog').filter({ hasText: 'Elliot Burton (imported)', visible: true });

    const trackedChangeCount = await trackedChanges.count();
    expect(trackedChangeCount).toBe(18);

    const trackedChangeText = await getTrackedChangeText(trackedChanges);
    googleTrackedChangeSnippets.forEach((snippet) => expect(trackedChangeText).toContain(snippet));
  });
});
