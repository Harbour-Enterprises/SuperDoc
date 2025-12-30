import { defineConfig } from 'vitest/config';
import baseConfig from '../../../vitest.baseConfig';

export default defineConfig({
  ...baseConfig,
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
  },
});
