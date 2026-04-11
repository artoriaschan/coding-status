/**
 * Retry backoff with full jitter
 *
 * Implements exponential backoff with full jitter for retry spreading.
 * Per D-02: base 1s, cap 4s, full jitter algorithm.
 * AWS-recommended: prevents thundering herd, spreads retries evenly.
 *
 * Formula: random(0, min(cap, base * 2^attempt))
 */

// =============================================================================
// Constants
// =============================================================================

/** Default base delay in milliseconds */
const DEFAULT_BASE_MS = 1000;

/** Default maximum delay cap in milliseconds */
const DEFAULT_CAP_MS = 4000;

// =============================================================================
// Backoff Calculation
// =============================================================================

/**
 * Calculate retry delay with full jitter exponential backoff
 *
 * @param attempt - Zero-based attempt number (0 = first retry)
 * @param options - Optional baseMs (default 1000) and capMs (default 4000)
 * @returns Delay in milliseconds, between 0 and min(cap, base * 2^attempt)
 */
export function calculateBackoff(
    attempt: number,
    options?: { baseMs?: number; capMs?: number },
): number {
    const base = options?.baseMs ?? DEFAULT_BASE_MS;
    const cap = options?.capMs ?? DEFAULT_CAP_MS;
    const maxDelay = Math.min(cap, base * 2 ** attempt);
    return Math.floor(Math.random() * maxDelay);
}
