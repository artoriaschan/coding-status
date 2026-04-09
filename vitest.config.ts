import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.spec.ts', 'packages/*/scripts/**/*.spec.ts'],
    exclude: ['**/third_parts/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/types/**', '**/third_parts/**'],
    },
  },
});
