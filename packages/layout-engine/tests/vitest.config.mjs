import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.bench.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      '@superdoc/url-validation': resolve(__dirname, '../../../shared/url-validation/index.js'),
      '@superdoc/geometry-utils': resolve(__dirname, '../geometry-utils/src/index.ts'),
      '@superdoc/common/layout-constants': resolve(__dirname, '../../../shared/common/layout-constants.ts'),
      '@superdoc/common': resolve(__dirname, '../../../shared/common'),
      '@superdoc/common/list-numbering': resolve(__dirname, '../../../shared/common/list-numbering'),
      '@superdoc/contracts': resolve(__dirname, '../contracts/src/index.ts'),
      '@converter': resolve(__dirname, '../../super-editor/src/core/super-converter'),
      '@core': resolve(__dirname, '../../super-editor/src/core'),
      '@extensions': resolve(__dirname, '../../super-editor/src/extensions'),
      '@components': resolve(__dirname, '../../super-editor/src/components'),
      '@helpers': resolve(__dirname, '../../super-editor/src/core/helpers'),
      '@tests': resolve(__dirname, '../../super-editor/src/tests'),
      '@translator': resolve(__dirname, '../../super-editor/src/core/super-converter/v3/node-translator/index.js'),
    },
  },
});
