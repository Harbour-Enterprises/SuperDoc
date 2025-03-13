import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    testMatch: './src/tests/e2e/**/*.spec.js',
    command: 'cd src/tests/e2e/test-app && npm run build && npm run preview && playwright test',
    url: 'http://localhost:4173',
    timeout: 5 * 1000,
    reuseExistingServer: true,
    waitOnScheme: {
      resources: ['http://localhost:4173'],
      delay: 500,
    },
  },
  use: {
    baseURL: 'http://localhost:4173',
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
  },
});
