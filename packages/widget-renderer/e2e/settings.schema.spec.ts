/**
 * Settings schema tests
 *
 * Tests for SettingsSchema Zod validation.
 * Validates widget types, threshold constraints, color values.
 */

import { describe, it, expect } from 'vitest';

import { SettingsSchema, WidgetTypeEnum, WidgetConfigSchema, ThemeSchema } from '../src/settings.schema.js';
import { DEFAULT_SETTINGS } from '../src/settings.js';

describe('WidgetTypeEnum', () => {
  it('should accept valid widget type provider', () => {
    const result = WidgetTypeEnum.safeParse('provider');
    expect(result.success).toBe(true);
  });

  it('should accept valid widget type separator', () => {
    const result = WidgetTypeEnum.safeParse('separator');
    expect(result.success).toBe(true);
  });

  it('should accept valid widget type usage', () => {
    const result = WidgetTypeEnum.safeParse('usage');
    expect(result.success).toBe(true);
  });

  it('should accept valid widget type text', () => {
    const result = WidgetTypeEnum.safeParse('text');
    expect(result.success).toBe(true);
  });

  it('should reject invalid widget type', () => {
    const result = WidgetTypeEnum.safeParse('invalid-widget');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_enum_value');
    }
  });
});

describe('WidgetConfigSchema', () => {
  it('should validate widget config with required widget field', () => {
    const validConfig = { widget: 'provider' };
    const result = WidgetConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should validate widget config with optional color', () => {
    const validConfig = { widget: 'provider', color: 'cyan' };
    const result = WidgetConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid color value', () => {
    const invalidConfig = { widget: 'provider', color: 'invalid-color' };
    const result = WidgetConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should validate widget config with colors object', () => {
    const validConfig = { widget: 'usage', colors: { low: 'green', high: 'red' } };
    const result = WidgetConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid color in colors object', () => {
    const invalidConfig = { widget: 'usage', colors: { low: 'invalid-color' } };
    const result = WidgetConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should validate widget config with options', () => {
    const validConfig = { widget: 'usage', options: { dimension: '5h', label: '5h' } };
    const result = WidgetConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });
});

describe('ThemeSchema', () => {
  it('should validate theme with barColors', () => {
    const validTheme = {
      barColors: { low: 'green', medium: 'yellow', high: 'red' },
    };
    const result = ThemeSchema.safeParse(validTheme);
    expect(result.success).toBe(true);
  });

  it('should validate theme with thresholds (low < medium)', () => {
    const validTheme = {
      thresholds: { low: 50, medium: 80 },
    };
    const result = ThemeSchema.safeParse(validTheme);
    expect(result.success).toBe(true);
  });

  it('should reject thresholds where low >= medium', () => {
    const invalidTheme = {
      thresholds: { low: 80, medium: 80 },
    };
    const result = ThemeSchema.safeParse(invalidTheme);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Check that there's a custom refinement error
      const customError = result.error.issues.find(
        (issue) => issue.code === 'custom'
      );
      expect(customError).toBeDefined();
      // Check the message contains 'threshold' or the path includes 'thresholds'
      expect(
        customError?.message.toLowerCase().includes('threshold') ||
        customError?.path.includes('thresholds')
      ).toBe(true);
    }
  });

  it('should reject thresholds where low > medium', () => {
    const invalidTheme = {
      thresholds: { low: 90, medium: 50 },
    };
    const result = ThemeSchema.safeParse(invalidTheme);
    expect(result.success).toBe(false);
  });

  it('should accept thresholds with only low defined', () => {
    const validTheme = {
      thresholds: { low: 50 },
    };
    const result = ThemeSchema.safeParse(validTheme);
    expect(result.success).toBe(true);
  });

  it('should accept thresholds with only medium defined', () => {
    const validTheme = {
      thresholds: { medium: 80 },
    };
    const result = ThemeSchema.safeParse(validTheme);
    expect(result.success).toBe(true);
  });

  it('should reject threshold values outside 0-100 range', () => {
    const invalidTheme = {
      thresholds: { low: 150 },
    };
    const result = ThemeSchema.safeParse(invalidTheme);
    expect(result.success).toBe(false);
  });
});

describe('SettingsSchema', () => {
  describe('valid settings validation', () => {
    it('should validate DEFAULT_SETTINGS', () => {
      const result = SettingsSchema.safeParse(DEFAULT_SETTINGS);
      expect(result.success).toBe(true);
    });

    it('should validate settings with custom rows', () => {
      const validSettings = {
        cacheTtl: 300000,
        rows: [
          [
            { widget: 'provider', color: 'cyan' },
            { widget: 'separator' },
            { widget: 'usage', options: { dimension: '5h' } },
          ],
        ],
        theme: {
          barColors: { low: 'green', medium: 'yellow', high: 'red' },
          thresholds: { low: 50, medium: 80 },
        },
        plain: false,
      };
      const result = SettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
    });
  });

  describe('default values', () => {
    it('should apply default cacheTtl of 300000 when not specified', () => {
      const settingsWithoutCacheTtl = {
        rows: [],
      };
      const result = SettingsSchema.parse(settingsWithoutCacheTtl);
      expect(result.cacheTtl).toBe(300000);
    });

    it('should default rows to empty array', () => {
      const emptySettings = {};
      const result = SettingsSchema.parse(emptySettings);
      expect(result.rows).toEqual([]);
    });

    it('should default plain to false', () => {
      const settingsWithoutPlain = {
        rows: [],
      };
      const result = SettingsSchema.parse(settingsWithoutPlain);
      expect(result.plain).toBe(false);
    });
  });

  describe('invalid settings', () => {
    it('should reject negative cacheTtl', () => {
      const invalidSettings = {
        cacheTtl: -100,
        rows: [],
      };
      const result = SettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('too_small');
      }
    });

    it('should reject zero cacheTtl', () => {
      const invalidSettings = {
        cacheTtl: 0,
        rows: [],
      };
      const result = SettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer cacheTtl', () => {
      const invalidSettings = {
        cacheTtl: 300.5,
        rows: [],
      };
      const result = SettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it('should reject invalid widget type in rows', () => {
      const invalidSettings = {
        rows: [[{ widget: 'invalid-widget' }]],
      };
      const result = SettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it('should reject invalid color value in rows', () => {
      const invalidSettings = {
        rows: [[{ widget: 'provider', color: 'invalid-color' }]],
      };
      const result = SettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });
  });

  describe('partial settings merge with defaults', () => {
    it('should merge partial settings with defaults', () => {
      const partialSettings = {
        rows: [[{ widget: 'text', options: { text: 'Hello' } }]],
      };
      const result = SettingsSchema.parse(partialSettings);
      expect(result.cacheTtl).toBe(300000); // default
      expect(result.plain).toBe(false); // default
      expect(result.rows).toHaveLength(1);
    });
  });
});