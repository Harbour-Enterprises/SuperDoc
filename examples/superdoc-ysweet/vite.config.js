import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // Proxy to local y-sweet to avoid CORS; rewrite strips the prefix
      '/ysweet': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ysweet/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['yjs', '@y-sweet/client', '@y-sweet/sdk'],
  },
  resolve: {
    dedupe: ['yjs'],
  },
});
