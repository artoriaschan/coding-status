/**
 * Tests for timeout utility
 *
 * Tests timeout protection with AbortController pattern.
 */

import { describe, it, expect, vi } from 'vitest';

import { withTimeout, TimeoutError, STATUSLINE_TIMEOUT_MS } from './timeout.js';

describe('withTimeout', () => {
  it('should resolve when promise completes before timeout', async () => {
    const fastPromise = Promise.resolve('success');

    const result = await withTimeout(fastPromise, 100, 'test-operation');

    expect(result).toBe('success');
  });

  it('should reject with TimeoutError when promise exceeds timeout', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 200);
    });

    await expect(withTimeout(slowPromise, 50, 'test-operation')).rejects.toThrow(TimeoutError);
  });

  it('should include operation name in TimeoutError message', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 200);
    });

    try {
      await withTimeout(slowPromise, 50, 'fetch-data');
      expect.fail('Expected TimeoutError');
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).message).toContain('fetch-data');
    }
  });

  it('should include timeout duration in TimeoutError message', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 200);
    });

    try {
      await withTimeout(slowPromise, 50, 'test-operation');
      expect.fail('Expected TimeoutError');
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).message).toContain('50ms');
    }
  });

  it('should clear timeout after resolution', async () => {
    vi.useFakeTimers();

    const fastPromise = Promise.resolve('success');

    await withTimeout(fastPromise, 100, 'test-operation');

    // Verify no pending timers after resolution
    expect(vi.getTimerCount()).toBe(0);

    vi.useRealTimers();
  });

  it('should clear timeout after rejection', async () => {
    vi.useFakeTimers();

    // Use a promise that never resolves to test timeout cleanup
    const neverResolvePromise = new Promise<never>(() => {
      // Never resolves - intentionally hangs
    });

    const timeoutPromise = withTimeout(neverResolvePromise, 50, 'test-operation');

    // Attach catch handler BEFORE advancing timers to avoid unhandled rejection
    const catchPromise = timeoutPromise.catch(() => {
      // Expected timeout error
    });

    // Advance timers past timeout
    await vi.advanceTimersByTimeAsync(60);

    // Wait for the catch promise to complete
    await catchPromise;

    // Verify timeout timer was cleared
    expect(vi.getTimerCount()).toBe(0);

    vi.useRealTimers();
  });

  it('should work with AbortController abort signal', async () => {
    vi.useFakeTimers();

    const neverResolvePromise = new Promise<never>(() => {
      // Never resolves
    });

    const timeoutPromise = withTimeout(neverResolvePromise, 50, 'test-operation');

    // Attach catch handler BEFORE advancing timers
    let caughtError: Error | undefined;
    const catchPromise = timeoutPromise.catch((error) => {
      caughtError = error;
    });

    // Advance timers past timeout
    await vi.advanceTimersByTimeAsync(60);

    // Wait for catch to complete
    await catchPromise;

    // Verify it's TimeoutError
    expect(caughtError).toBeInstanceOf(TimeoutError);

    vi.useRealTimers();
  });

  it('should preserve original promise rejection', async () => {
    const errorPromise = Promise.reject(new Error('original error'));

    await expect(withTimeout(errorPromise, 100, 'test-operation')).rejects.toThrow('original error');
  });
});

describe('TimeoutError', () => {
  it('should have correct name', () => {
    const error = new TimeoutError('test-operation', 1000);
    expect(error.name).toBe('TimeoutError');
  });

  it('should have correct message format', () => {
    const error = new TimeoutError('fetch-data', 1000);
    expect(error.message).toBe('fetch-data timed out after 1000ms');
  });

  it('should be instance of Error', () => {
    const error = new TimeoutError('test-operation', 100);
    expect(error).toBeInstanceOf(Error);
  });

  it('should be distinguishable from other errors', () => {
    const timeoutError = new TimeoutError('test', 100);
    const genericError = new Error('test');

    expect(timeoutError instanceof TimeoutError).toBe(true);
    expect(genericError instanceof TimeoutError).toBe(false);
  });
});

describe('STATUSLINE_TIMEOUT_MS constant', () => {
  it('should be 1000 (1 second)', () => {
    expect(STATUSLINE_TIMEOUT_MS).toBe(1000);
  });
});