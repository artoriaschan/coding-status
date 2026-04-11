/**
 * HTTP Client
 *
 * Reusable HTTP client built on native Node.js fetch.
 * Per D-01: undici-style API with unified request() and convenience methods.
 * Per D-02: Exponential backoff with full jitter, 5xx + network errors only.
 * Per D-03: Constructor-level auth, auto-injected into all requests.
 * Per D-04: Throws HttpError for non-2xx, HttpTimeoutError for timeout, HttpNetworkError for network failures.
 */

import type { AuthOptions, HttpRequestOptions, HttpResponse } from './types.js';
import { HttpError, HttpTimeoutError, HttpNetworkError } from './errors.js';
import { calculateBackoff } from './retry.js';

// =============================================================================
// Constants
// =============================================================================

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT = 30_000;

/** Default maximum retry count */
const DEFAULT_RETRY = 3;

// =============================================================================
// HttpClient Class
// =============================================================================

/**
 * HTTP client with timeout, retry, auth injection, and structured error handling
 *
 * Constructor sets defaults shared across all requests. Each request() call
 * can override timeout and retry on a per-call basis.
 *
 * @example
 * ```typescript
 * const client = new HttpClient({
 *     timeout: 10_000,
 *     retry: 2,
 *     auth: { type: 'bearer', value: 'my-token' },
 * });
 *
 * const { status, data } = await client.get<User>('https://api.example.com/users/1');
 * ```
 */
export class HttpClient {
    private readonly defaults: { timeout: number; retry: number };
    private readonly auth?: AuthOptions;
    private readonly headers: Record<string, string>;

    constructor(options?: {
        timeout?: number;
        retry?: number;
        auth?: AuthOptions;
        headers?: Record<string, string>;
    }) {
        this.defaults = {
            timeout: options?.timeout ?? DEFAULT_TIMEOUT,
            retry: options?.retry ?? DEFAULT_RETRY,
        };
        this.auth = options?.auth;
        this.headers = options?.headers ?? {};
    }

    /**
     * Execute an HTTP request with retry logic
     *
     * Merges per-call options with constructor defaults.
     * Retries on 5xx and network errors with full jitter backoff.
     * Does NOT retry on 4xx client errors.
     *
     * @param options - Request options (url required, others optional)
     * @returns HttpResponse with status code and parsed JSON data
     * @throws HttpError for non-2xx responses
     * @throws HttpTimeoutError if request exceeds timeout
     * @throws HttpNetworkError for network-level failures
     */
    async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
        const timeout = options.timeout ?? this.defaults.timeout;
        const maxRetries = options.retry ?? this.defaults.retry;
        const maxAttempts = maxRetries + 1;

