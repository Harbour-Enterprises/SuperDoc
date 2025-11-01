import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use package directories; Vitest will pick up each package's vite.config.js
    projects: [
      './packages/super-editor',
      './packages/superdoc',
      './packages/superdoc-ai',
      './packages/collaboration-yjs',
      './shared/common',
    ],
    coverage: {
      exclude: [
        '**/index.js',
        '**/postcss.config.cjs',
        '**/main.js',
        '**/types.js',
        '**/migration_after_0_4_14.js',
      ],
    },
  },
});
