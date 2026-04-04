/**
 * Circuit breaker tests
 *
 * Tests circuit breaker state machine with 3-failure threshold,
 * 5-minute recovery interval, and file persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock node:fs (synchronous operations)
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock node:path
vi.mock('node:path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

// Mock node:os
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

// Import after mocks are set up
import {
  CircuitBreaker,
  getCircuitBreaker,
  FAILURE_THRESHOLD,
  RECOVERY_INTERVAL_MS,
} from './circuit-breaker.js';

// Get mock references after import
const mockReadFileSync = vi.mocked(await import('node:fs')).readFileSync;
const mockWriteFileSync = vi.mocked(await import('node:fs')).writeFileSync;
const mockExistsSync = vi.mocked(await import('node:fs')).existsSync;
const mockMkdirSync = vi.mocked(await import('node:fs')).mkdirSync;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: file doesn't exist
  mockExistsSync.mockReturnValue(false);
  mockReadFileSync.mockReturnValue('');
  mockWriteFileSync.mockReturnValue(undefined);
  mockMkdirSync.mockReturnValue(undefined);
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
  it("should return 'allow' for closed state", () => {
    const cb = new CircuitBreaker();
    // Set provider to closed state
    cb.recordSuccess('test-provider');

    const result = cb.checkCircuit('test-provider');
    expect(result).toBe('allow');
  });

  it("should return 'reject' for open state within recovery interval", () => {
    const cb = new CircuitBreaker();
    // Trigger 3 failures to open circuit
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    // Immediately check - should reject
    const result = cb.checkCircuit('test-provider');
    expect(result).toBe('reject');
  });

  it("should return 'probe' for open state after recovery interval", () => {
    const cb = new CircuitBreaker();

    // Setup: trigger open state
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    // Verify circuit is open
    const openState = cb.getProviderState('test-provider');
    expect(openState.state).toBe('open');

    // Now we need to simulate time passage
    // Create a state file with old timestamp and load it
    const oldTime = Date.now() - RECOVERY_INTERVAL_MS - 1000;
    const existingState = {
      providers: {
        'time-test-provider': {
          failures: 3,
          state: 'open',
          lastFailure: oldTime,
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(existingState));

    const cbWithOldTime = new CircuitBreaker();
    const result = cbWithOldTime.checkCircuit('time-test-provider');
    expect(result).toBe('probe');
  });

  it("should return 'probe' for half-open state", () => {
    // Setup: create half-open state directly via state file
    const halfOpenState = {
      providers: {
        'half-open-provider': {
          failures: 3,
          state: 'half-open',
          lastFailure: Date.now() - RECOVERY_INTERVAL_MS - 1000,
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(halfOpenState));

    const cbHalfOpen = new CircuitBreaker();
    const result = cbHalfOpen.checkCircuit('half-open-provider');
    expect(result).toBe('probe');
  });

  it("should return 'allow' for provider with no recorded state (default)", () => {
    const cb = new CircuitBreaker();
    // Provider not yet tracked - should return default (closed) behavior
    const result = cb.checkCircuit('unknown-provider');
    expect(result).toBe('allow');
  });
});

describe('CircuitBreaker.recordSuccess', () => {
  it('should reset failures to 0', () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordSuccess('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.failures).toBe(0);
  });

  it("should set state to 'closed'", () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider'); // Opens circuit
    cb.recordSuccess('test-provider'); // Closes circuit

    const state = cb.getProviderState('test-provider');
    expect(state.state).toBe('closed');
  });

  it('should set lastFailure to 0', () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordSuccess('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.lastFailure).toBe(0);
  });

  it('should call saveState (writeFileSync)', () => {
    mockWriteFileSync.mockClear();
    const cb = new CircuitBreaker();
    cb.recordSuccess('test-provider');

    expect(mockWriteFileSync).toHaveBeenCalled();
  });
});

describe('CircuitBreaker.recordFailure', () => {
  it('should increment failures count', () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.failures).toBe(2);
  });

  it("should set state to 'open' when failures reach threshold (3)", () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.state).toBe('open');
  });

  it("should keep state 'closed' when failures below threshold", () => {
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.state).toBe('closed');
  });

  it("should set state to 'open' when half-open state fails", () => {
    // Setup: create half-open state
    const halfOpenState = {
      providers: {
        'half-open-fail-provider': {
          failures: 3,
          state: 'half-open',
          lastFailure: Date.now() - RECOVERY_INTERVAL_MS - 1000,
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(halfOpenState));

    const cb = new CircuitBreaker();
    cb.recordFailure('half-open-fail-provider');

    const state = cb.getProviderState('half-open-fail-provider');
    expect(state.state).toBe('open');
    expect(state.failures).toBe(4);
  });

  it('should update lastFailure timestamp', () => {
    const cb = new CircuitBreaker();
    const before = Date.now();
    cb.recordFailure('test-provider');

    const state = cb.getProviderState('test-provider');
    expect(state.lastFailure).toBeGreaterThanOrEqual(before);
  });

  it('should call saveState (writeFileSync)', () => {
    mockWriteFileSync.mockClear();
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');

    expect(mockWriteFileSync).toHaveBeenCalled();
  });
});

describe('CircuitBreaker state transitions', () => {
  it('closed -> open after 3 failures', () => {
    const cb = new CircuitBreaker();

    cb.recordFailure('test-provider');
    expect(cb.getProviderState('test-provider').state).toBe('closed');

    cb.recordFailure('test-provider');
    expect(cb.getProviderState('test-provider').state).toBe('closed');

    cb.recordFailure('test-provider');
    expect(cb.getProviderState('test-provider').state).toBe('open');
  });

  it('open -> half-open after recovery interval', () => {
    // Create state with old timestamp
    const oldTime = Date.now() - RECOVERY_INTERVAL_MS - 1000;
    const existingState = {
      providers: {
        'transition-provider': {
          failures: 3,
          state: 'open',
          lastFailure: oldTime,
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(existingState));

    const cb = new CircuitBreaker();
    // checkCircuit should transition to half-open
    const result = cb.checkCircuit('transition-provider');
    expect(result).toBe('probe');

    // Verify state is now half-open
    const state = cb.getProviderState('transition-provider');
    expect(state.state).toBe('half-open');
  });

  it('half-open -> closed on success', () => {
    // Setup: create half-open state
    const halfOpenState = {
      providers: {
        'success-provider': {
          failures: 3,
          state: 'half-open',
          lastFailure: Date.now() - RECOVERY_INTERVAL_MS - 1000,
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(halfOpenState));

    const cb = new CircuitBreaker();
    cb.recordSuccess('success-provider');

    const state = cb.getProviderState('success-provider');
    expect(state.state).toBe('closed');
    expect(state.failures).toBe(0);
  });

  it('half-open -> open on failure', () => {
    // Setup: create half-open state
    const halfOpenState = {
      providers: {
        'fail-provider': {
          failures: 3,
          state: 'half-open',
          lastFailure: Date.now() - RECOVERY_INTERVAL_MS - 1000,
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(halfOpenState));

    const cb = new CircuitBreaker();
    cb.recordFailure('fail-provider');

    const state = cb.getProviderState('fail-provider');
    expect(state.state).toBe('open');
    expect(state.failures).toBe(4);
  });
});

describe('CircuitBreaker.reset', () => {
  it('should reset provider to default state', () => {
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

  it('should call saveState (writeFileSync)', () => {
    mockWriteFileSync.mockClear();
    const cb = new CircuitBreaker();
    cb.reset('test-provider');

    expect(mockWriteFileSync).toHaveBeenCalled();
  });
});

describe('CircuitBreaker file persistence', () => {
  it('should load state from file on construction', () => {
    const existingState = {
      providers: {
        'existing-provider': {
          failures: 2,
          state: 'closed',
          lastFailure: Date.now() - 1000,
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(existingState));

    const cb = new CircuitBreaker();
    const state = cb.getProviderState('existing-provider');

    expect(state.failures).toBe(2);
    expect(state.state).toBe('closed');
  });

  it('should save state after recordSuccess', () => {
    mockWriteFileSync.mockClear();
    const cb = new CircuitBreaker();
    cb.recordSuccess('test-provider');

    expect(mockWriteFileSync).toHaveBeenCalled();
    // Verify JSON content
    const writeFileCall = mockWriteFileSync.mock.calls[0];
    const content = JSON.parse(writeFileCall[1] as string);
    expect(content.providers['test-provider'].state).toBe('closed');
  });

  it('should save state after recordFailure', () => {
    mockWriteFileSync.mockClear();
    const cb = new CircuitBreaker();
    cb.recordFailure('test-provider');

    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('should handle missing state file gracefully', () => {
    mockExistsSync.mockReturnValue(false);

    const cb = new CircuitBreaker();
    // Should not throw, should use default state
    const state = cb.getProviderState('any-provider');
    expect(state.state).toBe('closed');
    expect(state.failures).toBe(0);
  });

  it('should handle corrupt state file gracefully', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValueOnce('invalid json {{{');

    const cb = new CircuitBreaker();
    // Should not throw, should use default state
    const state = cb.getProviderState('any-provider');
    expect(state.state).toBe('closed');
  });
});

describe('getCircuitBreaker singleton', () => {
  it('getCircuitBreaker should return same instance', () => {
    // Note: The singleton persists, so we just verify the same instance is returned
    const instance1 = getCircuitBreaker();
    const instance2 = getCircuitBreaker();

    expect(instance1).toBe(instance2);
  });
});