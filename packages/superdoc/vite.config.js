import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { visualizer } from 'rollup-plugin-visualizer';
import vue from '@vitejs/plugin-vue'

import { version } from './package.json';

const visualizerConfig = {
  filename: './dist/bundle-analysis.html',
  template: 'treemap',
  gzipSize: true,
  brotliSize: true,
  open: true
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command}) => {
  const plugins = [
    vue(),
    // visualizer(visualizerConfig)
  ];
  if (mode !== 'test') plugins.push(nodePolyfills());

  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins,
    build: {
      target: 'es2022',
      lib: {
        entry: "src/index.js",
        formats: ['es'],
        name: "SuperDoc",
        fileName: (format) => `superdoc.${format}.js`
      },
      minify: false,
      sourcemap: true,
      rollupOptions: {
        input: {
          'superdoc': 'src/index.js',
          'super-editor': '@harbour-enterprises/super-editor',
          'super-converter': '@harbour-enterprises/super-editor/super-converter',
          'docx-zipper': '@harbour-enterprises/super-editor/docx-zipper',
          'toolbar': '@harbour-enterprises/super-editor/toolbar',
          'super-input': '@harbour-enterprises/super-editor/super-input',
          'common': '@harbour-enterprises/common',
          'zipper': '@harbour-enterprises/super-editor/zipper',
        },
        external: [
          'yjs',
          '@hocuspocus/provider',
          'pdfjs-dist',
          'vite-plugin-node-polyfills'
        ],
        output: {
          manualChunks: {
            'vue': ['vue'],
            'blank-docx': ['@harbour-enterprises/common/data/blank.docx?url'],
            'super-editor': ['@harbour-enterprises/super-editor'],
            'jszip': ['jszip'],
            'eventemitter3': ['eventemitter3'],
            'uuid': ['uuid'],
            'xml-js': ['xml-js'],
            'super-input': ['@harbour-enterprises/super-editor/super-input'],
          },
          entryFileNames: '[name].es.js',
          chunkFileNames: 'chunks/[name]-[hash].js'
        },
      }
    },
    optimizeDeps: {
      include: ['pdfjs-dist', 'yjs', '@hocuspocus/provider'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
        '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      },
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    css: {
      postcss: './postcss.config.cjs',
    },
    server: {
      port: 9094,
      host: '0.0.0.0',
      fs: {
        allow: ['../', '../../'],
      },
    },
  }
});