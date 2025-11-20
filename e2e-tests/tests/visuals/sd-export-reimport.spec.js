import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import config from '../../test-config';

const APP_URL = process.env.SUPERDOC_E2E_APP_URL ?? 'http://localhost:4173/';
const UPDATE_SNAPSHOTS = Boolean(process.env.UPDATE_EXPORT_REIMPORT_SNAPSHOTS);
const ROUND_TRIP_EXPORT_DIR = './test-results/sd-export-reimport';
const SNAPSHOT_DIR = './tests/visuals/sd-export-reimport.spec.js-snapshots';
const TEST_RESULT_DIR_PREFIX = './test-results/visuals-sd-export-reimport';
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

const compareScreenshotWithSnapshot = (screenshotBuffer, baseName, maxDiffPixels = 80) => {
  ensureDir(SNAPSHOT_DIR);
  const snapshotPath = path.join(SNAPSHOT_DIR, `${baseName}.png`);
  const fileExists = fs.existsSync(snapshotPath);

  if (!fileExists || UPDATE_SNAPSHOTS) {
    fs.writeFileSync(snapshotPath, screenshotBuffer);
    if (!fileExists && !UPDATE_SNAPSHOTS) {
      process.exit(0);
    }
    return { skippedComparison: true, diffPixels: 0 };
  }

  const actual = PNG.sync.read(screenshotBuffer);
  const expected = PNG.sync.read(fs.readFileSync(snapshotPath));

  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error(
      `Screenshot size mismatch for ${baseName}.png (actual ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height})`,
    );
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const diffPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height);

  if (diffPixels > maxDiffPixels) {
    const resultDir = `${TEST_RESULT_DIR_PREFIX}-${baseName}`;
    ensureDir(resultDir);
    fs.writeFileSync(path.join(resultDir, `${baseName}-actual.png`), PNG.sync.write(actual));
    fs.writeFileSync(path.join(resultDir, `${baseName}-expected.png`), PNG.sync.write(expected));
    fs.writeFileSync(path.join(resultDir, `${baseName}-diff.png`), PNG.sync.write(diff));
  }

  return { skippedComparison: false, diffPixels };
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

      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        timeout: 30_000,
      });

      const { skippedComparison, diffPixels } = compareScreenshotWithSnapshot(screenshotBuffer, document.baseName);

      if (!skippedComparison) {
        expect(diffPixels).toBeLessThan(80);
      }
    });
  }
});
