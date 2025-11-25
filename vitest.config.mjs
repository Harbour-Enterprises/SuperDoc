import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use package directories; Vitest will pick up each package's vite.config.js
    projects: [
      './packages/super-editor',
      './packages/superdoc',
      './packages/ai',
      './packages/collaboration-yjs',
      './packages/layout-engine/layout-bridge',
      './packages/layout-engine/pm-adapter',
      './packages/layout-engine/tests',
      './shared/common',
      './shared/font-utils',
      './shared/locale-utils',
      './shared/url-validation',
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
