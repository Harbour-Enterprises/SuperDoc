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
    conditions: ['source'],
    alias: {
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
