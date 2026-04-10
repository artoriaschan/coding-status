export default [
    'packages/*',
    {
        test: {
            globals: true,
            environment: 'node',
            include: ['src/**/*.spec.ts'], // Per D-02: .spec.ts suffix
            exclude: ['**/third_parts/**', '**/node_modules/**', '**/dist/**'],
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
                include: ['src/**/*.ts'],
                exclude: ['src/**/*.spec.ts', 'src/types/**'],
            },
        },
    },
];
