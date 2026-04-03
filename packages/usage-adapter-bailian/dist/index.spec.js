import { describe, it, expect } from 'vitest';
import { hello, version } from './index.js';
describe('usage-adapter-bailian', () => {
    it('should export version', () => {
        expect(version).toBe('0.0.1');
    });
    it('should say hello', () => {
        expect(hello()).toBe('Hello from bailian adapter');
    });
});
//# sourceMappingURL=index.spec.js.map