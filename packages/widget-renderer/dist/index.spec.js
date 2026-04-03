import { describe, it, expect } from 'vitest';
import { hello, version } from './index.js';
describe('widget-renderer', () => {
    it('should export version', () => {
        expect(version).toBe('0.0.1');
    });
    it('should say hello', () => {
        expect(hello()).toBe('Hello from widget-renderer');
    });
});
//# sourceMappingURL=index.spec.js.map