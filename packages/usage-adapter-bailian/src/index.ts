/**
 * Bailian Usage Adapter Implementation
 *
 * Implements UsageAdapter interface for Aliyun Bailian provider.
 * Integrates client, dimensions, cache, and circuit breaker modules.
 *
 * Per D-11~13: credential validation, error message format.
 */

import type { UsageAdapter, UsageDimension } from '@coding-status/widget-renderer';
import { AdapterInitError } from '@coding-status/cli';
import { fetchQuotaInfo } from './client.js';
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
    credentials: { cookie: string; sec_token: string; region: string };
    cacheTtl: number;
}

// =============================================================================
// Private State
// =============================================================================

/** Adapter configuration (set after init) */
let config: BailianConfig | null = null;

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
 * Implements UsageAdapter interface for Aliyun Bailian quota metrics.
 * Uses queryCodingPlanInstanceInfoV2 console API via http-client.
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
        // Validate credential structure (per D-05)
        const cookie = credentials.cookie;
        const sec_token = credentials.sec_token;
        const region = credentials.region || 'cn-hangzhou';

        if (!cookie || cookie.trim() === '') {
            throw new AdapterInitError(
                '@coding-status/usage-adapter-bailian',
                'Missing cookie in credentials. Please copy your browser cookie from DevTools and update your config.'
            );
        }

        if (!sec_token || sec_token.trim() === '') {
            throw new AdapterInitError(
                '@coding-status/usage-adapter-bailian',
                'Missing sec_token in credentials. Please provide your sec_token value.'
            );
        }

        // Validate by calling the API (per D-09)
        try {
            await fetchQuotaInfo({ cookie, sec_token, region });
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'API validation failed';
            throw new AdapterInitError(
                '@coding-status/usage-adapter-bailian',
                `Cookie validation failed: ${reason}. Please re-copy your browser cookie from DevTools.`
            );
        }

        // Store configuration
        config = {
            providerName: PROVIDER_NAME,
            credentials: { cookie, sec_token, region },
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
        if (!config) {
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
        try {
            const quotaInfo = await fetchQuotaInfo(config.credentials);

            // Map dimension to quota field (per D-08: no aggregation needed)
            let usage: number;
            if (dimension === '5h') {
                usage = quotaInfo.per5HourUsedQuota;
            } else if (dimension === 'week') {
                usage = quotaInfo.perWeekUsedQuota;
            } else {
                usage = quotaInfo.perBillMonthUsedQuota;
            }

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
