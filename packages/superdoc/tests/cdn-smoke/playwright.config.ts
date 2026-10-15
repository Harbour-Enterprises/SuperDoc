import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 15_000,
  webServer: [
    {
      command: 'npx serve ../.. -l 3333 --no-clipboard',
      url: 'http://localhost:3333',
      timeout: 10_000,
    },
    // Plays a public CDN such as jsDelivr: another origin that allows
    // cross-origin reads (see cross-origin-engine.test.ts).
    {
      command: 'npx serve ../.. -l 3334 --no-clipboard --cors',
      url: 'http://localhost:3334',
      timeout: 10_000,
    },
  ],
  use: {
    baseURL: 'http://localhost:3333',
  },
  projects: [{ name: 'chromium' }],
});
