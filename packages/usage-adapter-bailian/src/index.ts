/**
 * Bailian Usage Adapter Implementation
 *
 * Implements UsageAdapter interface for Aliyun Bailian provider.
 * Integrates client, dimensions, cache, and circuit breaker modules.
 *
 * Per D-11~13: credential validation, error message format.
 */

import type { UsageAdapter, UsageDimension } from '@cdps/widget-renderer';
import { AdapterInitError } from '@cdps/core';
import { createClient, fetchCallCount, withTimeout, API_TIMEOUT } from './client.js';
import { DIMENSIONS, getTimeRange, isValidDimension } from './dimensions.js';
import { loadCache, saveCache } from './cache.js';
import { getCircuitBreaker } from './circuit-breaker.js';

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Bailian adapter configuration
 */
interface BailianConfig {
    providerName: string;
    credentials: { accessKeyId: string; accessKeySecret: string };
    cacheTtl: number;
}

// =============================================================================
// Private State
// =============================================================================

/** Adapter configuration (set after init) */
let config: BailianConfig | null = null;

/** SDK client instance (set after init) */
let client: Awaited<ReturnType<typeof createClient>> | null = null;

/** Provider name for cache and circuit breaker */
const PROVIDER_NAME = 'bailian';

/** Default cache TTL in seconds */
const DEFAULT_CACHE_TTL = 300;

// =============================================================================
// BailianAdapter Implementation
// =============================================================================

/**
 * Bailian Usage Adapter
 *
 * Implements UsageAdapter interface for Aliyun Bailian CallCount metrics.
 * Uses DescribeMetricList API to fetch usage data.
 */
export const BailianAdapter: UsageAdapter = {
    // Per D-12: name is 'bailian'
    name: 'bailian',

    // Per D-12: displayName is 'Aliyun Bailian'
    displayName: 'Aliyun Bailian',

    /**
     * Initialize adapter with credentials
     *
     * Validates credential structure and verifies API connectivity.
     * Per D-11: calls DescribeMetricList to validate credentials (query last 1 hour).
     * Per D-13: throws AdapterInitError with structured message on failure.
     *
     * @param credentials - Provider credentials (accessKeyId, accessKeySecret)
     * @throws AdapterInitError if validation fails
     */
    async init(credentials: Record<string, string>): Promise<void> {
        // Validate credential structure (per D-12)
        const accessKeyId = credentials.accessKeyId;
        const accessKeySecret = credentials.accessKeySecret;

        if (!accessKeyId || accessKeyId.trim() === '') {
            throw new AdapterInitError(
                '@cdps/usage-adapter-bailian',
                'Missing accessKeyId in credentials'
            );
        }

        if (!accessKeySecret || accessKeySecret.trim() === '') {
            throw new AdapterInitError(
                '@cdps/usage-adapter-bailian',
                'Missing accessKeySecret in credentials'
            );
        }

        // Create SDK client
        try {
            client = await createClient({ accessKeyId, accessKeySecret });
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'Client creation failed';
            throw new AdapterInitError(
                '@cdps/usage-adapter-bailian',
                `Failed to create SDK client: ${reason}`
            );
        }

        // Validate credentials by querying last 1 hour (per D-11)
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        try {
            await withTimeout(
                fetchCallCount(client, oneHourAgo, now),
                API_TIMEOUT,
                'Credential validation'
            );
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'API validation failed';
            throw new AdapterInitError(
                '@cdps/usage-adapter-bailian',
                `Credential validation failed: ${reason}`
            );
        }

        // Store configuration
        config = {
            providerName: PROVIDER_NAME,
            credentials: { accessKeyId, accessKeySecret },
            cacheTtl: DEFAULT_CACHE_TTL,
        };
    },

    /**
     * Get available usage dimensions
     *
     * Returns 5h, week, month dimensions per D-04.
     *
     * @returns Array of UsageDimension objects
     */
    async getDimensions(): Promise<UsageDimension[]> {
        return DIMENSIONS;
    },

    /**
     * Fetch usage value for a dimension
     *
     * Integrates cache and circuit breaker for resilient API calls.
     * Per D-05~07: cache check, TTL validation, stale cache fallback.
     * Per D-08~10: circuit breaker protection, failure recording.
     *
     * @param dimension - Dimension key (5h, week, month)
     * @returns Usage value (CallCount sum)
     * @throws Error if not initialized or dimension invalid
     */
    async getUsage(dimension: string): Promise<number> {
        // Check initialized
        if (!config || !client) {
            throw new Error('BailianAdapter not initialized. Call init() first.');
        }

        // Validate dimension
        if (!isValidDimension(dimension)) {
            throw new Error(`Invalid dimension: ${dimension}`);
        }

        // Get circuit breaker
        const circuitBreaker = getCircuitBreaker();

        // Check cache
        const cacheEntry = await loadCache(config.providerName, config.cacheTtl);

        // Check circuit breaker state
        const circuitState = circuitBreaker.checkCircuit(config.providerName);

        // If circuit is open, return stale cache if available
        if (circuitState === 'reject') {
            if (
                cacheEntry &&
                cacheEntry.data[dimension as keyof typeof cacheEntry.data] !== undefined
            ) {
                // Return stale cache when circuit is open
                return cacheEntry.data[dimension as keyof typeof cacheEntry.data];
            }
            // No cache available, circuit open - throw error
            throw new Error(
                `Circuit breaker open for ${config.providerName}, no cached data available`
            );
        }

        // If cache is valid, return cached data
        if (
            cacheEntry &&
            cacheEntry.data[dimension as keyof typeof cacheEntry.data] !== undefined
        ) {
            return cacheEntry.data[dimension as keyof typeof cacheEntry.data];
        }

        // Fetch from API
        const { startTimeMs, endTimeMs } = getTimeRange(dimension);

        try {
            const usage = await withTimeout(
                fetchCallCount(client, startTimeMs, endTimeMs),
                API_TIMEOUT,
                `Fetch ${dimension} usage`
            );

            // Record success
            circuitBreaker.recordSuccess(config.providerName);

            // Update cache
            const newData = {
                ...(cacheEntry?.data ?? { '5h': 0, week: 0, month: 0 }),
                [dimension]: usage,
            };
            await saveCache(config.providerName, newData);

            return usage;
        } catch (error) {
            // Record failure
            circuitBreaker.recordFailure(config.providerName);

            // Return stale cache if available
            if (
                cacheEntry &&
                cacheEntry.data[dimension as keyof typeof cacheEntry.data] !== undefined
            ) {
                return cacheEntry.data[dimension as keyof typeof cacheEntry.data];
            }

            // No cache, throw error
            const reason = error instanceof Error ? error.message : 'API call failed';
            throw new Error(`Failed to fetch ${dimension} usage: ${reason}`);
        }
    },
};

// =============================================================================
// Default Export (for AdapterLoader)
// =============================================================================

export default BailianAdapter;
