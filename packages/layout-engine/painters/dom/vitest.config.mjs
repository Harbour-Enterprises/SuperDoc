import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const presetGeometryPath = path.resolve(__dirname, '../../../preset-geometry/index.js');
const contractsPath = path.resolve(__dirname, '../../contracts/src/index.ts');

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@superdoc/contracts': contractsPath,
      '@superdoc/preset-geometry': presetGeometryPath,
    },
  },
});