        let lastError: HttpError | HttpTimeoutError | HttpNetworkError | undefined;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await this.execute<T>(options, timeout);
            } catch (error) {
                lastError = error as HttpError | HttpTimeoutError | HttpNetworkError;

                // Determine if retry is appropriate
                if (!this.shouldRetry(error)) {
                    break;
                }

                // Exceeded max attempts
                if (attempt >= maxRetries) {
                    break;
                }

                // Backoff before retry
                const delay = calculateBackoff(attempt);
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    /**
     * Execute a single fetch request
     *
     * Reads response body once -- uses for both success response and error construction.
     * Per Pitfall 2: body stream is single-use.
     */
    private async execute<T>(
        options: HttpRequestOptions,
        timeoutMs: number
    ): Promise<HttpResponse<T>> {
        const { url, method = 'GET', body, rawBody } = options;

        // Build headers: constructor headers + per-call headers + auth headers
        const headers = this.buildHeaders(options.headers);

        // Build fetch init
        const init: RequestInit = {
            method,
            signal: AbortSignal.timeout(timeoutMs),
            headers,
        };

        if (rawBody !== undefined) {
            init.body = rawBody;
        } else if (body !== undefined && body !== null) {
            init.body = JSON.stringify(body);
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
        }

        let response: Response;

        try {
            response = await fetch(url, init);
        } catch (error) {
            // Network-level failure (DNS, connection refused, etc.)
            if (
                error instanceof DOMException &&
                (error.name === 'TimeoutError' || error.name === 'AbortError')
            ) {
                throw new HttpTimeoutError(timeoutMs, url);
            }
            const message = error instanceof Error ? error.message : 'Network request failed';
            throw new HttpNetworkError(url, message, error instanceof Error ? error : undefined);
        }

        // Read body once (single-use stream)
        const bodyText = await response.text();

        // Parse JSON -- handle empty body
        let data: T;
        if (bodyText.length === 0) {
            data = '' as T;
        } else {
            try {
                data = JSON.parse(bodyText) as T;
            } catch {
                // If body is not valid JSON, return raw text
                data = bodyText as T;
            }
        }

        // Non-2xx -> throw HttpError
        if (!response.ok) {
            // Try to extract business error code from response body
            let bodyCode: string | undefined;
            if (typeof data === 'object' && data !== null && 'code' in data) {
                bodyCode = String((data as Record<string, unknown>).code);
            }

            throw new HttpError(
                response.status,
                bodyCode,
                response.statusText || `HTTP ${response.status}`
            );
        }

        return { status: response.status, data };
    }

    /**
     * Build request headers by merging constructor headers, per-call headers, and auth headers
     */
    private buildHeaders(perCallHeaders?: Record<string, string>): Record<string, string> {
        const headers: Record<string, string> = { ...this.headers, ...perCallHeaders };

        // Inject auth per D-03
        if (this.auth) {
            if (this.auth.type === 'bearer') {
                headers['Authorization'] = `Bearer ${this.auth.value}`;
            } else if (this.auth.type === 'cookie') {
                headers['Cookie'] = this.auth.value;
            }
        }

        return headers;
    }

    /**
     * Determine if error is retryable
     *
     * Per D-02: Retry only on 5xx server errors and network errors.
     * Never retry on 4xx client errors.
     */
    private shouldRetry(error: unknown): boolean {
        if (error instanceof HttpError) {
            // Only retry 5xx, never 4xx
            return error.statusCode >= 500;
        }

        // Retry network errors
        if (error instanceof HttpNetworkError) {
            return true;
        }

        // Do NOT retry timeouts
        if (error instanceof HttpTimeoutError) {
            return false;
        }

        // Unknown error type -- don't retry
        return false;
    }

    /**
     * Sleep utility for retry backoff
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =============================================================================
    // Convenience Methods (per D-01)
    // =============================================================================

    /**
     * GET request
     *
     * @param url - Request URL
     * @param options - Additional options (timeout, retry, auth, headers)
     */
    async get<T = unknown>(
        url: string,
        options?: Omit<HttpRequestOptions, 'url' | 'method' | 'body'>
    ): Promise<HttpResponse<T>> {
        return this.request<T>({ url, method: 'GET', ...options });
    }

    /**
     * POST request
     *
     * @param url - Request URL
     * @param body - Request body (serialized as JSON)
     * @param options - Additional options (timeout, retry, auth, headers)
     */
    async post<T = unknown>(
        url: string,
        body?: unknown,
        options?: Omit<HttpRequestOptions, 'url' | 'method' | 'body'>
    ): Promise<HttpResponse<T>> {
        return this.request<T>({ url, method: 'POST', body, ...options });
    }

    /**
     * PUT request
     *
     * @param url - Request URL
     * @param body - Request body (serialized as JSON)
     * @param options - Additional options (timeout, retry, auth, headers)
     */
    async put<T = unknown>(
        url: string,
        body?: unknown,
        options?: Omit<HttpRequestOptions, 'url' | 'method' | 'body'>
    ): Promise<HttpResponse<T>> {
        return this.request<T>({ url, method: 'PUT', body, ...options });
    }

    /**
     * DELETE request
     *
     * @param url - Request URL
     * @param options - Additional options (timeout, retry, auth, headers)
     */
    async delete<T = unknown>(
        url: string,
        options?: Omit<HttpRequestOptions, 'url' | 'method' | 'body'>
    ): Promise<HttpResponse<T>> {
        return this.request<T>({ url, method: 'DELETE', ...options });
    }
}
