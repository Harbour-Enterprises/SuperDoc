import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use package directories; Vitest will pick up each package's vite.config.js
    projects: [
      './packages/superdoc',
      './packages/ai',
      './packages/collaboration-yjs',
    ],
    coverage: {
      exclude: [
        '**/index.js',
        '**/postcss.config.cjs',
        '**/postcss.config.mjs',
        '**/main.js',
        '**/types.js',
        '**/migration_after_0_4_14.js',
      ],
    },
  },
});
