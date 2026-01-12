import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import config from '../../test-config';

const APP_URL = process.env.SUPERDOC_E2E_APP_URL ?? 'http://localhost:4173/';
const ROUND_TRIP_EXPORT_DIR = './test-results/sd-export-reimport';
const IGNORED_DOCUMENTS = [
  'advanced-tables',
  'msa-list-base-indent',
  'custom-list-numbering',
  'sdpr',
  'ooxml-rFonts-rstyle-linked-combos-demo',
  'ooxml-color-rstyle-linked-combos-demo',
  'ooxml-underline-rstyle-linked-combos-demo',
  'table-of-contents',
  'table-of-contents-sdt',
  'tiny-spacing', // FIXME: exportDocx returns undefined for this doc
];

const documents = fs
  .readdirSync(config.basicDocumentsFolder)
  .filter((name) => !config.ignoreDocuments.includes(name))
  .filter((name) => /\.docx$/i.test(name))
  .map((name) => ({
    fileName: name,
    baseName: name.replace(/\.docx$/i, ''),
  }))
  .filter(({ baseName }) => !IGNORED_DOCUMENTS.includes(baseName));

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const waitForEditorReady = async (page) => {
  const superEditor = page.locator('div.super-editor').first();
  await expect(superEditor).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const superdoc = window.superdoc ?? window.superdocdev;
      const editor = superdoc?.activeEditor ?? window.editor;
      return superdoc !== undefined && editor !== undefined && typeof editor.exportDocx === 'function';
    },
    null,
    { polling: 100, timeout: 10_000 },
  );
  await page.evaluate(() => {
    const superdoc = window.superdoc ?? window.superdocdev;
    if (superdoc) {
      window.superdoc = superdoc;
      window.editor = superdoc.activeEditor;
    }
  });
};

const uploadDocument = async (page, filePath) => {
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await waitForEditorReady(page);
};

const exportDocxAsBuffer = async (page) => {
  const serialized = await page.evaluate(async () => {
    const superdoc = window.superdoc ?? window.superdocdev;
    const activeEditor = superdoc?.activeEditor ?? window.editor;
    if (!activeEditor || typeof activeEditor.exportDocx !== 'function') {
      throw new Error('Active editor with exportDocx is not available.');
    }
    const blob = await activeEditor.exportDocx({
      isFinalDoc: true,
    });
    const arrayBuffer = await blob.arrayBuffer();
    return Array.from(new Uint8Array(arrayBuffer));
  });

  return Buffer.from(serialized);
};

ensureDir(ROUND_TRIP_EXPORT_DIR);

test.describe('SD x SD export (visual)', () => {
  for (const document of documents) {
    test(document.fileName, async ({ page }) => {
      test.setTimeout(60_000);

      await page.goto(APP_URL);
      await uploadDocument(page, path.join(config.basicDocumentsFolder, document.fileName));

      const exportedDocx = await exportDocxAsBuffer(page);
      const exportedDocPath = path.join(ROUND_TRIP_EXPORT_DIR, `${document.baseName}-roundtrip.docx`);
      fs.writeFileSync(exportedDocPath, exportedDocx);

      await page.goto(APP_URL);
      await uploadDocument(page, exportedDocPath);

      await expect(page).toHaveScreenshot({
        name: `${document.baseName}.png`,
        fullPage: true,
        timeout: 30_000,
      });
    });
  }
});
