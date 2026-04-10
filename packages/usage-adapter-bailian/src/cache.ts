/**
 * File cache module for Bailian usage data
 *
 * Implements file-based cache with configurable TTL.
 * Cache location: ~/.coding-status/cache/provider-{name}.json
 * Per D-05~07: cache location, key format, and TTL management.
 */

import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Cache directory: ~/.coding-status/cache (D-05) */
export const CACHE_DIR = join(homedir(), '.coding-status', 'cache');

/** Default TTL: 300 seconds (5 minutes) */
const DEFAULT_TTL = 300;

/**
 * Cache entry structure (D-06, D-07)
 *
 * Contains createdAt timestamp for TTL validation
 * and usage data for all three dimensions.
 */
export interface CacheEntry {
    createdAt: number; // Unix timestamp (milliseconds)
    data: {
        '5h': number;
        week: number;
        month: number;
    };
}

/**
 * Get cache file path for a provider
 *
 * Format: ~/.coding-status/cache/provider-{name}.json (D-06)
 *
 * @param providerName - Provider name
 * @returns Full path to cache file
 */
export function getCachePath(providerName: string): string {
    return join(CACHE_DIR, `provider-${providerName}.json`);
}

/**
 * Load cache from disk with TTL validation
 *
 * Returns null if:
 * - Cache file doesn't exist
 * - JSON parsing fails
 * - Cache is expired (beyond TTL)
 *
 * @param providerName - Provider name
 * @param ttlSeconds - TTL in seconds (default: 300)
 * @returns Cache entry or null if unavailable/expired
 */
export async function loadCache(
    providerName: string,
    ttlSeconds: number = DEFAULT_TTL
): Promise<CacheEntry | null> {
    try {
        const path = getCachePath(providerName);
        const content = await readFile(path, 'utf-8');
        const cache = JSON.parse(content) as CacheEntry;

        // Check TTL: createdAt + ttlSeconds must be > now
        const expiresAt = cache.createdAt + ttlSeconds * 1000;
        if (Date.now() >= expiresAt) {
            return null; // Cache expired
        }

        return cache;
    } catch {
        // Silently fail - cache may not exist or be corrupted
        return null;
    }
}

/**
 * Save cache to disk
 *
 * Creates cache directory if needed.
 * Writes cache entry with createdAt timestamp.
 *
 * @param providerName - Provider name
 * @param data - Usage data for all dimensions
 */
export async function saveCache(providerName: string, data: CacheEntry['data']): Promise<void> {
    try {
        const cache: CacheEntry = {
            createdAt: Date.now(),
            data,
        };

        // Ensure directory exists
        await mkdir(CACHE_DIR, { recursive: true });

        // Write cache file
        const path = getCachePath(providerName);
        await writeFile(path, JSON.stringify(cache, null, 2), 'utf-8');
    } catch {
        // Silently fail - cache is not critical
    }
}

/**
 * Check if cache is valid (within TTL)
 *
 * @param cache - Cache entry to validate
 * @param ttlSeconds - TTL in seconds
 * @returns True if cache is valid
 */
export function isCacheValid(cache: CacheEntry | null, ttlSeconds: number): boolean {
    if (!cache) return false;

    // Check TTL: createdAt + ttlSeconds must be > now
    const expiresAt = cache.createdAt + ttlSeconds * 1000;
    return Date.now() < expiresAt;
}

/**
 * Clear cache file for a provider
 *
 * Silently fails if file doesn't exist.
 *
 * @param providerName - Provider name
 */
export async function clearCache(providerName: string): Promise<void> {
    try {
        const path = getCachePath(providerName);
        await unlink(path);
    } catch {
        // Silently fail - file may not exist
    }
}
