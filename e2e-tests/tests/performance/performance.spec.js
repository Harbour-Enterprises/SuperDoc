import { test, expect } from '@playwright/test';
import { sleep } from '../helpers';

test.describe.skip('performance', () => {
  test.describe('load time', () => {
    test('should load a basic document in less than 3s', async ({ page }) => {
      test.setTimeout(30_000);

      const baseDocumentPath = `./test-data/basic-documents/base-custom.docx`;
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();

      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });
      // This has to be here because `superdocReady` will be called once when the page is initially loaded
      // But we want to measure the time it takes to load the document
      await sleep(1_000);

      let start, end, duration;
      start = Date.now();

      // Create a Promise that resolves when superdocReady is called
      const superdocReadyPromise = new Promise((resolve) => {
        page.exposeFunction('superdocReady', () => {
          end = Date.now();
          duration = end - start;
          resolve();
        });
      });

      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      // Wait for the superdocReady callback to be called
      await superdocReadyPromise;

      expect(duration).toBeLessThan(3_000);
    });

    test('should load a medium sized document in less than 4s', async ({ page }) => {
      test.setTimeout(30_000);

      const baseDocumentPath = `./test-data/performance-documents/40-pages.docx`;
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();

      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });
      // This has to be here because `superdocReady` will be called once when the page is initially loaded
      // But we want to measure the time it takes to load the document
      await sleep(1_000);

      let start, end, duration;
      start = Date.now();

      // Create a Promise that resolves when superdocReady is called
      const superdocReadyPromise = new Promise((resolve) => {
        page.exposeFunction('superdocReady', () => {
          end = Date.now();
          duration = end - start;
          resolve();
        });
      });

      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      // Wait for the superdocReady callback to be called
      await superdocReadyPromise;

      expect(duration).toBeLessThan(4_000);
    });

    test('should load a large sized document in less than 5s', async ({ page }) => {
      test.setTimeout(30_000);

      const baseDocumentPath = `./test-data/performance-documents/300-pages.docx`;
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();

      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });
      // This has to be here because `superdocReady` will be called once when the page is initially loaded
      // But we want to measure the time it takes to load the document
      await sleep(1_000);

      let start, end, duration;
      start = Date.now();

      // Create a Promise that resolves when superdocReady is called
      const superdocReadyPromise = new Promise((resolve) => {
        page.exposeFunction('superdocReady', () => {
          end = Date.now();
          duration = end - start;
          resolve();
        });
      });

      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      // Wait for the superdocReady callback to be called
      await superdocReadyPromise;

      expect(duration).toBeLessThan(5_000);
    });

    test('should load a very large sized document in less than 7s', async ({ page }) => {
      test.setTimeout(30_000);

      const baseDocumentPath = `./test-data/performance-documents/600-pages.docx`;
      await page.goto('http://localhost:4173/');
      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();

      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      // This has to be here because `superdocReady` will be called once when the page is initially loaded
      // But we want to measure the time it takes to load the document
      await sleep(1_000);

      let start, end, duration;
      start = Date.now();

      // Create a Promise that resolves when superdocReady is called
      const superdocReadyPromise = new Promise((resolve) => {
        page.exposeFunction('superdocReady', () => {
          end = Date.now();
          duration = end - start;
          resolve();
        });
      });

      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      // Wait for the superdocReady callback to be called
      await superdocReadyPromise;

      expect(duration).toBeLessThan(7_000);
    });
  });

  test.describe('interactions', () => {
    test('should insert a new letter in a basic document in less than 10ms', async ({ page }) => {
      const baseDocumentPath = `./test-data/basic-documents/base-custom.docx`;
      await page.goto('http://localhost:4173/');
      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      let transactionDuration = 0;
      await page.exposeFunction('onTransaction', ({ duration }) => {
        transactionDuration = duration;
      });
      await page.keyboard.type('a');
      await expect(transactionDuration).toBeLessThan(10);
    });

    // The 3 tests below are known issues that should be fixed in the future (in SuperDoc)
    test.skip('should insert a new letter in a medium sized document in less than 10ms', async ({ page }) => {
      const baseDocumentPath = `./test-data/performance-documents/40-pages.docx`;
      await page.goto('http://localhost:4173/');
      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      let transactionDuration = 0;
      await page.exposeFunction('onTransaction', ({ duration }) => {
        transactionDuration = duration;
      });
      await page.keyboard.type('a');
      await expect(transactionDuration).toBeLessThan(10);
    });

    test.skip('should insert a new letter in a large sized document in less than 10ms', async ({ page }) => {
      test.setTimeout(15_000);
      const baseDocumentPath = `./test-data/performance-documents/300-pages.docx`;
      await page.goto('http://localhost:4173/');
      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      let transactionDuration = 0;
      await page.exposeFunction('onTransaction', ({ duration }) => {
        transactionDuration = duration;
      });
      await page.keyboard.type('a');
      await expect(transactionDuration).toBeLessThan(10);
    });

    test.skip('should insert a new letter in a very large sized document in less than 10ms', async ({ page }) => {
      test.setTimeout(15000);
      const baseDocumentPath = `./test-data/performance-documents/600-pages.docx`;
      await page.goto('http://localhost:4173/');
      await page.locator('input[type="file"]').setInputFiles(baseDocumentPath);

      await page.waitForSelector('div.super-editor');
      const superEditor = page.locator('div.super-editor').first();
      await expect(superEditor).toBeVisible({
        timeout: 1_000,
      });

      await superEditor.click();
      let transactionDuration = 0;
      await page.exposeFunction('onTransaction', ({ duration }) => {
        transactionDuration = duration;
      });
      await page.keyboard.type('a');
      await expect(transactionDuration).toBeLessThan(10);
    });
  });
});
