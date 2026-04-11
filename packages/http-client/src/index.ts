/**
 * @coding-status/http-client
 *
 * Reusable HTTP client with timeout, retry, auth injection, and structured error parsing.
 * Uses native Node.js fetch (no external HTTP dependencies).
 */

// Client
export { HttpClient } from './client.js';

// Errors
export { HttpError, HttpTimeoutError, HttpNetworkError } from './errors.js';

// Retry
export { calculateBackoff } from './retry.js';

// Types (re-export for consumer convenience)
export type { AuthOptions, HttpRequestOptions, HttpResponse } from './types.js';
