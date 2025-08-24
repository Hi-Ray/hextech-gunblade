import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import tsparser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
    tseslint.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        plugins: {
            // "@typescript-eslint": tseslint,
            prettier: prettierPlugin,
            js,
        },
        extends: ['js/recommended'],
        languageOptions: {
            globals: globals.browser,
            parser: tsparser,
            sourceType: 'module',
        },
        rules: {
            ...prettierConfig.rules,
            '@typescript-eslint/no-unused-vars': 'warn',
            'no-console': 'off',
            semi: ['error', 'always'],
            'prettier/prettier': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            'no-undef': 'off',
        },
    },
]);
