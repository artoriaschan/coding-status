/**
 * Timeout utility for statusline execution
 *
 * Provides timeout protection using AbortController pattern.
 * Reused from Bailian adapter with TimeoutError class for error identification.
 */

// =============================================================================
// Constants
// =============================================================================

/** Statusline timeout in milliseconds (per D-14) */
export const STATUSLINE_TIMEOUT_MS = 1000;

// =============================================================================
// Error Class
// =============================================================================

/**
 * Custom error class for timeout failures
 *
 * Allows distinguishing timeout errors from other errors.
 */
export class TimeoutError extends Error {
  /**
   * Create a TimeoutError
   *
   * @param operation - Name of the operation that timed out
   * @param timeoutMs - Timeout duration in milliseconds
   */
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Wrap a promise with timeout protection
 *
 * Uses AbortController pattern for timeout enforcement.
 * Returns Promise.race between original promise and timeout rejection.
 *
 * @param promise - Promise to wrap with timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @param operation - Operation name for error message
 * @returns Result of the promise or TimeoutError on timeout
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
        reject(new TimeoutError(operation, timeoutMs));
      });
    }),
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}