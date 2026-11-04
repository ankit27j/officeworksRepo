// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/node_modules/**', '**/*.d.ts'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Backend + tooling run on Node.
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', '**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // NestJS DI reads constructor parameter types at runtime (decorator metadata). Without this,
  // consistent-type-imports would "fix" injected classes into `import type` and break injection.
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true } },
  },

  // Frontend: React rules + architecture guards.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Theming must come from tokens / CSS Modules so light/dark and rebrands work globally.
      'react/forbid-dom-props': ['error', { forbid: ['style'] }],
      'react/forbid-component-props': ['error', { forbid: ['style'] }],
    },
  },

  // UI layers must not talk to the network directly: service -> store -> hook -> page -> component.
  {
    files: ['apps/web/src/{components,pages,hooks}/**/*.{ts,tsx}'],
    // Tests may build API-layer fixtures (e.g. an ApiError); the rule guards runtime code.
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'axios', message: 'Use a service in src/api/services via a store.' }],
          patterns: [
            {
              group: ['**/api/*', '**/api/**'],
              message: 'UI must not import the API layer; go through a store.',
            },
          ],
        },
      ],
    },
  },

  prettier,
);
