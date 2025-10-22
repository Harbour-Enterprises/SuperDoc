import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import dns from 'dns';
import tsConfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Tells the server to use 'localhost' rather than '127.0.0.1'
dns.setDefaultResultOrder('verbatim');

export default defineConfig({
  server: {
    port: 3000,
  },
  publicDir: './public',
  baseUrl: './src',
  root: './',
  build: {
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
  },
  plugins: [
    react(),
    tsConfigPaths(),
    tailwindcss(),
    svgr(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  css: {
    // https://vite.dev/config/shared-options.html#css-preprocessoroptions
    preprocessorOptions: { scss: { api: 'modern' } },
  },
});
