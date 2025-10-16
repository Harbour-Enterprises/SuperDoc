import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'examples', 'examples/**'],
    includeSource: ['src/**/*.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'examples/**',
        '**/examples/**',
        '**/*.vue',
        'src/tests/utils/**',
        '**/types/**',
        '**/types.js',
        '**/index.js',
      ],
      cleanOnRerun: true,
    },
  },
});
