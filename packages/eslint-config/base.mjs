import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import-x';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/*.js', '**/*.d.ts', 'dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: '@aprovan/eslint-config/base/rules',
    plugins: {
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      'no-unused-vars': 'off',
      'no-constant-condition': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'type',
          ],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': 'warn',
      'no-empty-function': 'warn',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      'require-yield': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
  },
  eslintConfigPrettier,
);
