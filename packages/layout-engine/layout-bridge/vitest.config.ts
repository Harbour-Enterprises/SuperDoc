import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';

const fromPackages = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@superdoc/contracts': fromPackages('../contracts/src/index.ts'),
      '@superdoc/pm-adapter': fromPackages('../pm-adapter/src/index.ts'),
      '@superdoc/measuring-dom': fromPackages('../measuring/dom/src/index.ts'),
      '@superdoc/geometry-utils': fromPackages('../geometry-utils/src/index.ts'),
      '@superdoc/style-engine': fromPackages('../style-engine/src/index.ts'),
      '@superdoc/painter-dom': fromPackages('../painters/dom/src/index.ts'),
      '@superdoc/painter-pdf': fromPackages('../painters/pdf/src/index.ts'),
      '@superdoc/word-layout': fromPackages('../../word-layout/src/index.ts'),
      '@superdoc/url-validation': fromPackages('../../../shared/url-validation/index.js'),
      '@superdoc/preset-geometry': fromPackages('../../preset-geometry/index.js'),
      // Mock external super-converter modules that are not available in pm-adapter tests
      '@converter/styles.js': fromPackages('../pm-adapter/__mocks__/@converter/styles.js'),
      '@converter/v3/handlers/w/tbl/tbl-translator.js': fromPackages(
        '../pm-adapter/__mocks__/@converter/tbl-translator.js',
      ),
    },
  },
  optimizeDeps: {
    exclude: [
      '@superdoc/contracts',
      '@superdoc/pm-adapter',
      '@superdoc/measuring-dom',
      '@superdoc/geometry-utils',
      '@superdoc/style-engine',
      '@superdoc/painter-dom',
      '@superdoc/painter-pdf',
      '@superdoc/word-layout',
      '@superdoc/preset-geometry',
    ],
  },
});
