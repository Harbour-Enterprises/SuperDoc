import { test, expect } from '@playwright/test';
import testConfig from './test-config.js';
const PORT = 5173;
const foldersToTest = testConfig.include;

foldersToTest.forEach(({name}, i) => {
  test.describe(name, () => {
    test('should open the main page', async ({ page }) => {
    // Should open the main page
      await page.goto(`http://localhost:${PORT + i}`);

    await page.waitForSelector('div.super-editor', {
      timeout: 10_000,
    });

    // Compare the screenshot with the reference screenshot
    await expect(page).toHaveScreenshot({
      fullPage: true,
    });
  });
});
});