import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.js'],
    environment: 'node',
    exclude: [
      'node_modules/**',
      '**/node_modules/**',
      '**/dist/**',
      'coverage/**',
      '**/example/**',
      'generator/types/**',
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov'],
      all: false,
      exclude: [
        // always ignore deps + build outputs
        'node_modules/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        'coverage/**',

        // tsup helper assets sometimes appear via dep graph
        '**/node_modules/tsup/**',

        // config & metadata
        'vitest.config.*',
        '**/constants.js',

        'packages/**/src/index.js',
        'packages/**/src/cli.js',

        // ignore examples
        'packages/**/example/**',
        'generator/types/**',
      ],
    },
  },
});
