/**
 * Aliyun CMS SDK client for Bailian CallCount metrics
 *
 * Provides SDK client setup, DescribeMetricList API call,
 * and timeout protection for Bailian adapter.
 */

import { $OpenApiUtil } from '@alicloud/openapi-core';

// =============================================================================
// Constants (per D-01~03)
// =============================================================================

/** API timeout in milliseconds */
export const API_TIMEOUT = 1000;

/** CloudMonitor endpoint */
export const ENDPOINT = 'cms.cn-hangzhou.aliyuncs.com';

/** Bailian namespace (per D-01) */
export const NAMESPACE = 'acs_bailian';

/** CallCount metric name (per D-02) */
export const METRIC_NAME = 'CallCount';

/** Sampling period in seconds (per D-03) */
export const PERIOD = '300';

// =============================================================================
// Types
// =============================================================================

/**
 * DescribeMetricList response datapoint structure
 */
interface Datapoint {
  timestamp: number;
  value: number;
}

/**
 * DescribeMetricList response body structure
 */
interface DescribeMetricListResponseBody {
  datapoints: string;
}

/**
 * DescribeMetricList response structure
 */
interface DescribeMetricListResponse {
  body: DescribeMetricListResponseBody;
}

/**
 * SDK client type
 *
 * Defined as interface to work around CommonJS/ESM interop issues.
 */
export interface CmsClient {
  describeMetricListWithOptions(
    request: unknown,
    runtime: unknown
  ): Promise<DescribeMetricListResponse>;
}

// =============================================================================
// Client Functions
// =============================================================================

/**
 * Create Aliyun CMS SDK client with credentials
 *
 * Uses dynamic import to work around CommonJS/ESM interop issues.
 *
 * @param credentials - Aliyun access key credentials
 * @returns CMS SDK client instance
 */
export async function createClient(credentials: {
  accessKeyId: string;
  accessKeySecret: string;
}): Promise<CmsClient> {
  // Dynamic import to handle CommonJS SDK
  const CmsModule = await import('@alicloud/cms20190101');

  const config = new $OpenApiUtil.Config({
    accessKeyId: credentials.accessKeyId,
    accessKeySecret: credentials.accessKeySecret,
  });

  config.endpoint = ENDPOINT;

  // Use unknown cast to work around TypeScript CommonJS/ESM interop
  const ClientConstructor = (CmsModule as unknown as { default: new (config: unknown) => CmsClient }).default;
  return new ClientConstructor(config);
}

/**
 * Fetch CallCount metric from DescribeMetricList API
 *
 * @param client - CMS SDK client
 * @param startTimeMs - Start time in milliseconds
 * @param endTimeMs - End time in milliseconds
 * @returns Total call count for the time range
 */
export async function fetchCallCount(
  client: CmsClient,
  startTimeMs: number,
  endTimeMs: number
): Promise<number> {
  const request = {
    namespace: NAMESPACE,
    metricName: METRIC_NAME,
    period: PERIOD,
    startTime: new Date(startTimeMs).toISOString(),
    endTime: new Date(endTimeMs).toISOString(),
  };

  const response = await client.describeMetricListWithOptions(request, {});

  // Parse datapoints JSON
  const datapoints = JSON.parse(response.body.datapoints) as Datapoint[];

  // Aggregate: sum all datapoint values
  return datapoints.reduce((sum, dp) => sum + dp.value, 0);
}

/**
 * Timeout wrapper for API calls
 *
 * Uses AbortController pattern for timeout protection.
 * Returns Promise.race between original promise and timeout rejection.
 *
 * @param promise - Promise to wrap with timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @param operation - Operation name for error message
 * @returns Result of the promise or timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      });
    }),
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}