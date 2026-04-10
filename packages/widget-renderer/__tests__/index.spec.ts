import { describe, it, expect } from 'vitest';

import { version, BUILTIN_WIDGETS } from '../src/index.js';

describe('widget-renderer', () => {
    it('should export version', () => {
        expect(version).toBe('0.0.1');
    });

    it('should export BUILTIN_WIDGETS', () => {
        expect(BUILTIN_WIDGETS).toBeDefined();
        expect(Object.keys(BUILTIN_WIDGETS)).toContain('separator');
        expect(Object.keys(BUILTIN_WIDGETS)).toContain('text');
        expect(Object.keys(BUILTIN_WIDGETS)).toContain('provider');
        expect(Object.keys(BUILTIN_WIDGETS)).toContain('usage');
    });
});
