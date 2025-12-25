// @ts-check
import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4173';
/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  captureGitInfo: { commit: false, diff: false },
  reporter: [['json', { outputFile: 'test-results/playwright-report.json' }]],
  use: {
    trace: 'off',
    baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cd templates/vue && npm run build && npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
