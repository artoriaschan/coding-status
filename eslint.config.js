import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import sheriff from '@softarc/eslint-plugin-sheriff';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    ...tsEslint.configs.recommended,
    {
        files: ['packages/**/*.ts'],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.base.json',
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                fetch: 'readonly',
            },
        },
        plugins: {
            '@softarc/sheriff': sheriff,
            import: importPlugin,
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': 'off',
            // Allow control characters for ANSI escape sequence parsing
            'no-control-regex': 'off',
            // Disable preserve-caught-error (no plugin configured)
            'preserve-caught-error': 'off',
            // Sheriff - Module boundary enforcement (per D-01)
            '@softarc/sheriff/dependency-rule': 'error',
            '@softarc/sheriff/encapsulation': 'off',
            // Import rules - Disabled import/order due to ESLint 10.1.0 incompatibility
            // See: https://github.com/import-js/eslint-plugin-import/issues/2969
            // 'import/order': [
            //     'warn',
            //     {
            //         groups: [
            //             'builtin',
            //             'external',
            //             'internal',
            //             'parent',
            //             'sibling',
            //         ],
            //         'newlines-between': 'always',
            //         alphabetize: { order: 'asc', caseInsensitive: true },
            //     },
            // ],
            'import/no-duplicates': 'error',
            'import/newline-after-import': 'warn',
        },
    },
    // Prettier config must be last to disable conflicting rules
    prettierConfig,
    {
        ignores: ['**/dist/', '**/node_modules/', '*.config.*'],
    },
];
