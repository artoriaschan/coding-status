/**
 * Cache module tests
 *
 * Tests for file-based cache operations with TTL validation.
 * Uses mocked fs/promises to avoid real file operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
    loadCache,
    saveCache,
    getCachePath,
    isCacheValid,
    clearCache,
    CACHE_DIR,
    type CacheEntry,
} from '../src/cache.js';

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
}));

describe('cache', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('CACHE_DIR', () => {
        it('should point to ~/.coding-status/cache directory', () => {
            expect(CACHE_DIR).toBe(join(homedir(), '.coding-status', 'cache'));
        });
    });

    describe('getCachePath', () => {
        it('should return correct path format (provider-{name}.json)', () => {
            const path = getCachePath('bailian');
            expect(path).toBe(join(CACHE_DIR, 'provider-bailian.json'));
        });

        it('should include .coding-status/cache directory', () => {
            const path = getCachePath('my-provider');
            expect(path).toContain('.coding-status');
            expect(path).toContain('cache');
        });
    });

    describe('loadCache', () => {
        it('should load valid cache from disk', async () => {
            const validCache: CacheEntry = {
                createdAt: Date.now() - 100000, // Within TTL
                data: {
                    '5h': 100,
                    week: 500,
                    month: 2000,
                },
            };

            vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(validCache));

            const cache = await loadCache('bailian', 300);

            expect(cache).toEqual(validCache);
            expect(readFile).toHaveBeenCalledWith(getCachePath('bailian'), 'utf-8');
        });

        it('should return null if cache file does not exist', async () => {
            vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'));

            const cache = await loadCache('bailian', 300);

            expect(cache).toBeNull();
        });

        it('should return null if file read fails', async () => {
            vi.mocked(readFile).mockRejectedValueOnce(new Error('Permission denied'));

            const cache = await loadCache('bailian', 300);

            expect(cache).toBeNull();
        });

        it('should return null if JSON parsing fails', async () => {
            vi.mocked(readFile).mockResolvedValueOnce('not valid json {{{');

            const cache = await loadCache('bailian', 300);

            expect(cache).toBeNull();
        });

        it('should return null if cache is expired (beyond TTL)', async () => {
            const expiredCache: CacheEntry = {
                createdAt: Date.now() - 400000, // Beyond 300 second TTL
                data: {
                    '5h': 100,
                    week: 500,
                    month: 2000,
                },
            };

            vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(expiredCache));

            const cache = await loadCache('bailian', 300);

            expect(cache).toBeNull();
        });

        it('should return valid cache if within TTL', async () => {
            const validCache: CacheEntry = {
                createdAt: Date.now() - 200000, // Within 300 second TTL (200 < 300)
                data: {
                    '5h': 100,
                    week: 500,
                    month: 2000,
                },
            };

            vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(validCache));

            const cache = await loadCache('bailian', 300);

            expect(cache).toEqual(validCache);
        });

        it('should use default TTL (300 seconds) if not specified', async () => {
            const validCache: CacheEntry = {
                createdAt: Date.now() - 100000,
                data: {
                    '5h': 100,
                    week: 500,
                    month: 2000,
                },
            };

            vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(validCache));

            // Call without TTL parameter
            const cache = await loadCache('bailian');

            expect(cache).toEqual(validCache);
        });
    });

    describe('saveCache', () => {
        it('should save cache with createdAt timestamp', async () => {
            vi.mocked(mkdir).mockResolvedValueOnce(undefined);
            vi.mocked(writeFile).mockResolvedValueOnce(undefined);

            const data = {
                '5h': 100,
                week: 500,
                month: 2000,
            };

            await saveCache('bailian', data);

            const writeFileCall = vi.mocked(writeFile).mock.calls[0];
            const writtenContent = JSON.parse(writeFileCall[1] as string);

            expect(writtenContent.createdAt).toBeDefined();
            expect(typeof writtenContent.createdAt).toBe('number');
            expect(writtenContent.data).toEqual(data);
        });

        it('should create directory if it does not exist', async () => {
            vi.mocked(mkdir).mockResolvedValueOnce(undefined);
            vi.mocked(writeFile).mockResolvedValueOnce(undefined);

            await saveCache('bailian', { '5h': 100, week: 500, month: 2000 });

            expect(mkdir).toHaveBeenCalledWith(CACHE_DIR, { recursive: true });
        });

        it('should write valid JSON format', async () => {
            vi.mocked(mkdir).mockResolvedValueOnce(undefined);
            vi.mocked(writeFile).mockResolvedValueOnce(undefined);

            const data = {
                '5h': 100,
                week: 500,
                month: 2000,
            };

            await saveCache('bailian', data);

            const writeFileCall = vi.mocked(writeFile).mock.calls[0];
            const path = writeFileCall[0] as string;
            const content = writeFileCall[1] as string;

            expect(path).toBe(getCachePath('bailian'));
            expect(JSON.parse(content)).toBeDefined();
            expect(content).toContain('"createdAt"');
            expect(content).toContain('"data"');
        });

        it('should silently fail if directory creation fails', async () => {
            vi.mocked(mkdir).mockRejectedValueOnce(new Error('Permission denied'));

            // Should not throw
            await saveCache('bailian', { '5h': 100, week: 500, month: 2000 });

            // writeFile should not be called since mkdir failed
            expect(writeFile).not.toHaveBeenCalled();
        });

        it('should silently fail if file write fails', async () => {
            vi.mocked(mkdir).mockResolvedValueOnce(undefined);
            vi.mocked(writeFile).mockRejectedValueOnce(new Error('Disk full'));

            // Should not throw
            await saveCache('bailian', { '5h': 100, week: 500, month: 2000 });
        });
    });

    describe('isCacheValid', () => {
        it('should return false for null cache', () => {
            expect(isCacheValid(null, 300)).toBe(false);
        });

        it('should return true for fresh cache (within TTL)', () => {
            const freshCache: CacheEntry = {
                createdAt: Date.now() - 100000, // 100 seconds ago, within 300 TTL
                data: { '5h': 100, week: 500, month: 2000 },
            };

            expect(isCacheValid(freshCache, 300)).toBe(true);
        });

        it('should return false for stale cache (beyond TTL)', () => {
            const staleCache: CacheEntry = {
                createdAt: Date.now() - 400000, // 400 seconds ago, beyond 300 TTL
                data: { '5h': 100, week: 500, month: 2000 },
            };

            expect(isCacheValid(staleCache, 300)).toBe(false);
        });

        it('should return false at exact TTL boundary', () => {
            const boundaryCache: CacheEntry = {
                createdAt: Date.now() - 300000, // Exactly 300 seconds ago
                data: { '5h': 100, week: 500, month: 2000 },
            };

            // At boundary, cache is stale (not < TTL, but == TTL)
            expect(isCacheValid(boundaryCache, 300)).toBe(false);
        });

        it('should handle zero TTL', () => {
            const cache: CacheEntry = {
                createdAt: Date.now(),
                data: { '5h': 100, week: 500, month: 2000 },
            };

            expect(isCacheValid(cache, 0)).toBe(false);
        });
    });

    describe('clearCache', () => {
        it('should delete cache file', async () => {
            vi.mocked(unlink).mockResolvedValueOnce(undefined);

            await clearCache('bailian');

            expect(unlink).toHaveBeenCalledWith(getCachePath('bailian'));
        });

        it('should silently fail if file does not exist', async () => {
            vi.mocked(unlink).mockRejectedValueOnce(new Error('ENOENT'));

            // Should not throw
            await clearCache('bailian');
        });
    });
});
