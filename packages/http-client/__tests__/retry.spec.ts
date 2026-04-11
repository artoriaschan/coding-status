/**
 * Retry backoff algorithm tests
 *
 * Tests full jitter exponential backoff: random(0, min(cap, base * 2^attempt))
 * Per D-02: base 1s, cap 4s, 5xx + network errors only.
 */

import { describe, it, expect } from 'vitest';
import { calculateBackoff } from '../src/retry.js';

describe('calculateBackoff', () => {
    it('returns value in range [0, base) for attempt 0', () => {
        const result = calculateBackoff(0, { baseMs: 1000, capMs: 4000 });
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1000);
    });

    it('returns value in range [0, base*2) for attempt 1', () => {
        const result = calculateBackoff(1, { baseMs: 1000, capMs: 4000 });
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(2000);
    });

    it('returns value in range [0, base*4) for attempt 2', () => {
        const result = calculateBackoff(2, { baseMs: 1000, capMs: 4000 });
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(4000);
    });

    it('caps at capMs for attempt 3 (base*8 = 8000 > cap 4000)', () => {
        const result = calculateBackoff(3, { baseMs: 1000, capMs: 4000 });
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(4000);
    });

    it('stays capped for high attempt numbers', () => {
        const result = calculateBackoff(10, { baseMs: 1000, capMs: 4000 });
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(4000);
    });

    it('uses default values when options omitted', () => {
        const result = calculateBackoff(0);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1000); // default baseMs = 1000
    });

    it('returns integer values (Math.floor)', () => {
        for (let i = 0; i < 100; i++) {
            const result = calculateBackoff(0, { baseMs: 1000, capMs: 4000 });
            expect(Number.isInteger(result)).toBe(true);
        }
    });

    it('returns different values across calls (randomness)', () => {
        const results = new Set<number>();
        for (let i = 0; i < 50; i++) {
            results.add(calculateBackoff(1, { baseMs: 1000, capMs: 4000 }));
        }
        // With 50 samples in [0, 2000) range, should get multiple distinct values
        expect(results.size).toBeGreaterThan(1);
    });

    it('respects custom base and cap', () => {
        const result = calculateBackoff(0, { baseMs: 500, capMs: 1500 });
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(500);
    });
});
