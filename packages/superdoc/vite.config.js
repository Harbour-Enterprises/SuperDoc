import path from 'path';
import copy from 'rollup-plugin-copy'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
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

export const getAliases = (_isDev) => {
  const aliases = [
    // NOTE: There are a number of packages named "@superdoc/PACKAGE", but we also alias
    // "@superdoc" to the src directory of the superdoc package. This is error-prone and
    // should be changed, e.g. by renaming the src alias to "@superdoc/superdoc".
    //
    // Until then, the alias for "./src" is a regexp that matches any imports starting
    // with "@superdoc/" that don't also match one of the known packages.

    {
      find: /^@superdoc\/(?!common|contracts|geometry-utils|pm-adapter|layout-bridge|painter-dom|painter-pdf|style-engine|measuring-dom|word-layout|url-validation|preset-geometry)(.*)/,
      replacement: path.resolve(__dirname, './src/$1'),
    },

    // Workspace packages (source paths for dev)
    { find: '@stores', replacement: fileURLToPath(new URL('./src/stores', import.meta.url)) },
    { find: '@packages', replacement: fileURLToPath(new URL('../', import.meta.url)) },

    // Super Editor aliases
    { find: '@', replacement: '@harbour-enterprises/super-editor' },
    { find: '@core', replacement: fileURLToPath(new URL('../super-editor/src/core', import.meta.url)) },
    { find: '@extensions', replacement: fileURLToPath(new URL('../super-editor/src/extensions', import.meta.url)) },
    { find: '@features', replacement: fileURLToPath(new URL('../super-editor/src/features', import.meta.url)) },
    { find: '@components', replacement: fileURLToPath(new URL('../super-editor/src/components', import.meta.url)) },
    { find: '@helpers', replacement: fileURLToPath(new URL('../super-editor/src/core/helpers', import.meta.url)) },
    { find: '@converter', replacement: fileURLToPath(new URL('../super-editor/src/core/super-converter', import.meta.url)) },
    { find: '@tests', replacement: fileURLToPath(new URL('../super-editor/src/tests', import.meta.url)) },
    { find: '@translator', replacement: fileURLToPath(new URL('../super-editor/src/core/super-converter/v3/node-translator/index.js', import.meta.url)) },
  ];

  return aliases;
};


// https://vitejs.dev/config/
export default defineConfig(({ mode, command}) => {
  const plugins = [
    vue(),
    copy({
      targets: [
        { 
          src: path.resolve(__dirname, '../../node_modules/pdfjs-dist/web/images/*'), 
          dest: 'dist/images',
        },
      ],
      hook: 'writeBundle'
    }),
    // visualizer(visualizerConfig)
  ];
  if (mode !== 'test') plugins.push(nodePolyfills());
  const isDev = command === 'serve';

  // Use emoji marker instead of ANSI colors to avoid reporter layout issues
  const projectLabel = '🦋 @superdoc';

  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __IS_DEBUG__: true,
    },
    plugins,
    test: {
      name: projectLabel,
      globals: true,
      environment: 'jsdom',
      retry: 2,
      testTimeout: 20000,
      hookTimeout: 10000,
      exclude: [
        ...configDefaults.exclude,
        '**/*.spec.js',
      ],
    },
    build: {
      target: 'es2022',
      cssCodeSplit: false,
      lib: {
        entry: "src/index.js",
        name: "SuperDoc",
        cssFileName: 'style',
      },
      minify: false,
      sourcemap: false,
      rollupOptions: {
        input: {
          'superdoc': 'src/index.js',
          'super-editor': 'src/super-editor.js',
        },
        external: [
          'yjs',
          '@hocuspocus/provider',
          'vite-plugin-node-polyfills',
          'vite-plugin-node-polyfills/shims/process',
          'pdfjs-dist',
          'pdfjs-dist/build/pdf.mjs',
          'pdfjs-dist/legacy/build/pdf.mjs',
          'pdfjs-dist/web/pdf_viewer.mjs',
        ],
        output: [
          {
            format: 'es',
            entryFileNames: '[name].es.js',
            chunkFileNames: 'chunks/[name]-[hash].es.js',
            manualChunks: {
              'vue': ['vue'],
              'blank-docx': ['@superdoc/common/data/blank.docx?url'],
              'jszip': ['jszip'],
              'eventemitter3': ['eventemitter3'],
              'uuid': ['uuid'],
              'xml-js': ['xml-js'],
            }
          },
          {
            format: 'cjs',
            entryFileNames: '[name].cjs',
            chunkFileNames: 'chunks/[name]-[hash].cjs',
            manualChunks: {
              'vue': ['vue'],
              'blank-docx': ['@superdoc/common/data/blank.docx?url'],
              'jszip': ['jszip'],
              'eventemitter3': ['eventemitter3'],
              'uuid': ['uuid'],
              'xml-js': ['xml-js'],
            }
          }
        ],        
      }
    },
    optimizeDeps: {
      include: ['yjs', '@hocuspocus/provider'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
    resolve: {
      alias: getAliases(isDev),
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      conditions: ['source'],
    },
    css: {
      postcss: './postcss.config.mjs',
    },
    server: {
      port: 9094,
      host: '0.0.0.0',
      fs: {
        allow: [
          path.resolve(__dirname, '../super-editor'),
          path.resolve(__dirname, '../layout-engine'),
          '../',
          '../../',
        ],
      },
    },
  }
});
