import { test, expect } from '@playwright/test';
import testConfig from './test-config.js';
const PORT = 5173;

testConfig.packages.forEach((packagePath, i) => {
  const name = packagePath.replace(/.*\//, '');
  test.describe(name, () => {
    test('should open the main page', async ({ page }) => {
    // Should open the main page
      await page.goto(`http://localhost:${PORT + i}`);

    await page.waitForSelector('div.super-editor', {
      timeout: 10_000,
    });

    const screenshotOptions = { fullPage: true };
    if (name === 'dynamic-content') {
      screenshotOptions.maxDiffPixelRatio = 0.05; // allow small visual drift for dynamic-content demo
    }

    // Compare the screenshot with the reference screenshot
    await expect(page).toHaveScreenshot(screenshotOptions);
  });
});
});
