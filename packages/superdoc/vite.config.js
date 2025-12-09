import { dirname, resolve } from 'path';
import copy from 'rollup-plugin-copy'
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

const dir = dirname(fileURLToPath(import.meta.url))

export const getAliases = () => {
  const aliases = {
    // IMPORTANT: Specific @superdoc/* package aliases must come BEFORE the generic '@superdoc'
    // to avoid partial matches swallowing them.
    '@superdoc/common': resolve(dir, '../../shared/common'),

    // Workspace packages (source paths for dev)
    '@superdoc/contracts': resolve(dir, '../layout-engine/contracts/src'),
    '@superdoc/geometry-utils': resolve(dir, '../layout-engine/geometry-utils/src'),
    '@superdoc/pm-adapter': resolve(dir, '../layout-engine/pm-adapter/src'),
    '@superdoc/layout-bridge': resolve(dir, '../layout-engine/layout-bridge/src'),
    '@superdoc/painter-dom': resolve(dir, '../layout-engine/painters/dom/src'),
    '@superdoc/painter-pdf': resolve(dir, '../layout-engine/painters/pdf/src'),
    '@superdoc/style-engine': resolve(dir, '../layout-engine/style-engine/src'),
    '@superdoc/measuring-dom': resolve(dir, '../layout-engine/measuring/dom/src'),
    '@superdoc/word-layout': resolve(dir, '../word-layout/src'),
    '@superdoc/url-validation': resolve(dir, '../../shared/url-validation'),
    '@superdoc/preset-geometry': resolve(dir, '../preset-geometry'),

    // Generic @superdoc app alias LAST to avoid masking specific package aliases above
    '@superdoc': resolve(dir, './src'),
    '@stores': resolve(dir, './src/stores'),
    '@packages': resolve(dir, '../'),
    // (rest below)

    // Super Editor aliases
    '@components': resolve(dir, '../super-editor/src/components'),
    '@converter': resolve(dir, '../super-editor/src/core/super-converter'),
    '@core': resolve(dir, '../super-editor/src/core'),
    '@editor': resolve(dir, '../super-editor/src'),
    '@extensions': resolve(dir, '../super-editor/src/extensions'),
    '@features': resolve(dir, '../super-editor/src/features'),
    '@helpers': resolve(dir, '../super-editor/src/core/helpers'),
    '@tests': resolve(dir, '../super-editor/src/tests'),
    '@translator': resolve(dir, '../super-editor/src/core/super-converter/v3/node-translator'),
    '@utils': resolve(dir, '../super-editor/src/utils'),
  };

  return aliases;
};


// https://vitejs.dev/config/
export default defineConfig(({ mode, command}) => {
  const plugins = [
    vue(),
    copy({
      targets: [
        { 
          src: resolve(dir, '../../node_modules/pdfjs-dist/web/images/*'), 
          dest: 'dist/images',
        },
      ],
      hook: 'writeBundle'
    }),
    // visualizer(visualizerConfig)
  ];
  if (mode !== 'test') plugins.push(nodePolyfills());

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
        '**/*.spec.js',
      ],
      include: [
        '**/*.{test,spec}.?(c|m)[jt]s?(x)',
        '../super-editor/**/*.{test,spec}.?(c|m)[jt]s?(x)',
        '../layout-engine/**/*.{test,spec}.?(c|m)[jt]s?(x)',
        '../../shared/**/*.{test,spec}.?(c|m)[jt]s?(x)',
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
              'converter': ['@core/super-converter/SuperConverter'],
              'editor': ['@core/Editor'],
              'docx-zipper': ['@core/DocxZipper'],
              'toolbar': ['@components/toolbar/Toolbar.vue'],
              'super-input': ['@components/SuperInput.vue'],
              'file-zipper': ['@core/super-converter/zipper.js'],
              'ai-writer': ['@components/toolbar/AIWriter.vue'],
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
      exclude: [
        // Layout engine packages (use source, not pre-bundled)
        '@superdoc/pm-adapter',
        '@superdoc/layout-bridge',
        '@superdoc/painter-dom',
        '@superdoc/contracts',
        '@superdoc/style-engine',
        '@superdoc/measuring-dom',
        '@superdoc/word-layout',
      ],
      esbuildOptions: {
        target: 'es2020',
      },
    },
    resolve: {
      alias: getAliases(),
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    css: {
      postcss: './postcss.config.mjs',
    },
    server: {
      port: 9094,
      host: '0.0.0.0',
      fs: {
        allow: [
          resolve(dir, '../super-editor'),
          resolve(dir, '../layout-engine'),
          '../',
          '../../',
        ],
      },
    },
  }
});
