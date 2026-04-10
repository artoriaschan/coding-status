import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@coding-status/widget-renderer': path.resolve(
                __dirname,
                'packages/widget-renderer/src/index.ts'
            ),
            '@coding-status/widget-renderer/settings.schema': path.resolve(
                __dirname,
                'packages/widget-renderer/src/settings.schema.ts'
            ),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['packages/*/__tests__/**/*.spec.ts'],
        exclude: ['**/third_parts/**', '**/node_modules/**', '**/dist/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['packages/*/src/**/*.ts'],
            exclude: ['**/*.spec.ts', '**/types/**', '**/third_parts/**'],
        },
    },
});
