/**
 * BailianAdapter integration tests
 *
 * Tests UsageAdapter implementation with mocked dependencies.
 * Updated for cookie/sec_token/region credential structure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { UsageAdapter, UsageDimension } from '@coding-status/widget-renderer';

import BailianAdapter from '../src/index.js';

// Mock all dependencies
vi.mock('../src/client.js', () => ({
    fetchQuotaInfo: vi.fn(),
    parseQuotaInfo: vi.fn(),
}));

vi.mock('../src/dimensions.js', () => ({
    DIMENSIONS: [
        { key: '5h', label: '5 Hours', description: 'Last 5 hours call count', category: 'usage' },
        { key: 'week', label: 'Weekly', description: 'Last 7 days call count', category: 'usage' },
        {
            key: 'month',
            label: 'Monthly',
            description: 'Last 30 days call count',
            category: 'usage',
        },
    ] as UsageDimension[],
    getTimeRange: vi.fn(),
    isValidDimension: vi.fn((dim: string) => ['5h', 'week', 'month'].includes(dim)),
}));

vi.mock('../src/cache.js', () => ({
    loadCache: vi.fn(),
    saveCache: vi.fn(),
    isCacheValid: vi.fn(),
}));

vi.mock('../src/circuit-breaker.js', () => ({
    getCircuitBreaker: vi.fn(),
}));

vi.mock('@coding-status/cli', () => ({
    AdapterInitError: class AdapterInitError extends Error {
        constructor(
            public readonly packageName: string,
            reason: string
        ) {
            super(`[${packageName}] Initialization failed: ${reason}`);
            this.name = 'AdapterInitError';
        }
    },
}));

describe('BailianAdapter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
    });

    // --- Basic Properties ---
    it('should have name "bailian"', () => {
        expect(BailianAdapter.name).toBe('bailian');
    });

    it('should have displayName "Aliyun Bailian"', () => {
        expect(BailianAdapter.displayName).toBe('Aliyun Bailian');
    });

    // --- Credential Validation ---
    it('should throw for missing cookie in init', async () => {
        const credentials = { cookie: '', sec_token: 'token', region: 'cn-hangzhou' };
        await expect(BailianAdapter.init(credentials)).rejects.toThrow();
    });

    it('should throw for missing sec_token in init', async () => {
        const credentials = { cookie: 'valid-cookie', sec_token: '', region: 'cn-hangzhou' };
        await expect(BailianAdapter.init(credentials)).rejects.toThrow();
    });

    it('should throw AdapterInitError for missing cookie', async () => {
        const { AdapterInitError } = await import('@coding-status/cli');
        const credentials = { cookie: '', sec_token: 'token', region: 'cn-hangzhou' };
        await expect(BailianAdapter.init(credentials)).rejects.toThrow(AdapterInitError);
    });

    it('should throw AdapterInitError for missing sec_token', async () => {
        const { AdapterInitError } = await import('@coding-status/cli');
        const credentials = { cookie: 'valid-cookie', sec_token: '', region: 'cn-hangzhou' };
        await expect(BailianAdapter.init(credentials)).rejects.toThrow(AdapterInitError);
    });

    it('should throw AdapterInitError when fetchQuotaInfo fails (cookie expired)', async () => {
        const { AdapterInitError } = await import('@coding-status/cli');
        const { fetchQuotaInfo } = await import('../src/client.js');

        vi.mocked(fetchQuotaInfo).mockRejectedValue(
            new Error('No coding plan instances found — cookie may have expired')
        );

        const credentials = { cookie: 'expired-cookie', sec_token: 'token', region: 'cn-hangzhou' };
        await expect(BailianAdapter.init(credentials)).rejects.toThrow(AdapterInitError);
    });

    it('should succeed when fetchQuotaInfo returns valid data', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });

        const credentials = { cookie: 'valid-cookie', sec_token: 'token', region: 'cn-hangzhou' };
        await expect(BailianAdapter.init(credentials)).resolves.not.toThrow();
        expect(fetchQuotaInfo).toHaveBeenCalledWith({
            cookie: 'valid-cookie',
            sec_token: 'token',
            region: 'cn-hangzhou',
        });
    });

    // --- Dimensions ---
    it('should return array with 5h, week, month dimensions', async () => {
        const dimensions = await BailianAdapter.getDimensions();

        expect(dimensions).toHaveLength(3);
        expect(dimensions.map(d => d.key)).toEqual(['5h', 'week', 'month']);
    });

    // --- getUsage ---
    it('should throw if getUsage called before init', async () => {
        await expect(BailianAdapter.getUsage('5h')).rejects.toThrow();
    });

    it('should throw for invalid dimension', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });

        const credentials = { cookie: 'valid-cookie', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        await expect(BailianAdapter.getUsage('invalid')).rejects.toThrow('Invalid dimension');
    });

    it('should return cached data if valid cache exists', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });
        vi.mocked(loadCache).mockResolvedValue({
            createdAt: Date.now(),
            data: { '5h': 500, week: 1000, month: 3000 },
        });
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('allow'),
            recordSuccess: vi.fn(),
            recordFailure: vi.fn(),
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        const usage = await BailianAdapter.getUsage('5h');
        expect(usage).toBe(500);
    });

    it('should fetch from API when cache is stale', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache, saveCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 200,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });
        vi.mocked(loadCache).mockResolvedValue(null);
        vi.mocked(saveCache).mockImplementation(() => Promise.resolve());
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('allow'),
            recordSuccess: vi.fn(),
            recordFailure: vi.fn(),
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        const usage = await BailianAdapter.getUsage('5h');
        expect(usage).toBe(200);
        expect(fetchQuotaInfo).toHaveBeenCalled();
    });

    it('should map week dimension to perWeekUsedQuota', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache, saveCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });
        vi.mocked(loadCache).mockResolvedValue(null);
        vi.mocked(saveCache).mockImplementation(() => Promise.resolve());
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('allow'),
            recordSuccess: vi.fn(),
            recordFailure: vi.fn(),
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        const usage = await BailianAdapter.getUsage('week');
        expect(usage).toBe(800);
    });

    it('should map month dimension to perBillMonthUsedQuota', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache, saveCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });
        vi.mocked(loadCache).mockResolvedValue(null);
        vi.mocked(saveCache).mockImplementation(() => Promise.resolve());
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('allow'),
            recordSuccess: vi.fn(),
            recordFailure: vi.fn(),
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        const usage = await BailianAdapter.getUsage('month');
        expect(usage).toBe(2000);
    });

    it('should record success on API success', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache, saveCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        const mockRecordSuccess = vi.fn();
        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });
        vi.mocked(loadCache).mockResolvedValue(null);
        vi.mocked(saveCache).mockImplementation(() => Promise.resolve());
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('allow'),
            recordSuccess: mockRecordSuccess,
            recordFailure: vi.fn(),
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        await BailianAdapter.getUsage('5h');
        expect(mockRecordSuccess).toHaveBeenCalledWith('bailian');
    });

    it('should record failure on API failure', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        const mockRecordFailure = vi.fn();
        vi.mocked(fetchQuotaInfo)
            .mockResolvedValueOnce({
                per5HourUsedQuota: 100,
                per5HourTotalQuota: 500,
                perWeekUsedQuota: 800,
                perWeekTotalQuota: 3500,
                perBillMonthUsedQuota: 2000,
                perBillMonthTotalQuota: 15000,
            })
            .mockRejectedValueOnce(new Error('API error'));
        vi.mocked(loadCache).mockResolvedValue(null);
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('allow'),
            recordSuccess: vi.fn(),
            recordFailure: mockRecordFailure,
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        await expect(BailianAdapter.getUsage('5h')).rejects.toThrow();
        expect(mockRecordFailure).toHaveBeenCalledWith('bailian');
    });

    it('should return stale cache when circuit breaker is open', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });
        vi.mocked(loadCache).mockResolvedValue({
            createdAt: Date.now() - 100000,
            data: { '5h': 600, week: 1200, month: 3600 },
        });
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('reject'),
            recordSuccess: vi.fn(),
            recordFailure: vi.fn(),
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        const usage = await BailianAdapter.getUsage('5h');
        expect(usage).toBe(600);
    });

    it('should throw when API fails and no cache available', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        const mockRecordFailure = vi.fn();
        vi.mocked(fetchQuotaInfo)
            .mockResolvedValueOnce({
                per5HourUsedQuota: 100,
                per5HourTotalQuota: 500,
                perWeekUsedQuota: 800,
                perWeekTotalQuota: 3500,
                perBillMonthUsedQuota: 2000,
                perBillMonthTotalQuota: 15000,
            })
            .mockRejectedValueOnce(new Error('API error'));
        vi.mocked(loadCache).mockResolvedValue(null);
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('allow'),
            recordSuccess: vi.fn(),
            recordFailure: mockRecordFailure,
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        await expect(BailianAdapter.getUsage('5h')).rejects.toThrow();
        expect(mockRecordFailure).toHaveBeenCalledWith('bailian');
    });

    it('should throw if no cache and circuit is open', async () => {
        const { fetchQuotaInfo } = await import('../src/client.js');
        const { loadCache } = await import('../src/cache.js');
        const { getCircuitBreaker } = await import('../src/circuit-breaker.js');

        vi.mocked(fetchQuotaInfo).mockResolvedValue({
            per5HourUsedQuota: 100,
            per5HourTotalQuota: 500,
            perWeekUsedQuota: 800,
            perWeekTotalQuota: 3500,
            perBillMonthUsedQuota: 2000,
            perBillMonthTotalQuota: 15000,
        });
        vi.mocked(loadCache).mockResolvedValue(null);
        vi.mocked(getCircuitBreaker).mockReturnValue({
            checkCircuit: vi.fn().mockReturnValue('reject'),
            recordSuccess: vi.fn(),
            recordFailure: vi.fn(),
            getProviderState: vi.fn(),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof getCircuitBreaker>);

        const credentials = { cookie: 'key', sec_token: 'token', region: 'cn-hangzhou' };
        await BailianAdapter.init(credentials);

        await expect(BailianAdapter.getUsage('5h')).rejects.toThrow('Circuit breaker open');
    });

    // --- Interface Compliance ---
    it('should implement UsageAdapter interface', () => {
        const adapter: UsageAdapter = BailianAdapter;
        expect(adapter.name).toBeDefined();
        expect(adapter.displayName).toBeDefined();
        expect(adapter.init).toBeDefined();
        expect(adapter.getDimensions).toBeDefined();
        expect(adapter.getUsage).toBeDefined();
    });

    it('should have async init method', async () => {
        expect(BailianAdapter.init).toBeInstanceOf(Function);
        const result = BailianAdapter.init({});
        expect(result).toBeInstanceOf(Promise);
        await result.catch(() => {});
    });

    it('should have async getDimensions method', async () => {
        expect(BailianAdapter.getDimensions).toBeInstanceOf(Function);
        const result = BailianAdapter.getDimensions();
        expect(result).toBeInstanceOf(Promise);
        const dimensions = await result;
        expect(dimensions).toHaveLength(3);
    });

    it('should have async getUsage method', async () => {
        expect(BailianAdapter.getUsage).toBeInstanceOf(Function);
        const result = BailianAdapter.getUsage('5h');
        expect(result).toBeInstanceOf(Promise);
        await result.catch(() => {});
    });

    // --- Default Export ---
    it('should be exported as default', () => {
        expect(BailianAdapter).toBeDefined();
        expect(BailianAdapter.name).toBe('bailian');
    });
});
