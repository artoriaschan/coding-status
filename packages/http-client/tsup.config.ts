import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    outDir: 'dist',
    clean: true,
    sourcemap: false,
    minify: false,
});
