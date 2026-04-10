/**
 * Tests for color utilities
 *
 * Tests chalk integration, plain mode support, and usage bar generation.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ColorValue, UsageBarColors } from '../src/types.js';
import { colorize, createUsageBar, getChalkColor, setPlainMode } from '../src/colors.js';

describe('getChalkColor', () => {
  it('should return chalk function for black', () => {
    const fn = getChalkColor('black');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for red', () => {
    const fn = getChalkColor('red');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for green', () => {
    const fn = getChalkColor('green');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for yellow', () => {
    const fn = getChalkColor('yellow');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for blue', () => {
    const fn = getChalkColor('blue');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for magenta', () => {
    const fn = getChalkColor('magenta');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for cyan', () => {
    const fn = getChalkColor('cyan');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for white', () => {
    const fn = getChalkColor('white');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for dim', () => {
    const fn = getChalkColor('dim');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return chalk function for bold', () => {
    const fn = getChalkColor('bold');
    expect(fn).toBeDefined();
    expect(typeof fn).toBe('function');
  });

  it('should return identity function for undefined color', () => {
    const fn = getChalkColor(undefined as unknown as ColorValue);
    expect(fn).toBeDefined();
    // Identity function should return text unchanged
    expect(fn('test')).toBe('test');
  });
});

describe('colorize', () => {
  beforeEach(() => {
    // Reset plain mode before each test
    setPlainMode(false);
  });

  afterEach(() => {
    // Reset plain mode after each test
    setPlainMode(false);
  });

  it('should return text containing the input when color provided', () => {
    const result = colorize('test', 'red');
    // In any environment, the text should be present
    expect(result).toContain('test');
  });

  it('should return plain text when plain mode enabled', () => {
    setPlainMode(true);
    const result = colorize('test', 'red');
    // Plain mode should always return exact text
    expect(result).toBe('test');
  });

  it('should use fallback when primary color missing', () => {
    const result = colorize('test', undefined, 'yellow');
    // Should contain the text
    expect(result).toContain('test');
  });

  it('should return unchanged text when no color provided', () => {
    const result = colorize('test');
    expect(result).toBe('test');
  });

  it('should return unchanged text when no color and no fallback', () => {
    const result = colorize('test', undefined, undefined);
    expect(result).toBe('test');
  });

  it('should contain text when green color applied', () => {
    const result = colorize('success', 'green');
    expect(result).toContain('success');
  });

  it('should contain text when cyan color applied', () => {
    const result = colorize('info', 'cyan');
    expect(result).toContain('info');
  });

  it('should contain text when dim modifier applied', () => {
    const result = colorize('dimmed', 'dim');
    expect(result).toContain('dimmed');
  });
});

describe('createUsageBar', () => {
  beforeEach(() => {
    setPlainMode(false);
  });

  afterEach(() => {
    setPlainMode(false);
  });

  it('should generate bar with 10 segments total', () => {
    const result = createUsageBar(50);
    // Should contain exactly 10 segment characters (█ or ░)
    const barMatch = result.match(/[█░]/g);
    expect(barMatch).toHaveLength(10);
  });

  it('should show all empty (░) at 0%', () => {
    const result = createUsageBar(0);
    // No filled characters at 0%
    expect(result).not.toContain('█');
    // Should have 10 empty characters
    const emptyCount = (result.match(/░/g) || []).length;
    expect(emptyCount).toBe(10);
  });

  it('should show all filled (█) at 100%', () => {
    const result = createUsageBar(100);
    // No empty characters at 100%
    expect(result).not.toContain('░');
    // Should have 10 filled characters
    const filledCount = (result.match(/█/g) || []).length;
    expect(filledCount).toBe(10);
  });

  it('should show 5 filled, 5 empty at 50%', () => {
    const result = createUsageBar(50);
    const filledCount = (result.match(/█/g) || []).length;
    const emptyCount = (result.match(/░/g) || []).length;
    expect(filledCount).toBe(5);
    expect(emptyCount).toBe(5);
  });

  it('should include percentage text by default', () => {
    const result = createUsageBar(60);
    expect(result).toContain('60');
    expect(result).toContain('%');
  });

  it('should hide percentage when showPercent is false', () => {
    const result = createUsageBar(60, { showPercent: false });
    expect(result).not.toContain('60');
    expect(result).not.toContain('%');
  });

  it('should contain bar characters for low percentage', () => {
    const result = createUsageBar(30);
    // Should contain bar characters and percentage
    expect(result).toContain('█');
    expect(result).toContain('░');
    expect(result).toContain('30');
    expect(result).toContain('%');
  });

  it('should contain bar characters for medium percentage', () => {
    const result = createUsageBar(60);
    expect(result).toContain('█');
    expect(result).toContain('░');
    expect(result).toContain('60');
    expect(result).toContain('%');
  });

  it('should contain bar characters for high percentage', () => {
    const result = createUsageBar(85);
    expect(result).toContain('█');
    expect(result).toContain('░');
    expect(result).toContain('85');
    expect(result).toContain('%');
  });

  it('should handle custom low color', () => {
    const colors: UsageBarColors = { low: 'cyan' };
    const result = createUsageBar(30, { colors });
    expect(result).toContain('30');
    expect(result).toContain('%');
  });

  it('should handle custom medium color', () => {
    const colors: UsageBarColors = { medium: 'blue' };
    const result = createUsageBar(60, { colors });
    expect(result).toContain('60');
    expect(result).toContain('%');
  });

  it('should handle custom high color', () => {
    const colors: UsageBarColors = { high: 'magenta' };
    const result = createUsageBar(85, { colors });
    expect(result).toContain('85');
    expect(result).toContain('%');
  });

  it('should clamp values below 0', () => {
    const result = createUsageBar(-50);
    // Should treat as 0%
    expect(result).not.toContain('█');
    const emptyCount = (result.match(/░/g) || []).length;
    expect(emptyCount).toBe(10);
  });

  it('should clamp values above 100', () => {
    const result = createUsageBar(150);
    // Should treat as 100%
    expect(result).not.toContain('░');
    const filledCount = (result.match(/█/g) || []).length;
    expect(filledCount).toBe(10);
  });

  it('should use correct fill calculation with Math.ceil', () => {
    // 25% should give 3 filled (Math.ceil(25/10) = 3)
    const result = createUsageBar(25);
    const filledCount = (result.match(/█/g) || []).length;
    expect(filledCount).toBe(3);
  });

  it('should format percentage as integer', () => {
    const result = createUsageBar(55.7);
    // Should show 55% (floor)
    expect(result).toContain('55');
    expect(result).toContain('%');
  });

  it('should still show bar characters when plain mode enabled', () => {
    setPlainMode(true);
    const result = createUsageBar(60);
    // Bar characters should still be present
    expect(result).toContain('█');
    expect(result).toContain('░');
    expect(result).toContain('60');
    expect(result).toContain('%');
  });

  it('should return empty string when showBar and showPercent both false', () => {
    const result = createUsageBar(60, { showBar: false, showPercent: false });
    expect(result).toBe('');
  });

  it('should show bar only when showPercent false', () => {
    const result = createUsageBar(60, { showPercent: false });
    expect(result).toContain('█');
    expect(result).toContain('░');
    expect(result).not.toContain('%');
  });

  it('should show percent only when showBar false', () => {
    const result = createUsageBar(60, { showBar: false });
    expect(result).toContain('60');
    expect(result).toContain('%');
    expect(result).not.toContain('█');
    expect(result).not.toContain('░');
  });
});

describe('setPlainMode', () => {
  afterEach(() => {
    setPlainMode(false);
  });

  it('should enable plain mode', () => {
    setPlainMode(true);
    const result = colorize('test', 'red');
    expect(result).not.toContain('\x1b');
  });

  it('should disable plain mode and allow colors', () => {
    setPlainMode(true);
    setPlainMode(false);
    const result = colorize('test', 'red');
    // After disabling plain mode, text should still be present
    expect(result).toContain('test');
  });
});