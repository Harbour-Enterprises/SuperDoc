import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: [resolve(__dirname, './vitest.setup.ts')],
  },
  resolve: {
    alias: {
      '@superdoc/contracts': resolve(__dirname, '../contracts/src/index.ts'),
      '@superdoc/geometry-utils': resolve(__dirname, '../geometry-utils/src/index.ts'),
      '@superdoc/measuring-dom': resolve(__dirname, '../measuring/dom/src/index.ts'),
      '@superdoc/layout-engine': resolve(__dirname, '../layout-engine/src/index.ts'),
      '@superdoc/painter-dom': resolve(__dirname, '../painters/dom/src/index.ts'),
      '@superdoc/painter-pdf/renderer': resolve(__dirname, '../painters/pdf/src/renderer.ts'),
      '@superdoc/url-validation': resolve(__dirname, '../../../shared/url-validation/index.js'),
      '@superdoc/preset-geometry': resolve(__dirname, '../../preset-geometry/index.js'),
      // Mock external super-converter modules that are not available in pm-adapter tests
      '@converter/styles.js': resolve(__dirname, './__mocks__/@converter/styles.js'),
      '@converter/v3/handlers/w/tbl/tbl-translator.js': resolve(__dirname, './__mocks__/@converter/tbl-translator.js'),
    },
  },
});
