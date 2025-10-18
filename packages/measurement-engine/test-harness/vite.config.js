import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const measurementEngineDir = new URL('../engine/', import.meta.url)
const superEditorDir = new URL('../../super-editor/', import.meta.url)

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@measurement-engine': fileURLToPath(new URL('src/index.js', measurementEngineDir)),
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
    },
  },
})
