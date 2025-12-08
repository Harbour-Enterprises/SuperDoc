import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@url-validation',
    environment: 'node',
    globals: true,
    include: ['**/*.test.js'],
  },
});
