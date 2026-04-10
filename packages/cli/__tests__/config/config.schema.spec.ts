/**
 * Config schema tests
 *
 * Tests for ProviderSchema and ConfigSchema Zod validation.
 */

import { describe, it, expect } from 'vitest';
import { ProviderSchema, ConfigSchema } from '../../src/config/config.schema.js';

describe('ProviderSchema', () => {
    describe('valid provider validation', () => {
        it('should validate provider with name, type, packageName, credentials', () => {
            const validProvider = {
                name: 'my-bailian',
                type: 'bailian',
                packageName: '@coding-status/usage-adapter-bailian',
                credentials: {
                    accessKeyId: 'test-key-id',
                    accessKeySecret: 'test-secret',
                },
            };

            const result = ProviderSchema.safeParse(validProvider);
            expect(result.success).toBe(true);
        });
    });

    describe('invalid provider name', () => {
        it('should reject empty name', () => {
            const invalidProvider = {
                name: '',
                type: 'bailian',
                packageName: '@coding-status/usage-adapter-bailian',
                credentials: {},
            };

            const result = ProviderSchema.safeParse(invalidProvider);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Provider name is required');
            }
        });

        it('should reject name longer than 32 chars', () => {
            const invalidProvider = {
                name: 'this-is-a-very-long-provider-name-that-exceeds-32-characters',
                type: 'bailian',
                packageName: '@coding-status/usage-adapter-bailian',
                credentials: {},
            };

            const result = ProviderSchema.safeParse(invalidProvider);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    'Provider name too long (max 32 chars)'
                );
            }
        });
    });
});

describe('ConfigSchema', () => {
    describe('valid config validation', () => {
        it('should validate config with providers array, current, cacheTtl', () => {
            const validConfig = {
                providers: [
                    {
                        name: 'my-bailian',
                        type: 'bailian',
                        packageName: '@coding-status/usage-adapter-bailian',
                        credentials: {
                            accessKeyId: 'test-key',
                            accessKeySecret: 'test-secret',
                        },
                    },
                ],
                current: 'my-bailian',
                cacheTtl: 300,
            };

            const result = ConfigSchema.safeParse(validConfig);
            expect(result.success).toBe(true);
        });
    });

    describe('default values', () => {
        it('should apply default cacheTtl of 300 when not specified', () => {
            const configWithoutCacheTtl = {
                providers: [],
            };

            const result = ConfigSchema.parse(configWithoutCacheTtl);
            expect(result.cacheTtl).toBe(300);
        });

        it('should default providers to empty array', () => {
            const emptyConfig = {};

            const result = ConfigSchema.parse(emptyConfig);
            expect(result.providers).toEqual([]);
        });
    });

    describe('invalid provider type', () => {
        it('should reject invalid provider type (not bailian)', () => {
            const invalidConfig = {
                providers: [
                    {
                        name: 'my-provider',
                        type: 'invalid-type',
                        packageName: '@coding-status/some-adapter',
                        credentials: {},
                    },
                ],
            };

            const result = ConfigSchema.safeParse(invalidConfig);
            expect(result.success).toBe(false);
        });
    });
});
