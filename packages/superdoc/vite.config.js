import path from 'path';
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

export const getAliases = (isDev) => {
  const aliases = {
    // IMPORTANT: Specific @superdoc/* package aliases must come BEFORE the generic '@superdoc'
    // to avoid partial matches swallowing them.
    '@superdoc/common': path.resolve(__dirname, '../../shared/common'),

    // Workspace packages (source paths for dev)
    '@superdoc/contracts': path.resolve(__dirname, '../layout-engine/contracts/src/index.ts'),
    '@superdoc/geometry-utils': path.resolve(__dirname, '../layout-engine/geometry-utils/src/index.ts'),
    '@superdoc/pm-adapter': path.resolve(__dirname, '../layout-engine/pm-adapter/src/index.ts'),
    '@superdoc/layout-bridge': path.resolve(__dirname, '../layout-engine/layout-bridge/src/index.ts'),
    '@superdoc/painter-dom': path.resolve(__dirname, '../layout-engine/painters/dom/src/index.ts'),
    '@superdoc/painter-pdf': path.resolve(__dirname, '../layout-engine/painters/pdf/src/index.ts'),
    '@superdoc/style-engine': path.resolve(__dirname, '../layout-engine/style-engine/src/index.ts'),
    '@superdoc/measuring-dom': fileURLToPath(new URL('../layout-engine/measuring/dom/src', import.meta.url)),
    '@superdoc/word-layout': path.resolve(__dirname, '../word-layout/src/index.ts'),
    '@superdoc/url-validation': path.resolve(__dirname, '../../shared/url-validation/index.js'),
    '@superdoc/preset-geometry': fileURLToPath(new URL('../preset-geometry/index.js', import.meta.url)),

    // Generic @superdoc app alias LAST to avoid masking specific package aliases above
    '@superdoc': fileURLToPath(new URL('./src', import.meta.url)),
    '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
    '@packages': fileURLToPath(new URL('../', import.meta.url)),
    // (rest below)

    // Super Editor aliases
    '@': fileURLToPath(new URL('../super-editor/src', import.meta.url)),
    '@core': fileURLToPath(new URL('../super-editor/src/core', import.meta.url)),
    '@extensions': fileURLToPath(new URL('../super-editor/src/extensions', import.meta.url)),
    '@features': fileURLToPath(new URL('../super-editor/src/features', import.meta.url)),
    '@components': fileURLToPath(new URL('../super-editor/src/components', import.meta.url)),
    '@helpers': fileURLToPath(new URL('../super-editor/src/core/helpers', import.meta.url)),
    '@converter': fileURLToPath(new URL('../super-editor/src/core/super-converter', import.meta.url)),
    '@tests': fileURLToPath(new URL('../super-editor/src/tests', import.meta.url)),
    '@translator': fileURLToPath(new URL('../super-editor/src/core/super-converter/v3/node-translator/index.js', import.meta.url)),
  };

  if (isDev) {
    aliases['@harbour-enterprises/super-editor'] = path.resolve(__dirname, '../super-editor/src');
  }

  return aliases;
};


// https://vitejs.dev/config/
export default defineConfig(({ mode, command}) => {
  const plugins = [
    vue(),
    copy({
      targets: [
        {
          src: path.resolve(__dirname, '../super-editor/dist/*'),
          dest: 'dist/super-editor',
        },
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
      alias: getAliases(isDev),
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
          path.resolve(__dirname, '../super-editor'),
          path.resolve(__dirname, '../layout-engine'),
          '../',
          '../../',
        ],
      },
    },
  }
});
