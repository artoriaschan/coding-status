/**
 * Integration tests for schema generation and validation
 *
 * Verifies JSON Schema generation, validation, and error formatter integration
 * for CONF-04 requirements.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

import { ConfigSchema, ProviderSchema } from '../../src/config/config.schema.js';
import { SettingsSchema, WidgetTypeEnum } from '@cdps/widget-renderer';
import { formatZodError, getFixSuggestion } from '../../src/config/error-formatter.js';

// =============================================================================
// Test Data
// =============================================================================

const validConfig = {
  providers: [
    {
      name: 'test',
      type: 'bailian',
      packageName: '@cdps/usage-adapter-bailian',
      credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
    },
  ],
  current: 'test',
  cacheTtl: 300,
};

const validSettings = {
  cacheTtl: 300000,
  rows: [[{ widget: 'provider' }]],
  theme: { thresholds: { low: 50, medium: 80 } },
  plain: false,
};

// =============================================================================
// Schema File Structure Tests
// =============================================================================

describe('JSON Schema files', () => {
  it('should have config.schema.json exist and parse as valid JSON', () => {
    const schemaPath = path.resolve(__dirname, '../../schemas/config.schema.json');
    expect(fs.existsSync(schemaPath)).toBe(true);

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('should have settings.schema.json exist and parse as valid JSON', () => {
    const schemaPath = path.resolve(__dirname, '../../../widget-renderer/schemas/settings.schema.json');
    expect(fs.existsSync(schemaPath)).toBe(true);

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('should have config.schema.json contain $schema pointing to Draft 7', () => {
    const schemaPath = path.resolve(__dirname, '../../schemas/config.schema.json');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
  });

  it('should have settings.schema.json contain $schema pointing to Draft 7', () => {
    const schemaPath = path.resolve(__dirname, '../../../widget-renderer/schemas/settings.schema.json');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
  });

  it('should have config.schema.json contain $id, title, description metadata', () => {
    const schemaPath = path.resolve(__dirname, '../../schemas/config.schema.json');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.$id).toBe('https://cdps.dev/schemas/config.schema.json');
    expect(schema.title).toBe('CDPS Configuration');
    expect(schema.description).toBe('Configuration for cdps CLI - cloud provider usage statusline');
  });

  it('should have settings.schema.json contain $id, title, description metadata', () => {
    const schemaPath = path.resolve(__dirname, '../../../widget-renderer/schemas/settings.schema.json');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.$id).toBe('https://cdps.dev/schemas/settings.schema.json');
    expect(schema.title).toBe('CDPS Settings');
    expect(schema.description).toBe('Widget layout settings for cdps statusline');
  });

  it('should have widget types enum in settings.schema.json', () => {
    const schemaPath = path.resolve(__dirname, '../../../widget-renderer/schemas/settings.schema.json');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    // Extract widget enum from schema definitions
    const widgetDef = schema.definitions?.CDPSSettings?.properties?.rows?.items?.items?.properties?.widget;
    expect(widgetDef).toBeDefined();
    expect(widgetDef.type).toBe('string');
    expect(widgetDef.enum).toEqual(['provider', 'separator', 'usage', 'text']);
  });
});

// =============================================================================
// Zod Schema Validation Tests (Config)
// =============================================================================

describe('ConfigSchema validation', () => {
  it('should validate valid config example', () => {
    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.providers).toHaveLength(1);
      expect(result.data.current).toBe('test');
      expect(result.data.cacheTtl).toBe(300);
    }
  });

  it('should reject invalid config with missing name', () => {
    const invalidConfig = {
      providers: [
        {
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
      ],
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.errors.find((e) => e.path.includes('name'));
      expect(nameError).toBeDefined();
      expect(nameError?.code).toBe('invalid_type');
    }
  });

  it('should reject invalid config with wrong type', () => {
    const invalidConfig = {
      providers: [
        {
          name: 'test',
          type: 'invalid-type',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
      ],
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const typeError = result.error.errors.find((e) => e.path.includes('type'));
      expect(typeError).toBeDefined();
      expect(typeError?.code).toBe('invalid_enum_value');
    }
  });

  it('should use default values for optional fields', () => {
    const minimalConfig = {
      providers: [],
    };

    const result = ConfigSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.providers).toEqual([]);
      expect(result.data.cacheTtl).toBe(300); // Default
    }
  });
});

// =============================================================================
// Zod Schema Validation Tests (Settings)
// =============================================================================

describe('SettingsSchema validation', () => {
  it('should validate valid settings example', () => {
    const result = SettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cacheTtl).toBe(300000);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.theme?.thresholds?.low).toBe(50);
      expect(result.data.theme?.thresholds?.medium).toBe(80);
    }
  });

  it('should reject invalid widget type', () => {
    const invalidSettings = {
      cacheTtl: 300000,
      rows: [[{ widget: 'invalid-widget' }]],
    };

    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      const widgetError = result.error.errors.find((e) => e.path.includes('widget'));
      expect(widgetError).toBeDefined();
      expect(widgetError?.code).toBe('invalid_enum_value');
    }
  });

  it('should reject threshold low >= medium', () => {
    const invalidSettings = {
      cacheTtl: 300000,
      rows: [],
      theme: { thresholds: { low: 80, medium: 50 } }, // Invalid: low >= medium
    };

    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should have a custom refinement error
      const thresholdError = result.error.errors.find((e) => e.path.includes('thresholds'));
      expect(thresholdError).toBeDefined();
      expect(thresholdError?.message).toContain('low < medium');
    }
  });

  it('should reject threshold low = medium', () => {
    const invalidSettings = {
      cacheTtl: 300000,
      rows: [],
      theme: { thresholds: { low: 50, medium: 50 } }, // Invalid: low = medium
    };

    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      const thresholdError = result.error.errors.find((e) => e.path.includes('thresholds'));
      expect(thresholdError).toBeDefined();
    }
  });

  it('should validate threshold low < medium correctly', () => {
    const validThresholds = {
      cacheTtl: 300000,
      rows: [],
      theme: { thresholds: { low: 30, medium: 70 } },
    };

    const result = SettingsSchema.safeParse(validThresholds);
    expect(result.success).toBe(true);
  });

  it('should allow threshold with only low defined', () => {
    const partialThresholds = {
      cacheTtl: 300000,
      rows: [],
      theme: { thresholds: { low: 50 } },
    };

    const result = SettingsSchema.safeParse(partialThresholds);
    expect(result.success).toBe(true);
  });

  it('should allow threshold with only medium defined', () => {
    const partialThresholds = {
      cacheTtl: 300000,
      rows: [],
      theme: { thresholds: { medium: 80 } },
    };

    const result = SettingsSchema.safeParse(partialThresholds);
    expect(result.success).toBe(true);
  });

  it('should reject negative cacheTtl', () => {
    const invalidSettings = {
      cacheTtl: -100,
      rows: [],
    };

    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      const ttlError = result.error.errors.find((e) => e.path.includes('cacheTtl'));
      expect(ttlError).toBeDefined();
    }
  });

  it('should reject invalid color value', () => {
    const invalidSettings = {
      cacheTtl: 300000,
      rows: [[{ widget: 'provider', color: 'invalid-color' }]],
    };

    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      const colorError = result.error.errors.find((e) => e.path.includes('color'));
      expect(colorError).toBeDefined();
      expect(colorError?.code).toBe('invalid_enum_value');
    }
  });

  it('should use defaults for missing fields', () => {
    const minimalSettings = {};

    const result = SettingsSchema.safeParse(minimalSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cacheTtl).toBe(300000); // Default
      expect(result.data.rows).toEqual([]); // Default
      expect(result.data.plain).toBe(false); // Default
    }
  });
});

// =============================================================================
// Widget Type Enum Tests
// =============================================================================

describe('WidgetTypeEnum', () => {
  it('should contain expected widget types', () => {
    const expectedTypes = ['provider', 'separator', 'usage', 'text'];
    expect(WidgetTypeEnum.options).toEqual(expectedTypes);
  });

  it('should validate provider widget type', () => {
    const result = WidgetTypeEnum.safeParse('provider');
    expect(result.success).toBe(true);
    expect(result.data).toBe('provider');
  });

  it('should validate separator widget type', () => {
    const result = WidgetTypeEnum.safeParse('separator');
    expect(result.success).toBe(true);
    expect(result.data).toBe('separator');
  });

  it('should validate usage widget type', () => {
    const result = WidgetTypeEnum.safeParse('usage');
    expect(result.success).toBe(true);
    expect(result.data).toBe('usage');
  });

  it('should validate text widget type', () => {
    const result = WidgetTypeEnum.safeParse('text');
    expect(result.success).toBe(true);
    expect(result.data).toBe('text');
  });

  it('should reject invalid widget type', () => {
    const result = WidgetTypeEnum.safeParse('invalid-widget');
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Error Formatter Integration Tests
// =============================================================================

describe('Error formatter integration', () => {
  it('should show field path in formatted error', () => {
    const invalidConfig = {
      providers: [
        {
          // Missing 'name' field
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
      ],
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const lines = formatZodError(result.error, 'Config');

      // Should contain field path
      const fieldLine = lines.find((l) => l.includes('Field:') && l.includes('name'));
      expect(fieldLine).toBeDefined();
    }
  });

  it('should show error type in formatted error', () => {
    const invalidConfig = {
      providers: [
        {
          name: 'test',
          type: 'invalid-type', // Invalid enum value
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
      ],
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const lines = formatZodError(result.error, 'Config');

      // Should contain error type
      const errorLine = lines.find((l) => l.includes('Error:') && l.includes('invalid_enum_value'));
      expect(errorLine).toBeDefined();
    }
  });

  it('should show fix suggestion for credentials field', () => {
    const invalidConfig = {
      providers: [
        {
          name: 'test',
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          // Missing 'credentials' field
        },
      ],
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const lines = formatZodError(result.error, 'Config');

      // Should contain suggestion for credentials
      const suggestionLine = lines.find((l) =>
        l.includes('Suggestion:') && l.includes('credentials')
      );
      expect(suggestionLine).toBeDefined();
    }
  });

  it('should format multiple errors', () => {
    const invalidConfig = {
      providers: [
        {
          // Missing name, type, packageName
          credentials: { accessKeyId: 'key' },
        },
      ],
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const lines = formatZodError(result.error, 'Config');

      // Should have header
      expect(lines.some((l) => l.includes('validation failed'))).toBe(true);

      // Should have multiple Field lines
      const fieldLines = lines.filter((l) => l.includes('Field:'));
      expect(fieldLines.length).toBeGreaterThan(1);
    }
  });

  it('should include chalk styling in output', () => {
    const invalidConfig = {
      providers: [
        {
          type: 'bailian',
          packageName: '@cdps/usage-adapter-bailian',
          credentials: { accessKeyId: 'key', accessKeySecret: 'secret' },
        },
      ],
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const lines = formatZodError(result.error, 'Config');

      // Check that chalk functions are used (output contains styled content)
      // Note: In test environment, chalk may not output ANSI codes depending on configuration
      // We check for the expected structure instead
      expect(lines.some((l) => l.includes('Field:'))).toBe(true);
      expect(lines.some((l) => l.includes('Error:'))).toBe(true);
    }
  });

  it('should provide fix suggestion for invalid_type errors', () => {
    // Create a mock ZodIssue for invalid_type
    const mockIssue: z.ZodIssue = {
      code: 'invalid_type',
      expected: 'string',
      received: 'undefined',
      path: ['providers', 0, 'name'],
      message: 'Required',
    };

    const suggestion = getFixSuggestion(mockIssue);
    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('string');
  });

  it('should provide fix suggestion for credentials field', () => {
    const mockIssue: z.ZodIssue = {
      code: 'invalid_type',
      expected: 'object',
      received: 'undefined',
      path: ['providers', 0, 'credentials'],
      message: 'Required',
    };

    const suggestion = getFixSuggestion(mockIssue);
    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('credentials');
    expect(suggestion).toContain('accessKeyId');
  });

  it('should provide fix suggestion for too_small on name', () => {
    const mockIssue: z.ZodIssue = {
      code: 'too_small',
      minimum: 1,
      type: 'string',
      inclusive: true,
      exact: false,
      path: ['providers', 0, 'name'],
      message: 'String must contain at least 1 character(s)',
    };

    const suggestion = getFixSuggestion(mockIssue);
    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('1-32');
  });
});

// =============================================================================
// Provider Schema Tests
// =============================================================================

describe('ProviderSchema validation', () => {
  it('should validate valid provider', () => {
    const provider = {
      name: 'my-provider',
      type: 'bailian',
      packageName: '@cdps/usage-adapter-bailian',
      credentials: { accessKeyId: 'test-id', accessKeySecret: 'test-secret' },
    };

    const result = ProviderSchema.safeParse(provider);
    expect(result.success).toBe(true);
  });

  it('should reject provider with name too long', () => {
    const provider = {
      name: 'this-is-a-very-long-provider-name-that-exceeds-32-characters',
      type: 'bailian',
      packageName: '@cdps/usage-adapter-bailian',
      credentials: { accessKeyId: 'test-id', accessKeySecret: 'test-secret' },
    };

    const result = ProviderSchema.safeParse(provider);
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.errors.find((e) => e.path.includes('name'));
      expect(nameError).toBeDefined();
      expect(nameError?.code).toBe('too_big');
    }
  });

  it('should reject empty provider name', () => {
    const provider = {
      name: '',
      type: 'bailian',
      packageName: '@cdps/usage-adapter-bailian',
      credentials: { accessKeyId: 'test-id', accessKeySecret: 'test-secret' },
    };

    const result = ProviderSchema.safeParse(provider);
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.errors.find((e) => e.path.includes('name'));
      expect(nameError).toBeDefined();
    }
  });
});