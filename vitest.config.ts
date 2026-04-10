import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@cdps/widget-renderer': path.resolve(
                __dirname,
                'packages/widget-renderer/src/index.ts'
            ),
            '@cdps/widget-renderer/settings.schema': path.resolve(
                __dirname,
                'packages/widget-renderer/src/settings.schema.ts'
            ),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['packages/*/e2e/**/*.spec.ts', 'packages/*/scripts/**/*.spec.ts'],
        exclude: ['**/third_parts/**', '**/node_modules/**', '**/dist/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['packages/*/src/**/*.ts'],
            exclude: ['**/*.spec.ts', '**/types/**', '**/third_parts/**'],
        },
    },
});
