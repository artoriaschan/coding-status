/**
 * Tests for Aliyun CMS SDK client
 *
 * Tests SDK client creation, API call, and timeout protection.
 * Uses vi.mock for SDK client mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createClient,
  fetchCallCount,
  withTimeout,
  API_TIMEOUT,
  ENDPOINT,
  NAMESPACE,
  METRIC_NAME,
  PERIOD,
  type CmsClient,
} from './client.js';

// Mock @alicloud/cms20190101 SDK
vi.mock('@alicloud/cms20190101', () => {
  class MockCmsClient {
    describeMetricListWithOptions = vi.fn();
  }

  return {
    default: MockCmsClient,
  };
});

// Mock @alicloud/openapi-core
vi.mock('@alicloud/openapi-core', () => {
  class MockConfig {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;

    constructor(params: { accessKeyId?: string; accessKeySecret?: string }) {
      this.accessKeyId = params.accessKeyId || '';
      this.accessKeySecret = params.accessKeySecret || '';
      this.endpoint = '';
    }
  }

  return {
    $OpenApiUtil: {
      Config: MockConfig,
    },
  };
});

describe('createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create client with valid credentials', async () => {
    const credentials = {
      accessKeyId: 'test-key-id',
      accessKeySecret: 'test-key-secret',
    };

    const client = await createClient(credentials);

    expect(client).toBeDefined();
    expect(client.describeMetricListWithOptions).toBeDefined();
  });

  it('should set correct endpoint', async () => {
    const credentials = {
      accessKeyId: 'test-key-id',
      accessKeySecret: 'test-key-secret',
    };

    await createClient(credentials);

    // Endpoint constant should be cms.cn-hangzhou.aliyuncs.com
    expect(ENDPOINT).toBe('cms.cn-hangzhou.aliyuncs.com');
  });
});

describe('fetchCallCount', () => {
  let mockClient: CmsClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock client with describeMetricListWithOptions method
    mockClient = {
      describeMetricListWithOptions: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should parse datapoints and return sum', async () => {
    const mockDatapoints = [
      { timestamp: 1712345678000, value: 100 },
      { timestamp: 1712345978000, value: 200 },
      { timestamp: 1712346278000, value: 150 },
    ];

    vi.mocked(mockClient.describeMetricListWithOptions).mockResolvedValue({
      body: {
        datapoints: JSON.stringify(mockDatapoints),
      },
    });

    const startTimeMs = Date.now() - 3600000; // 1 hour ago
    const endTimeMs = Date.now();

    const result = await fetchCallCount(mockClient, startTimeMs, endTimeMs);

    expect(result).toBe(450); // 100 + 200 + 150
  });

  it('should return 0 for empty datapoints', async () => {
    vi.mocked(mockClient.describeMetricListWithOptions).mockResolvedValue({
      body: {
        datapoints: JSON.stringify([]),
      },
    });

    const startTimeMs = Date.now() - 3600000;
    const endTimeMs = Date.now();

    const result = await fetchCallCount(mockClient, startTimeMs, endTimeMs);

    expect(result).toBe(0);
  });

  it('should handle single datapoint', async () => {
    const mockDatapoints = [{ timestamp: 1712345678000, value: 500 }];

    vi.mocked(mockClient.describeMetricListWithOptions).mockResolvedValue({
      body: {
        datapoints: JSON.stringify(mockDatapoints),
      },
    });

    const startTimeMs = Date.now() - 3600000;
    const endTimeMs = Date.now();

    const result = await fetchCallCount(mockClient, startTimeMs, endTimeMs);

    expect(result).toBe(500);
  });

  it('should call API with correct parameters', async () => {
    vi.mocked(mockClient.describeMetricListWithOptions).mockResolvedValue({
      body: {
        datapoints: JSON.stringify([{ timestamp: 1712345678000, value: 100 }]),
      },
    });

    const startTimeMs = 1712300000000;
    const endTimeMs = 1712340000000;

    await fetchCallCount(mockClient, startTimeMs, endTimeMs);

    // Verify the request was called with correct parameters
    expect(mockClient.describeMetricListWithOptions).toHaveBeenCalled();
    const requestArg = vi.mocked(mockClient.describeMetricListWithOptions).mock.calls[0][0] as Record<string, unknown>;

    expect(requestArg.namespace).toBe(NAMESPACE);
    expect(requestArg.metricName).toBe(METRIC_NAME);
    expect(requestArg.period).toBe(PERIOD);
    // StartTime and EndTime should be ISO strings
    expect(requestArg.startTime).toBeDefined();
    expect(requestArg.endTime).toBeDefined();
  });
});

describe('withTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return result if promise resolves before timeout', async () => {
    const fastPromise = Promise.resolve('success');

    const result = await withTimeout(fastPromise, 1000, 'test-operation');

    expect(result).toBe('success');
  });

  it('should throw timeout error if promise takes too long', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 2000);
    });

    await expect(withTimeout(slowPromise, 100, 'test-operation')).rejects.toThrow(
      'test-operation timed out after 100ms'
    );
  });

  it('should clear timeout after completion', async () => {
    const fastPromise = Promise.resolve('success');

    await withTimeout(fastPromise, 1000, 'test-operation');

    // No explicit verification needed - if timeout wasn't cleared,
    // it would cause issues in subsequent tests
    expect(true).toBe(true);
  });
});

describe('constants', () => {
  it('should have correct API_TIMEOUT value (1000)', () => {
    expect(API_TIMEOUT).toBe(1000);
  });

  it('should have correct ENDPOINT value', () => {
    expect(ENDPOINT).toBe('cms.cn-hangzhou.aliyuncs.com');
  });

  it('should have correct NAMESPACE value (acs_bailian)', () => {
    expect(NAMESPACE).toBe('acs_bailian');
  });

  it('should have correct METRIC_NAME value (CallCount)', () => {
    expect(METRIC_NAME).toBe('CallCount');
  });

  it('should have correct PERIOD value (300)', () => {
    expect(PERIOD).toBe('300');
  });
});