import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@common',
    environment: 'node',
    globals: true,
  },
});
