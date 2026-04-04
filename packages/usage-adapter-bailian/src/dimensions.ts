/**
 * Time dimension definitions for Bailian usage queries
 *
 * Provides dimension definitions and time range calculations
 * for 5h, week, and month usage metrics.
 */

import type { UsageDimension } from '@cdps/widget-renderer';

// =============================================================================
// Time Constants (per D-04)
// =============================================================================

/**
 * Time constants in milliseconds for each dimension
 */
export const TIME_CONSTANTS: Record<string, number> = {
  '5h': 5 * 60 * 60 * 1000, // 5 hours in ms = 18000000
  week: 7 * 24 * 60 * 60 * 1000, // 7 days in ms = 604800000
  month: 30 * 24 * 60 * 60 * 1000, // 30 days in ms = 2592000000
};

// =============================================================================
// Dimension Definitions (per D-04)
// =============================================================================

/**
 * Available usage dimensions for Bailian adapter
 *
 * Each dimension represents a time range for CallCount aggregation.
 */
export const DIMENSIONS: UsageDimension[] = [
  {
    key: '5h',
    label: '5 Hours',
    description: 'Last 5 hours call count',
    category: 'usage',
  },
  {
    key: 'week',
    label: 'Weekly',
    description: 'Last 7 days call count',
    category: 'usage',
  },
  {
    key: 'month',
    label: 'Monthly',
    description: 'Last 30 days call count',
    category: 'usage',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get time range for a dimension
 *
 * @param dimension - Dimension key (5h, week, month)
 * @returns Object with startTimeMs and endTimeMs
 * @throws Error if dimension is not found
 */
export function getTimeRange(dimension: string): {
  startTimeMs: number;
  endTimeMs: number;
} {
  const durationMs = TIME_CONSTANTS[dimension];

  if (durationMs === undefined) {
    throw new Error(`Invalid dimension: ${dimension}`);
  }

  const endTimeMs = Date.now();
  const startTimeMs = endTimeMs - durationMs;

  return { startTimeMs, endTimeMs };
}

/**
 * Check if a dimension is valid
 *
 * @param dimension - Dimension key to validate
 * @returns true if dimension is valid
 */
export function isValidDimension(dimension: string): boolean {
  return DIMENSIONS.some((d) => d.key === dimension);
}

/**
 * Get human-readable label for a dimension
 *
 * @param dimension - Dimension key
 * @returns Label string or dimension key if not found
 */
export function getDimensionLabel(dimension: string): string {
  const found = DIMENSIONS.find((d) => d.key === dimension);
  return found?.label ?? dimension;
}