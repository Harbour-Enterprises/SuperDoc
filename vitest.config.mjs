import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use package directories; Vitest will pick up each package's vite.config.js
    projects: [
      './packages/super-editor',
      './packages/superdoc',
    ],
  },
});

