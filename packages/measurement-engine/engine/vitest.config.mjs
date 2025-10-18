import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const superEditorDir = new URL('../../super-editor/', import.meta.url);

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js', '../measurement-tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', superEditorDir)),
      '@core': fileURLToPath(new URL('src/core', superEditorDir)),
      '@extensions': fileURLToPath(new URL('src/extensions', superEditorDir)),
      '@features': fileURLToPath(new URL('src/features', superEditorDir)),
      '@components': fileURLToPath(new URL('src/components', superEditorDir)),
      '@helpers': fileURLToPath(new URL('src/core/helpers', superEditorDir)),
      '@packages': fileURLToPath(new URL('../', superEditorDir)),
      '@converter': fileURLToPath(new URL('src/core/super-converter', superEditorDir)),
      '@tests': fileURLToPath(new URL('src/tests', superEditorDir)),
      '@translator': fileURLToPath(new URL('src/core/super-converter/v3/node-translator/index.js', superEditorDir)),
      '@measurement-engine': fileURLToPath(new URL('./src/index.js', import.meta.url)),
    },
  },
});
