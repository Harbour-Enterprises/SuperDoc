import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import baseConfig from '../../../vitest.baseConfig';

export default defineConfig({
  ...baseConfig,
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: [resolve(__dirname, './vitest.setup.ts')],
  },
});
