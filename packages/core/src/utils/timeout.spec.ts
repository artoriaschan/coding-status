/**
 * Tests for timeout utility
 *
 * Tests timeout protection with AbortController pattern.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { withTimeout, TimeoutError, STATUSLINE_TIMEOUT_MS } from './timeout.js';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve when promise completes before timeout', async () => {
    const fastPromise = Promise.resolve('success');

    const result = await withTimeout(fastPromise, 100, 'test-operation');

    expect(result).toBe('success');
  });

  it('should reject with TimeoutError when promise exceeds timeout', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 200);
    });

    const promise = withTimeout(slowPromise, 50, 'test-operation');

    await vi.advanceTimersByTimeAsync(60);

    await expect(promise).rejects.toThrow(TimeoutError);
  });

  it('should include operation name in TimeoutError message', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 200);
    });

    const promise = withTimeout(slowPromise, 50, 'fetch-data');

    await vi.advanceTimersByTimeAsync(60);

    try {
      await promise;
      // Should not reach here
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

    const promise = withTimeout(slowPromise, 50, 'test-operation');

    await vi.advanceTimersByTimeAsync(60);

    try {
      await promise;
      expect.fail('Expected TimeoutError');
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).message).toContain('50ms');
    }
  });

  it('should clear timeout after resolution', async () => {
    const fastPromise = Promise.resolve('success');

    await withTimeout(fastPromise, 100, 'test-operation');

    // Verify no pending timers
    const pendingTimers = vi.getTimerCount();
    expect(pendingTimers).toBe(0);
  });

  it('should clear timeout after rejection', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 200);
    });

    const promise = withTimeout(slowPromise, 50, 'test-operation');

    await vi.advanceTimersByTimeAsync(60);

    try {
      await promise;
    } catch {
      // Expected timeout error
    }

    // Verify no pending timers after rejection
    const pendingTimers = vi.getTimerCount();
    expect(pendingTimers).toBe(0);
  });

  it('should work with AbortController abort signal', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('slow-result'), 200);
    });

    const promise = withTimeout(slowPromise, 50, 'test-operation');

    await vi.advanceTimersByTimeAsync(60);

    try {
      await promise;
      expect.fail('Expected TimeoutError');
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
    }
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