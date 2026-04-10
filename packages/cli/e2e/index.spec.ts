import { describe, it, expect } from 'vitest';

describe('core bootstrap', () => {
    it('should verify index.ts has correct bootstrap pattern', async () => {
        // Read index.ts content to verify bootstrap pattern
        // This test verifies the structural pattern exists in the source file
        const fs = await import('node:fs/promises');
        const indexContent = await fs.readFile(
            new URL('../src/index.ts', import.meta.url),
            'utf-8'
        );

        // Verify shebang exists
        expect(indexContent).toContain('#!/usr/bin/env node');

        // Verify FORCE_COLOR is set before imports
        expect(indexContent).toContain('process.env.FORCE_COLOR');

        // Verify dynamic import pattern
        expect(indexContent).toContain("import('./cli.js')");
    });
});
