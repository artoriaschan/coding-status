/**
 * BailianAdapter integration tests
 *
 * Tests UsageAdapter implementation with mocked dependencies.
 * TDD Task 1: RED phase - failing tests for BailianAdapter behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { UsageAdapter, UsageDimension } from '@cdps/widget-renderer';

import BailianAdapter from './index.js';

// Mock all dependencies
vi.mock('./client.js', () => ({
  createClient: vi.fn(),
  fetchCallCount: vi.fn(),
  withTimeout: vi.fn(),
  API_TIMEOUT: 1000,
}));

vi.mock('./dimensions.js', () => ({
  DIMENSIONS: [
    { key: '5h', label: '5 Hours', description: 'Last 5 hours call count', category: 'usage' },
    { key: 'week', label: 'Weekly', description: 'Last 7 days call count', category: 'usage' },
    { key: 'month', label: 'Monthly', description: 'Last 30 days call count', category: 'usage' },
  ] as UsageDimension[],
  getTimeRange: vi.fn(),
  isValidDimension: vi.fn((dim: string) => ['5h', 'week', 'month'].includes(dim)),
}));

vi.mock('./cache.js', () => ({
  loadCache: vi.fn(),
  saveCache: vi.fn(),
  isCacheValid: vi.fn(),
}));

vi.mock('./circuit-breaker.js', () => ({
  getCircuitBreaker: vi.fn(),
}));

vi.mock('@cdps/core', () => ({
  AdapterInitError: class AdapterInitError extends Error {
    constructor(public readonly packageName: string, reason: string) {
      super(`[${packageName}] Initialization failed: ${reason}`);
      this.name = 'AdapterInitError';
    }
  },
}));

describe('BailianAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: BailianAdapter.name === 'bailian'
  it('should have name "bailian"', () => {
    expect(BailianAdapter.name).toBe('bailian');
  });

  // Test 2: BailianAdapter.displayName === 'Aliyun Bailian'
  it('should have displayName "Aliyun Bailian"', () => {
    expect(BailianAdapter.displayName).toBe('Aliyun Bailian');
  });

  // Test 3: init() throws for missing accessKeyId
  it('should throw for missing accessKeyId in init', async () => {
    const credentials = { accessKeyId: '', accessKeySecret: 'secret' };
    await expect(BailianAdapter.init(credentials)).rejects.toThrow();
  });

  // Test 4: init() throws for missing accessKeySecret
  it('should throw for missing accessKeySecret in init', async () => {
    const credentials = { accessKeyId: 'key', accessKeySecret: '' };
    await expect(BailianAdapter.init(credentials)).rejects.toThrow();
  });

  // Test 5: init() creates client and validates credentials
  it('should create client and validate credentials on successful init', async () => {
    const { createClient, fetchCallCount, withTimeout } = await import('./client.js');
    const mockClient = { describeMetricListWithOptions: vi.fn() };

    vi.mocked(createClient).mockResolvedValue(mockClient);
    vi.mocked(fetchCallCount).mockResolvedValue(100);
    vi.mocked(withTimeout).mockImplementation((p) => p);

    const credentials = { accessKeyId: 'valid-key', accessKeySecret: 'valid-secret' };
    await BailianAdapter.init(credentials);

    expect(createClient).toHaveBeenCalledWith(credentials);
    expect(fetchCallCount).toHaveBeenCalled();
  });

  // Test 6: getDimensions() returns array with 5h, week, month
  it('should return array with 5h, week, month dimensions', async () => {
    const dimensions = await BailianAdapter.getDimensions();

    expect(dimensions).toHaveLength(3);
    expect(dimensions.map((d) => d.key)).toEqual(['5h', 'week', 'month']);
  });

  // Test 7: getUsage() throws if not initialized
  it('should throw if getUsage called before init', async () => {
    await expect(BailianAdapter.getUsage('5h')).rejects.toThrow();
  });

  // Test 8: getUsage() returns cached data if valid
  it('should return cached data if valid cache exists', async () => {
    const { createClient, fetchCallCount, withTimeout } = await import('./client.js');
    const { loadCache } = await import('./cache.js');
    const { getCircuitBreaker } = await import('./circuit-breaker.js');

    const mockClient = { describeMetricListWithOptions: vi.fn() };
    vi.mocked(createClient).mockResolvedValue(mockClient);
    vi.mocked(fetchCallCount).mockResolvedValue(100);
    vi.mocked(withTimeout).mockImplementation((p) => p);
    vi.mocked(loadCache).mockResolvedValue({
      createdAt: Date.now(),
      data: { '5h': 500, 'week': 1000, 'month': 3000 },
    });
    vi.mocked(getCircuitBreaker).mockReturnValue({
      checkCircuit: vi.fn().mockReturnValue('allow'),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getProviderState: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof getCircuitBreaker>);

    const credentials = { accessKeyId: 'key', accessKeySecret: 'secret' };
    await BailianAdapter.init(credentials);

    const usage = await BailianAdapter.getUsage('5h');
    expect(usage).toBe(500);
  });

  // Test 9: getUsage() fetches from API when cache stale
  it('should fetch from API when cache is stale', async () => {
    const { createClient, fetchCallCount, withTimeout } = await import('./client.js');
    const { loadCache, saveCache } = await import('./cache.js');
    const { getCircuitBreaker } = await import('./circuit-breaker.js');
    const { getTimeRange } = await import('./dimensions.js');

    const mockClient = { describeMetricListWithOptions: vi.fn() };
    vi.mocked(createClient).mockResolvedValue(mockClient);
    vi.mocked(fetchCallCount).mockResolvedValue(200);
    vi.mocked(withTimeout).mockImplementation((p) => p);
    vi.mocked(loadCache).mockResolvedValue(null); // No cache
    vi.mocked(saveCache).mockImplementation(() => Promise.resolve());
    vi.mocked(getCircuitBreaker).mockReturnValue({
      checkCircuit: vi.fn().mockReturnValue('allow'),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getProviderState: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof getCircuitBreaker>);
    vi.mocked(getTimeRange).mockReturnValue({ startTimeMs: 1000, endTimeMs: 2000 });

    const credentials = { accessKeyId: 'key', accessKeySecret: 'secret' };
    await BailianAdapter.init(credentials);

    const usage = await BailianAdapter.getUsage('5h');
    expect(usage).toBe(200);
    expect(fetchCallCount).toHaveBeenCalled();
  });

  // Test 10: getUsage() updates cache after API success
  it('should update cache after successful API call', async () => {
    const { createClient, fetchCallCount, withTimeout } = await import('./client.js');
    const { loadCache, saveCache } = await import('./cache.js');
    const { getCircuitBreaker } = await import('./circuit-breaker.js');
    const { getTimeRange } = await import('./dimensions.js');

    const mockClient = { describeMetricListWithOptions: vi.fn() };
    vi.mocked(createClient).mockResolvedValue(mockClient);
    vi.mocked(fetchCallCount).mockResolvedValue(300);
    vi.mocked(withTimeout).mockImplementation((p) => p);
    vi.mocked(loadCache).mockResolvedValue(null);
    vi.mocked(saveCache).mockImplementation(() => Promise.resolve());
    vi.mocked(getCircuitBreaker).mockReturnValue({
      checkCircuit: vi.fn().mockReturnValue('allow'),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getProviderState: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof getCircuitBreaker>);
    vi.mocked(getTimeRange).mockReturnValue({ startTimeMs: 1000, endTimeMs: 2000 });

    const credentials = { accessKeyId: 'key', accessKeySecret: 'secret' };
    await BailianAdapter.init(credentials);

    await BailianAdapter.getUsage('5h');
    expect(saveCache).toHaveBeenCalled();
  });

  // Test 11: getUsage() records success on API success
  it('should record success on API success', async () => {
    const { createClient, fetchCallCount, withTimeout } = await import('./client.js');
    const { loadCache, saveCache } = await import('./cache.js');
    const { getCircuitBreaker } = await import('./circuit-breaker.js');
    const { getTimeRange } = await import('./dimensions.js');

    const mockRecordSuccess = vi.fn();
    const mockClient = { describeMetricListWithOptions: vi.fn() };
    vi.mocked(createClient).mockResolvedValue(mockClient);
    vi.mocked(fetchCallCount).mockResolvedValue(400);
    vi.mocked(withTimeout).mockImplementation((p) => p);
    vi.mocked(loadCache).mockResolvedValue(null);
    vi.mocked(saveCache).mockImplementation(() => Promise.resolve());
    vi.mocked(getCircuitBreaker).mockReturnValue({
      checkCircuit: vi.fn().mockReturnValue('allow'),
      recordSuccess: mockRecordSuccess,
      recordFailure: vi.fn(),
      getProviderState: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof getCircuitBreaker>);
    vi.mocked(getTimeRange).mockReturnValue({ startTimeMs: 1000, endTimeMs: 2000 });

    const credentials = { accessKeyId: 'key', accessKeySecret: 'secret' };
    await BailianAdapter.init(credentials);

    await BailianAdapter.getUsage('5h');
    expect(mockRecordSuccess).toHaveBeenCalledWith('bailian');
  });

  // Test 12: getUsage() records failure on API failure
  it('should record failure on API failure', async () => {
    const { createClient, fetchCallCount, withTimeout } = await import('./client.js');
    const { loadCache } = await import('./cache.js');
    const { getCircuitBreaker } = await import('./circuit-breaker.js');
    const { getTimeRange } = await import('./dimensions.js');

    const mockRecordFailure = vi.fn();
    const mockClient = { describeMetricListWithOptions: vi.fn() };
    vi.mocked(createClient).mockResolvedValue(mockClient);
    // First call (init) succeeds, second call (getUsage) fails
    vi.mocked(fetchCallCount)
      .mockResolvedValueOnce(100) // For init credential validation
      .mockRejectedValueOnce(new Error('API error')); // For getUsage
    vi.mocked(withTimeout).mockImplementation((p) => p);
    vi.mocked(loadCache).mockResolvedValue(null);
    vi.mocked(getCircuitBreaker).mockReturnValue({
      checkCircuit: vi.fn().mockReturnValue('allow'),
      recordSuccess: vi.fn(),
      recordFailure: mockRecordFailure,
      getProviderState: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof getCircuitBreaker>);
    vi.mocked(getTimeRange).mockReturnValue({ startTimeMs: 1000, endTimeMs: 2000 });

    const credentials = { accessKeyId: 'key', accessKeySecret: 'secret' };
    await BailianAdapter.init(credentials);

    await expect(BailianAdapter.getUsage('5h')).rejects.toThrow();
    expect(mockRecordFailure).toHaveBeenCalledWith('bailian');
  });

  // Test 13: getUsage() returns stale cache when circuit open
  it('should return stale cache when circuit breaker is open', async () => {
    const { createClient, fetchCallCount, withTimeout } = await import('./client.js');
    const { loadCache } = await import('./cache.js');
    const { getCircuitBreaker } = await import('./circuit-breaker.js');

    const mockClient = { describeMetricListWithOptions: vi.fn() };
    vi.mocked(createClient).mockResolvedValue(mockClient);
    vi.mocked(fetchCallCount).mockResolvedValue(100);
    vi.mocked(withTimeout).mockImplementation((p) => p);
    vi.mocked(loadCache).mockResolvedValue({
      createdAt: Date.now() - 100000, // Stale cache
      data: { '5h': 600, 'week': 1200, 'month': 3600 },
    });
    vi.mocked(getCircuitBreaker).mockReturnValue({
      checkCircuit: vi.fn().mockReturnValue('reject'),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getProviderState: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof getCircuitBreaker>);

    const credentials = { accessKeyId: 'key', accessKeySecret: 'secret' };
    await BailianAdapter.init(credentials);

    const usage = await BailianAdapter.getUsage('5h');
    expect(usage).toBe(600);
  });

  // Interface compliance tests
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
    // init({}) will reject due to missing credentials, but we just verify it returns a Promise
    const result = BailianAdapter.init({});
    expect(result).toBeInstanceOf(Promise);
    // Catch the rejection to prevent unhandled error
    await result.catch(() => {});
  });

  it('should have async getDimensions method', () => {
    expect(BailianAdapter.getDimensions).toBeInstanceOf(Function);
    const result = BailianAdapter.getDimensions();
    expect(result).toBeInstanceOf(Promise);
  });

  it('should have async getUsage method', async () => {
    expect(BailianAdapter.getUsage).toBeInstanceOf(Function);
    // getUsage will reject since not initialized, catch to prevent unhandled error
    const result = BailianAdapter.getUsage('5h');
    expect(result).toBeInstanceOf(Promise);
    await result.catch(() => {});
  });
});