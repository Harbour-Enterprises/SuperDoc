import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      // Disable TypeScript rule for JavaScript files
      '@typescript-eslint/no-unused-vars': 'off',

      // Warn on unused vars, allow underscore prefix for intentionally unused
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Warn on 'any' usage - we want to gradually remove them
      '@typescript-eslint/no-explicit-any': 'warn',

      // Disable base rule for TypeScript files
      'no-unused-vars': 'off',

      // Warn on unused vars, allow underscore prefix for intentionally unused
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Allow non-null assertions (we use them carefully in adapters)
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Relax empty function rule for test mocks
      '@typescript-eslint/no-empty-function': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
