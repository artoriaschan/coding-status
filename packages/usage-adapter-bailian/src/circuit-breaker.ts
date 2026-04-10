/**
 * Circuit breaker state machine
 *
 * Implements circuit breaker pattern with 3-failure threshold and 5-minute recovery.
 * Per D-08~10: state file persistence, half-open recovery, 5 minute interval.
 *
 * Uses synchronous file operations for immediate state updates.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Path to circuit breaker state file */
export const CIRCUIT_BREAKER_PATH = join(homedir(), '.coding-status', 'circuit-breaker.json');

/** Number of consecutive failures before circuit opens */
export const FAILURE_THRESHOLD = 3;

/** Recovery interval in milliseconds (5 minutes per D-10) */
export const RECOVERY_INTERVAL_MS = 5 * 60 * 1000;

/** Circuit breaker state values */
export type CircuitState = 'closed' | 'open' | 'half-open';

/** Per-provider circuit breaker state */
export interface ProviderCircuitState {
    /** Number of consecutive failures */
    failures: number;
    /** Current circuit state */
    state: CircuitState;
    /** Timestamp of last failure (Unix milliseconds) */
    lastFailure: number;
}

/** Full circuit breaker state file structure */
export interface CircuitBreakerState {
    /** Provider states keyed by provider name */
    providers: Record<string, ProviderCircuitState>;
}

/** Default state for a new provider */
const DEFAULT_PROVIDER_STATE: ProviderCircuitState = {
    failures: 0,
    state: 'closed',
    lastFailure: 0,
};

/**
 * Circuit breaker class
 *
 * Manages circuit breaker state for multiple providers.
 * Handles file persistence and state transitions.
 */
export class CircuitBreaker {
    private state: CircuitBreakerState = { providers: {} };

    constructor() {
        this.loadState();
    }

    /**
     * Load state from file on construction
     * Handles missing/corrupt files gracefully
     */
    private loadState(): void {
        try {
            if (existsSync(CIRCUIT_BREAKER_PATH)) {
                const content = readFileSync(CIRCUIT_BREAKER_PATH, 'utf-8');
                this.state = JSON.parse(content) as CircuitBreakerState;
            }
        } catch {
            // File not found or corrupt - use default empty state
            this.state = { providers: {} };
        }
    }

    /**
     * Save state to file
     * Creates directory if needed
     */
    private saveState(): void {
        try {
            const dir = join(homedir(), '.coding-status');
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            writeFileSync(CIRCUIT_BREAKER_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
        } catch {
            // Silently fail - circuit breaker state is not critical
        }
    }

    /**
     * Get state for a provider
     * Returns default state if provider not tracked
     */
    getProviderState(providerName: string): ProviderCircuitState {
        return this.state.providers[providerName] ?? DEFAULT_PROVIDER_STATE;
    }

    /**
     * Check circuit state and determine action
     *
     * @returns 'allow' - proceed with API call
     * @returns 'reject' - circuit open, reject call
     * @returns 'probe' - half-open state, allow probe call
     */
    checkCircuit(providerName: string): 'allow' | 'reject' | 'probe' {
        const providerState = this.getProviderState(providerName);
        const now = Date.now();

        if (providerState.state === 'closed') {
            return 'allow';
        }

        if (providerState.state === 'open') {
            // Check if recovery interval has elapsed
            if (now - providerState.lastFailure >= RECOVERY_INTERVAL_MS) {
                // Transition to half-open and allow probe call
                this.state.providers[providerName] = {
                    ...providerState,
                    state: 'half-open',
                };
                this.saveState();
                return 'probe';
            }
            return 'reject';
        }

        // half-open: allow probe call
        return 'probe';
    }

    /**
     * Record successful API call
     * Resets to closed state, clears failures
     */
    recordSuccess(providerName: string): void {
        this.state.providers[providerName] = {
            failures: 0,
            state: 'closed',
            lastFailure: 0,
        };
        this.saveState();
    }

    /**
     * Record failed API call
     * Increments failures, transitions to open when threshold reached
     */
    recordFailure(providerName: string): void {
        const currentState = this.getProviderState(providerName);
        const newFailures = currentState.failures + 1;

        this.state.providers[providerName] = {
            failures: newFailures,
            state: newFailures >= FAILURE_THRESHOLD ? 'open' : currentState.state,
            lastFailure: Date.now(),
        };
        this.saveState();
    }

    /**
     * Reset provider to default state
     */
    reset(providerName: string): void {
        this.state.providers[providerName] = DEFAULT_PROVIDER_STATE;
        this.saveState();
    }
}

/** Singleton instance */
let circuitBreakerInstance: CircuitBreaker | null = null;

/**
 * Get singleton circuit breaker instance
 * Creates instance on first call
 */
export function getCircuitBreaker(): CircuitBreaker {
    if (!circuitBreakerInstance) {
        circuitBreakerInstance = new CircuitBreaker();
    }
    return circuitBreakerInstance;
}
