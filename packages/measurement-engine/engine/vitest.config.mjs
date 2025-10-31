import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const superEditorDir = new URL('../../super-editor/', import.meta.url);
const presetGeometryDir = new URL('../../preset-geometry/', import.meta.url);
const pluginVuePath = fileURLToPath(
  new URL('../../super-editor/node_modules/@vitejs/plugin-vue/dist/index.cjs', import.meta.url),
);
const vue = require(pluginVuePath);

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js', 'tests/**/*.test.js', '../measurement-tests/**/*.test.js', '../page-break-tests/**/*.test.js'],
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
      '@preset-geometry': fileURLToPath(new URL('index.js', presetGeometryDir)),
    },
  },
});
