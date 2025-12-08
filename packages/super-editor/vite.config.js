import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import vue from '@vitejs/plugin-vue'

import { version as superdocVersion } from '../superdoc/package.json';

export default defineConfig(({ mode }) => {
  const plugins = [vue()];

  if (mode !== 'test') plugins.push(nodePolyfills());

  return {
    plugins,
    // Combined test configuration
    test: {
      name: '✏️ @super-editor',
      globals: true,
      environment: 'jsdom',
      retry: 2,
      testTimeout: 20000,
      hookTimeout: 10000,
      exclude: [
        '**/*.spec.js',
      ],
      coverage: {
        provider: 'v8',
        exclude: [
          '**/index.js',
          '**/v3/**/index.js',
          '**/examples/**',
          '**/types.js',
          '**/main.js',
          '**/migration_after_0_4_14.js',
        ],
        reporter: ['text'],
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(superdocVersion),
    },
    optimizeDeps: {
      exclude: [
        'yjs',
        'tippy.js',
        '@floating-ui/dom',
        // Layout engine packages (use source, not pre-bundled)
        '@superdoc/pm-adapter',
        '@superdoc/layout-bridge',
        '@superdoc/painter-dom',
        '@superdoc/contracts',
        '@superdoc/style-engine',
        '@superdoc/measuring-dom',
        '@superdoc/geometry-utils',
        '@superdoc/word-layout',
      ]
    },
    build: {
      target: 'es2020',
      lib: {
        entry: "src/index.js",
        formats: ['es'],
        name: "super-editor",
        cssFileName: 'style',
      },
      rollupOptions: {
        external: [
          'vue',
          'yjs',
          'y-protocols',
        ],
        input: {
          'super-editor': 'src/index.js',
          'editor': '@core/Editor',
          'converter': '@core/super-converter/SuperConverter',
          'docx-zipper': '@core/DocxZipper',
          'toolbar': '@components/toolbar/Toolbar.vue',
          'file-zipper': '@core/super-converter/zipper.js',
          'ai-writer': '@components/toolbar/AIWriter.vue',
        },
        output: {
          globals: {
            'vue': 'Vue',
            'tippy.js': 'tippy',
          },
          manualChunks: {
            'converter': ['@core/super-converter/SuperConverter'],
            'editor': ['@core/Editor'],
            'docx-zipper': ['@core/DocxZipper'],
            'toolbar': ['@components/toolbar/Toolbar.vue'],
            'super-input': ['@components/SuperInput.vue'],
            'file-zipper': ['@core/super-converter/zipper.js'],
            'ai-writer': ['@components/toolbar/AIWriter.vue'],
          },
          entryFileNames: '[name].es.js',
          chunkFileNames: 'chunks/[name]-[hash].js'
        }
      },
      minify: false,
      sourcemap: false,
    },
    server: {
      port: 9096,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        // IMPORTANT: @superdoc/common must point to source, not dist
        '@superdoc/common': fileURLToPath(new URL('../../shared/common', import.meta.url)),
        '@superdoc/url-validation': fileURLToPath(new URL('../../shared/url-validation', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
        '@extensions': fileURLToPath(new URL('./src/extensions', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@helpers': fileURLToPath(new URL('./src/core/helpers', import.meta.url)),
        '@packages': fileURLToPath(new URL('../', import.meta.url)),
        '@converter': fileURLToPath(new URL('./src/core/super-converter', import.meta.url)),
        '@tests': fileURLToPath(new URL('./src/tests', import.meta.url)),
        '@translator': fileURLToPath(new URL('./src/core/super-converter/v3/node-translator/index.js', import.meta.url)),
        '@superdoc/preset-geometry': fileURLToPath(new URL('../preset-geometry/index.js', import.meta.url)),
        // Layout engine packages
        '@superdoc/contracts': fileURLToPath(new URL('../layout-engine/contracts/src', import.meta.url)),
        '@superdoc/pm-adapter': fileURLToPath(new URL('../layout-engine/pm-adapter/src', import.meta.url)),
        '@superdoc/layout-bridge': fileURLToPath(new URL('../layout-engine/layout-bridge/src', import.meta.url)),
        '@superdoc/painter-dom': fileURLToPath(new URL('../layout-engine/painters/dom/src', import.meta.url)),
        '@superdoc/style-engine': fileURLToPath(new URL('../layout-engine/style-engine/src', import.meta.url)),
        '@superdoc/measuring-dom': fileURLToPath(new URL('../layout-engine/measuring/dom/src', import.meta.url)),
        '@superdoc/geometry-utils': fileURLToPath(new URL('../layout-engine/geometry-utils/src', import.meta.url)),
        '@superdoc/word-layout': fileURLToPath(new URL('../word-layout/src', import.meta.url)),
      },
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    css: {
      postcss: './postcss.config.cjs',
    },
  }
})
