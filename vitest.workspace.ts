import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  {
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.spec.ts'], // Per D-02: .spec.ts suffix
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.spec.ts', 'src/types/**'],
      },
    },
  },
]);
