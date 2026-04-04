/**
 * ANSI color utilities for terminal output
 *
 * Provides color-coded usage bars and text formatting for the statusline.
 */

import chalk, { type ChalkInstance } from 'chalk';

import type { ColorValue, UsageBarColors } from './types.js';

/** Module-level plain mode flag */
let plainMode = false;

/**
 * Set plain mode to disable ANSI color output
 *
 * @param plain - Whether to disable ANSI colors
 */
export function setPlainMode(plain: boolean): void {
  plainMode = plain;
}

/**
 * Get a chalk function for a ColorValue
 *
 * Maps ColorValue strings to their corresponding chalk methods.
 * Returns identity function if color is undefined or invalid.
 *
 * @param color - ColorValue to convert to chalk function
 * @returns Chalk function for the specified color
 */
export function getChalkColor(color: ColorValue | undefined): ChalkInstance {
  if (!color) return chalk;
  // All ColorValue strings are valid chalk method names
  const chalkMethod = chalk[color as keyof typeof chalk];
  if (typeof chalkMethod === 'function') {
    return chalkMethod as ChalkInstance;
  }
  return chalk;
}

/**
 * Apply color to text with optional fallback
 *
 * @param text - Text to colorize
 * @param color - ColorValue to apply (undefined = use fallback)
 * @param fallback - Fallback ColorValue if primary color is undefined
 * @returns Colored string
 */
export function colorize(
  text: string,
  color?: ColorValue,
  fallback?: ColorValue
): string {
  if (plainMode) {
    return text;
  }
  if (color) {
    return getChalkColor(color)(text);
  }
  if (fallback) {
    return getChalkColor(fallback)(text);
  }
  return text;
}

/** Options for createUsageBar */
export interface UsageBarOptions {
  /** Custom colors for each threshold */
  colors?: UsageBarColors;
  /** Whether to show the bar (default: true) */
  showBar?: boolean;
  /** Whether to show the percentage (default: true) */
  showPercent?: boolean;
}

/**
 * Create a visual usage bar with color coding based on percentage
 *
 * The bar uses 10 characters to represent 0-100%, with colors:
 * - Green (0-49%): Safe usage (low)
 * - Yellow (50-79%): Moderate usage (medium)
 * - Red (80-100%): High usage (high)
 *
 * @param percent - Usage percentage (0-100)
 * @param options - Bar display options (colors, showBar, showPercent)
 * @returns Formatted string like "[████████░░ 80%]"
 */
export function createUsageBar(
  percent: number,
  options?: UsageBarOptions
): string {
  const opts = options ?? {};
  const showBar = opts.showBar !== false;
  const showPercent = opts.showPercent !== false;
  const colors = opts.colors;

  // If both are hidden, return empty string
  if (!showBar && !showPercent) {
    return '';
  }

  // Clamp percent to valid range
  const pctInt = Math.floor(Math.max(0, Math.min(100, percent)));

  // Get colors with defaults
  const lowColor = colors?.low ?? 'green';
  const mediumColor = colors?.medium ?? 'yellow';
  const highColor = colors?.high ?? 'red';

  // Select color based on percentage thresholds (< 50% low, < 80% medium, >= 80% high)
  const selectedColor = pctInt < 50 ? lowColor : pctInt < 80 ? mediumColor : highColor;

  // Build bar segments
  const filled = Math.min(10, Math.max(0, Math.ceil(pctInt / 10)));
  const empty = 10 - filled;

  // Build output
  if (showBar && showPercent) {
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const pctStr = String(pctInt).padStart(3);
    return colorize(`[${bar} ${pctStr}%]`, selectedColor);
  } else if (showBar) {
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return colorize(`[${bar}]`, selectedColor);
  } else {
    // showPercent only
    return colorize(`[${pctInt}%]`, selectedColor);
  }
}