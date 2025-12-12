import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@superdoc-dev/ai': path.resolve(__dirname, '../../../packages/ai/src/index.ts')
    }
  },
  optimizeDeps: {
    include: ['superdoc', '@superdoc-dev/ai']
  }
});