/**
 * HTTP client type definitions
 *
 * Defines authentication options, request parameters, and response types
 * for the @coding-status/http-client package.
 */

// =============================================================================
// Authentication Options
// =============================================================================

/**
 * Authentication configuration for HTTP requests
 *
 * Per D-03: Set at HttpClient constructor level, auto-applied to all requests.
 * - cookie: Sets `Cookie: ${value}` header
 * - bearer: Sets `Authorization: Bearer ${value}` header
 */
export type AuthOptions =
    | { type: 'cookie'; value: string }
    | { type: 'bearer'; value: string };

// =============================================================================
// Request Options
// =============================================================================

/**
 * Options for a single HTTP request
 *
 * Per D-01: undici-style API -- client.request({ url, method, timeout, body })
 */
export interface HttpRequestOptions {
    /** Request URL (required) */
    url: string;

    /** HTTP method (default: 'GET') */
    method?: string;

    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;

    /** Maximum retry count on 5xx/network errors (default: 3, set 0 to disable) */
    retry?: number;

    /** Authentication credentials -- auto-injected into request headers */
    auth?: AuthOptions;

    /** Request body -- serialized as JSON if provided */
    body?: unknown;

    /** Raw body string — bypasses JSON serialization when set */
    rawBody?: string;

    /** Additional headers -- merged with auth headers */
    headers?: Record<string, string>;
}

// =============================================================================
// Response
// =============================================================================

/**
 * HTTP response with parsed data
 *
 * Returns { status, data } tuple. Body is auto-parsed as JSON.
 * Non-2xx responses throw HttpError (not returned).
 */
export interface HttpResponse<T = unknown> {
    /** HTTP status code */
    status: number;

    /** Parsed JSON response body */
    data: T;
}
