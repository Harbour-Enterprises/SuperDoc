import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@font-utils',
    environment: 'node',
    globals: true,
  },
});
