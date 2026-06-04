import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';
import reactConfig from './react.mjs';

const compat = new FlatCompat({
  baseDir: import.meta.dirname,
});

export default tseslint.config(
  ...reactConfig,
  ...compat.extends('next/core-web-vitals'),
  {
    name: '@aprovan/eslint-config/next',
  },
);
