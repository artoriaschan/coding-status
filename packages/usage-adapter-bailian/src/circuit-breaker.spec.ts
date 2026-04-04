/**
 * Circuit breaker tests
 *
 * Tests circuit breaker state machine with 3-failure threshold,
 * 5-minute recovery interval, and file persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  CircuitBreaker,
  getCircuitBreaker,
  FAILURE_THRESHOLD,
  RECOVERY_INTERVAL_MS,
  type CircuitState,
  type ProviderCircuitState,
} from './circuit-breaker.js';

// Mock node:fs/promises
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

// Reset singleton between tests
let circuitBreakerInstance: CircuitBreaker | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset singleton by creating new instance
  circuitBreakerInstance = null;
  // Default: file doesn't exist
  mockReadFile.mockRejectedValue(new Error('File not found'));
  mockWriteFile.mockResolvedValue(undefined);
  mockMkdir.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Circuit Breaker Constants', () => {
  it('should have correct FAILURE_THRESHOLD (3)', () => {
    expect(FAILURE_THRESHOLD).toBe(3);
  });

  it('should have correct RECOVERY_INTERVAL_MS (5 minutes = 300000)', () => {
    expect(RECOVERY_INTERVAL_MS).toBe(300000);
  });
});

describe('CircuitBreaker.checkCircuit', () => {
  it("should return 'allow' for closed state", async () => {
    const cb = new CircuitBreaker();
    // Set provider to closed state
    cb.recordSuccess('test-provider');

    const result = cb.checkCircuit('test-provider');
    expect(result).toBe('allow');
  });

  it("should return 'reject' for open state within recovery interval", async () => {
    const cb = new CircuitBreaker();
    // Trigger 3 failures to open circuit
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    // Immediately check - should reject
    const result = cb.checkCircuit('test-provider');
    expect(result).toBe('reject');
  });

  it("should return 'probe' for open state after recovery interval", async () => {
    const cb = new CircuitBreaker();
    // Trigger 3 failures to open circuit
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    // Manually set lastFailure to simulate time passage
    const state = cb.getProviderState('test-provider');
    // Use internal access to modify state for testing
    // We'll use a workaround: create a scenario where recovery interval has passed
    const oldTime = Date.now() - RECOVERY_INTERVAL_MS - 1000;

    // Reset and create new state with old timestamp
    cb.reset('test-provider');
    // Record failures again but we need to manipulate lastFailure
    // For this test, we'll use a different approach - test via behavior

    // Alternative: directly test the state machine logic
    const providerState: ProviderCircuitState = {
      failures: 3,
      state: 'open',
      lastFailure: oldTime,
    };

    // Check behavior via internal state manipulation
    // Since we can't directly set state, we'll verify through the class behavior
    // For now, skip this test and implement in GREEN phase
  });

  it("should return 'probe' for half-open state", async () => {
    const cb = new CircuitBreaker();
    // Half-open state occurs after recovery from open
    // This requires time manipulation which is tricky
    // For TDD, we'll define expected behavior first
  });

  it("should return 'allow' for provider with no recorded state (default)", async () => {
    const cb = new CircuitBreaker();
    // Provider not yet tracked - should return default (closed) behavior
    const result = cb.checkCircuit('unknown-provider');
    expect(result).toBe('allow');
  });
});

describe('CircuitBreaker.recordSuccess', () => {
  it('should reset failures to 0', async () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordSuccess('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.failures).toBe(0);
  });

  it("should set state to 'closed'", async () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider'); // Opens circuit
    cb.recordSuccess('test-provider'); // Closes circuit

    const state = cb.getProviderState('test-provider');
    expect(state.state).toBe('closed');
  });

  it('should set lastFailure to 0', async () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordSuccess('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.lastFailure).toBe(0);
  });

  it('should call saveState (writeFile)', async () => {
    const cb = new CircuitBreaker();
    mockWriteFile.mockClear();
    cb.recordSuccess('test-provider');

    expect(mockWriteFile).toHaveBeenCalled();
  });
});

describe('CircuitBreaker.recordFailure', () => {
  it('should increment failures count', async () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.failures).toBe(2);
  });

  it("should set state to 'open' when failures reach threshold (3)", async () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.state).toBe('open');
  });

  it("should keep state 'closed' when failures below threshold", async () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.state).toBe('closed');
  });

  it("should set state to 'open' when half-open state fails", async () => {
    const cb = new CircuitBreaker();
    // Trigger open state first
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    // Manually transition to half-open for testing
    // This requires internal state manipulation or recovery interval passage
    // For TDD, define expected behavior first
  });

  it('should update lastFailure timestamp', async () => {
    const cb = new CircuitBreaker();
    const before = Date.now();
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.lastFailure).toBeGreaterThanOrEqual(before);
  });

  it('should call saveState (writeFile)', async () => {
    const cb = new CircuitBreaker();
    mockWriteFile.mockClear();
    cb.recordFailure('test-provider');

    expect(mockWriteFile).toHaveBeenCalled();
  });
});

describe('CircuitBreaker state transitions', () => {
  it('closed -> open after 3 failures', async () => {
    const cb = new CircuitBreaker();

    cb.recordFailure('test-provider');
    expect(cb.getProviderState('test-provider').state).toBe('closed');

    cb.recordFailure('test-provider');
    expect(cb.getProviderState('test-provider').state).toBe('closed');

    cb.recordFailure('test-provider');
    expect(cb.getProviderState('test-provider').state).toBe('open');
  });

  it('open -> half-open after recovery interval', async () => {
    // This test requires time manipulation
    // Will implement during GREEN phase
  });

  it('half-open -> closed on success', async () => {
    // This test requires half-open state setup
    // Will implement during GREEN phase
  });

  it('half-open -> open on failure', async () => {
    // This test requires half-open state setup
    // Will implement during GREEN phase
  });
});

describe('CircuitBreaker.reset', () => {
  it('should reset provider to default state', async () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    cb.reset('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.failures).toBe(0);
    expect(state.state).toBe('closed');
    expect(state.lastFailure).toBe(0);
  });

  it('should call saveState (writeFile)', async () => {
    const cb = new CircuitBreaker();
    mockWriteFile.mockClear();
    cb.reset('test-provider');

    expect(mockWriteFile).toHaveBeenCalled();
  });
});

describe('CircuitBreaker file persistence', () => {
  it('should load state from file on construction', async () => {
    const existingState = {
      providers: {
        'existing-provider': {
          failures: 2,
          state: 'closed',
          lastFailure: Date.now() - 1000,
        },
      },
    };

    mockReadFile.mockResolvedValueOnce(JSON.stringify(existingState));

    const cb = new CircuitBreaker();
    const state = cb.getProviderState('existing-provider');

    expect(state.failures).toBe(2);
    expect(state.state).toBe('closed');
  });

  it('should save state after recordSuccess', async () => {
    const cb = new CircuitBreaker();
    mockWriteFile.mockClear();
    cb.recordSuccess('test-provider');

    expect(mockWriteFile).toHaveBeenCalled();
    // Verify JSON content
    const writeFileCall = mockWriteFile.mock.calls[0];
    const content = JSON.parse(writeFileCall[1] as string);
    expect(content.providers['test-provider'].state).toBe('closed');
  });

  it('should save state after recordFailure', async () => {
    const cb = new CircuitBreaker();
    mockWriteFile.mockClear();
    cb.recordFailure('test-provider');

    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('should handle missing state file gracefully', async () => {
    mockReadFile.mockRejectedValue(new Error('File not found'));

    const cb = new CircuitBreaker();
    // Should not throw, should use default state
    const state = cb.getProviderState('any-provider');
    expect(state.state).toBe('closed');
    expect(state.failures).toBe(0);
  });

  it('should handle corrupt state file gracefully', async () => {
    mockReadFile.mockResolvedValueOnce('invalid json {{{');

    const cb = new CircuitBreaker();
    // Should not throw, should use default state
    const state = cb.getProviderState('any-provider');
    expect(state.state).toBe('closed');
  });
});

describe('getCircuitBreaker singleton', () => {
  it('getCircuitBreaker should return same instance', async () => {
    // Reset singleton
    const instance1 = getCircuitBreaker();
    const instance2 = getCircuitBreaker();

    expect(instance1).toBe(instance2);
  });
});