import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Proxy API requests to your backend during development
    // Uncomment and configure if you have a backend running
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //   },
    // },
  },
  optimizeDeps: {
    include: ['yjs', '@y-sweet/client'],
  },
});
