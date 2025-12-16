import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['superdoc', '@superdoc-dev/ai']
  }
});
