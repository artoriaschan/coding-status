/**
 * Tests for time dimension definitions and calculations
 *
 * Tests TIME_CONSTANTS, DIMENSIONS array, getTimeRange,
 * isValidDimension, and getDimensionLabel functions.
 */

import { describe, it, expect } from 'vitest';

import {
  TIME_CONSTANTS,
  DIMENSIONS,
  getTimeRange,
  isValidDimension,
  getDimensionLabel,
} from './dimensions.js';

describe('TIME_CONSTANTS', () => {
  it('should have correct 5h value (5 hours in milliseconds = 18000000)', () => {
    expect(TIME_CONSTANTS['5h']).toBe(5 * 60 * 60 * 1000);
    expect(TIME_CONSTANTS['5h']).toBe(18000000);
  });

  it('should have correct week value (7 days in milliseconds = 604800000)', () => {
    expect(TIME_CONSTANTS['week']).toBe(7 * 24 * 60 * 60 * 1000);
    expect(TIME_CONSTANTS['week']).toBe(604800000);
  });

  it('should have correct month value (30 days in milliseconds = 2592000000)', () => {
    expect(TIME_CONSTANTS['month']).toBe(30 * 24 * 60 * 60 * 1000);
    expect(TIME_CONSTANTS['month']).toBe(2592000000);
  });
});

describe('DIMENSIONS', () => {
  it('should have exactly 3 dimensions', () => {
    expect(DIMENSIONS).toHaveLength(3);
  });

  it('should have correct keys (5h, week, month)', () => {
    const keys = DIMENSIONS.map((d) => d.key);
    expect(keys).toEqual(['5h', 'week', 'month']);
  });

  it('should have correct labels', () => {
    expect(DIMENSIONS[0].label).toBe('5 Hours');
    expect(DIMENSIONS[1].label).toBe('Weekly');
    expect(DIMENSIONS[2].label).toBe('Monthly');
  });

  it('should have category "usage" for all dimensions', () => {
    DIMENSIONS.forEach((d) => {
      expect(d.category).toBe('usage');
    });
  });

  it('should have correct descriptions', () => {
    expect(DIMENSIONS[0].description).toBe('Last 5 hours call count');
    expect(DIMENSIONS[1].description).toBe('Last 7 days call count');
    expect(DIMENSIONS[2].description).toBe('Last 30 days call count');
  });

  it('should match UsageDimension interface structure', () => {
    DIMENSIONS.forEach((d) => {
      expect(d.key).toBeDefined();
      expect(d.label).toBeDefined();
      expect(typeof d.key).toBe('string');
      expect(typeof d.label).toBe('string');
    });
  });
});

describe('getTimeRange', () => {
  it('should return correct time range for 5h dimension', () => {
    const now = Date.now();
    const range = getTimeRange('5h');

    expect(range.endTimeMs).toBeGreaterThanOrEqual(now);
    expect(range.startTimeMs).toBeLessThanOrEqual(now - TIME_CONSTANTS['5h']);
    // Verify approximate range (within 1 second tolerance)
    expect(range.endTimeMs - range.startTimeMs).toBeGreaterThanOrEqual(TIME_CONSTANTS['5h'] - 1000);
    expect(range.endTimeMs - range.startTimeMs).toBeLessThanOrEqual(TIME_CONSTANTS['5h'] + 1000);
  });

  it('should return correct time range for week dimension', () => {
    const now = Date.now();
    const range = getTimeRange('week');

    expect(range.endTimeMs).toBeGreaterThanOrEqual(now);
    expect(range.startTimeMs).toBeLessThanOrEqual(now - TIME_CONSTANTS['week']);
  });

  it('should return correct time range for month dimension', () => {
    const now = Date.now();
    const range = getTimeRange('month');

    expect(range.endTimeMs).toBeGreaterThanOrEqual(now);
    expect(range.startTimeMs).toBeLessThanOrEqual(now - TIME_CONSTANTS['month']);
  });

  it('should throw error for invalid dimension', () => {
    expect(() => getTimeRange('invalid')).toThrow();
    expect(() => getTimeRange('hour')).toThrow();
    expect(() => getTimeRange('')).toThrow();
  });
});

describe('isValidDimension', () => {
  it('should return true for valid dimensions (5h, week, month)', () => {
    expect(isValidDimension('5h')).toBe(true);
    expect(isValidDimension('week')).toBe(true);
    expect(isValidDimension('month')).toBe(true);
  });

  it('should return false for invalid dimension', () => {
    expect(isValidDimension('invalid')).toBe(false);
    expect(isValidDimension('hour')).toBe(false);
    expect(isValidDimension('')).toBe(false);
    expect(isValidDimension('daily')).toBe(false);
  });
});

describe('getDimensionLabel', () => {
  it('should return correct label for 5h', () => {
    expect(getDimensionLabel('5h')).toBe('5 Hours');
  });

  it('should return correct label for week', () => {
    expect(getDimensionLabel('week')).toBe('Weekly');
  });

  it('should return correct label for month', () => {
    expect(getDimensionLabel('month')).toBe('Monthly');
  });

  it('should return dimension key for unknown dimension', () => {
    expect(getDimensionLabel('unknown')).toBe('unknown');
    expect(getDimensionLabel('invalid')).toBe('invalid');
  });
});