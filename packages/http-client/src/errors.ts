/**
 * HTTP error class hierarchy
 *
 * Custom error types for HTTP transport failures.
 * Per D-04: Parallel to AdapterError (does NOT extend it).
 * HttpError represents HTTP transport failures, AdapterError represents adapter lifecycle failures.
 */

// =============================================================================
// HTTP Error
// =============================================================================

/**
 * HTTP response error -- thrown when response status is non-2xx
 *
 * Contains structured fields for programmatic error handling:
 * - statusCode: HTTP status code (404, 500, etc.)
 * - bodyCode: Business error code from response body (may be undefined)
 * - message: Human-readable error description
 */
export class HttpError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly bodyCode: string | undefined,
        message: string,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

// =============================================================================
// Timeout Error
// =============================================================================

/**
 * Request timeout error -- thrown when request exceeds configured timeout
 *
 * Maps from AbortSignal.timeout() DOMException to a typed error class.
 */
export class HttpTimeoutError extends Error {
    constructor(
        public readonly timeoutMs: number,
        public readonly url: string,
    ) {
        super(`Request timed out after ${timeoutMs}ms: ${url}`);
        this.name = 'HttpTimeoutError';
    }
}

// =============================================================================
// Network Error
// =============================================================================

/**
 * Network-level failure -- DNS resolution, connection refused, etc.
 *
 * Thrown when fetch() itself throws (not HTTP error response).
 */
export class HttpNetworkError extends Error {
    constructor(
        public readonly url: string,
        message: string,
        public readonly cause?: Error,
    ) {
        super(message);
        this.name = 'HttpNetworkError';
    }
}
