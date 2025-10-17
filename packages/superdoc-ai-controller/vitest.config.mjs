import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  cacheDir: resolve(rootDir, '../../node_modules/.vitest'),
  test: {
    name: '@superdoc-ai-controller',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js'],
    coverage: {
      exclude: ['src/index.js'],
    },
  },
});
