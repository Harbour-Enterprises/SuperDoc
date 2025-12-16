import { defineConfig } from 'vitest/config';
import baseConfig from '../../../vitest.baseConfig';

export default defineConfig({
  ...baseConfig,
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.bench.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      enabled: false,
    },
  },
});
