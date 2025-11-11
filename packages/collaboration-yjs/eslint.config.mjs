import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      // Test files
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/tests/**',
      // Examples
      'examples/**',
      '**/examples/**',
      // Config files
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: await import('@typescript-eslint/parser').then(mod => mod.default),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Node.js APIs
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off', // Turn off base rule for TypeScript
      'no-undef': 'off', // TypeScript handles this
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-case-declarations': 'off',
      'no-control-regex': 'off',
      'no-useless-escape': 'warn',
    },
  },
];
