import { test, expect } from '@playwright/test';

test.describe('insert content', () => {
  test('insert heading as HTML string', async ({ page }) => {
    await page.goto('http://localhost:4173/');
    const superEditor = page.locator('div.super-editor').first();
    await expect(superEditor).toBeVisible({
      timeout: 1_000,
    });
    await page.waitForFunction(() => window.editor !== undefined && window.editor.commands !== undefined, null, {
      polling: 100,
      timeout: 10_000,
    });
    await page.evaluate(() => {
      window.editor.commands.insertContent('<h1>Heading 1</h1>');
    });
    await expect(superEditor).toHaveScreenshot({
      name: `insert-html-heading.png`,
    });
  });
  test('insert paragraph as HTML string', async ({ page }) => {
    await page.goto('http://localhost:4173/');
    const superEditor = page.locator('div.super-editor').first();
    await expect(superEditor).toBeVisible({
      timeout: 1_000,
    });
    await page.waitForFunction(() => window.editor !== undefined && window.editor.commands !== undefined, null, {
      polling: 100,
      timeout: 10_000,
    });
    await page.evaluate(() => {
      window.editor.commands.insertContent('<p>This is a <em>nice</em> short <strong>paragraph</strong>.</p>');
    });
    await expect(superEditor).toHaveScreenshot({
      name: `insert-html-paragraph.png`,
    });
  });
});
