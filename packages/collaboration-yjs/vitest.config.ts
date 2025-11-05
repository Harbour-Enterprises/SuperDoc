import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'examples', 'examples/**'],
    includeSource: ['src/**/*.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'examples/**',
        '**/examples/**',
        '**/*.vue',
        'src/tests/utils/**',
        'src/types/**',
        'src/index.ts',
      ],
      cleanOnRerun: true,
    },
  },
});
