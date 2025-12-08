import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@superdoc/contracts': path.resolve(__dirname, '../../contracts/src/index.ts'),
      '@superdoc/geometry-utils': path.resolve(__dirname, '../../geometry-utils/src/index.ts'),
    },
  },
});
