/**
 * Tests for schema generation script
 *
 * Verifies JSON Schema generation from Zod schemas.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { generateSchemas } from '../../scripts/generate-schemas.js';

// Test output directory
const TEST_OUTPUT_DIR = join(process.cwd(), 'test-schemas-output');

describe('generateSchemas', () => {
  beforeAll(() => {
    // Create test output directory
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('config.schema.json generation', () => {
    it('Test 1: Generated config.schema.json contains $schema property pointing to Draft 7', async () => {
      await generateSchemas(TEST_OUTPUT_DIR);

      const configSchemaPath = join(TEST_OUTPUT_DIR, 'config.schema.json');
      expect(existsSync(configSchemaPath)).toBe(true);

      const schema = JSON.parse(readFileSync(configSchemaPath, 'utf-8'));
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });

    it('Test 2: Generated config.schema.json contains $id, title, description metadata', async () => {
      await generateSchemas(TEST_OUTPUT_DIR);

      const configSchemaPath = join(TEST_OUTPUT_DIR, 'config.schema.json');
      const schema = JSON.parse(readFileSync(configSchemaPath, 'utf-8'));

      expect(schema.$id).toBe('https://cdps.dev/schemas/config.schema.json');
      expect(schema.title).toBe('CDPS Configuration');
      expect(schema.description).toBe('Configuration for cdps CLI - cloud provider usage statusline');
    });

    it('Test 3: Config schema contains providers array with provider object', async () => {
      await generateSchemas(TEST_OUTPUT_DIR);

      const configSchemaPath = join(TEST_OUTPUT_DIR, 'config.schema.json');
      const schema = JSON.parse(readFileSync(configSchemaPath, 'utf-8'));

      // zodToJsonSchema uses $ref and definitions structure
      expect(schema.$ref).toBe('#/definitions/CDPSConfig');
      expect(schema.definitions).toBeDefined();
      expect(schema.definitions.CDPSConfig).toBeDefined();
      expect(schema.definitions.CDPSConfig.type).toBe('object');
      expect(schema.definitions.CDPSConfig.properties.providers).toBeDefined();
      expect(schema.definitions.CDPSConfig.properties.providers.type).toBe('array');
    });
  });

  describe('settings.schema.json generation', () => {
    it('Test 3: Generated settings.schema.json contains valid JSON Schema structure', async () => {
      await generateSchemas(TEST_OUTPUT_DIR);

      const settingsSchemaPath = join(TEST_OUTPUT_DIR, 'settings.schema.json');
      expect(existsSync(settingsSchemaPath)).toBe(true);

      const schema = JSON.parse(readFileSync(settingsSchemaPath, 'utf-8'));
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      // zodToJsonSchema uses $ref and definitions structure
      expect(schema.$ref).toBe('#/definitions/CDPSSettings');
      expect(schema.definitions).toBeDefined();
      expect(schema.definitions.CDPSSettings.type).toBe('object');
    });

    it('Test 4: Schema files are written to correct output directories', async () => {
      await generateSchemas(TEST_OUTPUT_DIR);

      const configSchemaPath = join(TEST_OUTPUT_DIR, 'config.schema.json');
      const settingsSchemaPath = join(TEST_OUTPUT_DIR, 'settings.schema.json');

      expect(existsSync(configSchemaPath)).toBe(true);
      expect(existsSync(settingsSchemaPath)).toBe(true);
    });

    it('Test 5: z.enum widget types generate proper JSON Schema enum', async () => {
      await generateSchemas(TEST_OUTPUT_DIR);

      const settingsSchemaPath = join(TEST_OUTPUT_DIR, 'settings.schema.json');
      const schema = JSON.parse(readFileSync(settingsSchemaPath, 'utf-8'));

      // Widget type should be an enum with correct values
      // Navigate through definitions structure
      const cdpSettingsDef = schema.definitions?.CDPSSettings;
      expect(cdpSettingsDef).toBeDefined();

      const rowsSchema = cdpSettingsDef.properties?.rows;
      expect(rowsSchema).toBeDefined();
      expect(rowsSchema.type).toBe('array');

      // Check inner array items for widget property
      const innerItemSchema = rowsSchema.items?.items;
      expect(innerItemSchema).toBeDefined();

      const widgetSchema = innerItemSchema.properties?.widget;
      expect(widgetSchema).toBeDefined();
      expect(widgetSchema.enum).toEqual(['provider', 'separator', 'usage', 'text']);
    });

    it('Test 6: Settings schema contains metadata $id, title, description', async () => {
      await generateSchemas(TEST_OUTPUT_DIR);

      const settingsSchemaPath = join(TEST_OUTPUT_DIR, 'settings.schema.json');
      const schema = JSON.parse(readFileSync(settingsSchemaPath, 'utf-8'));

      expect(schema.$id).toBe('https://cdps.dev/schemas/settings.schema.json');
      expect(schema.title).toBe('CDPS Settings');
      expect(schema.description).toBe('Widget layout settings for cdps statusline');
    });
  });

  describe('function behavior', () => {
    it('generateSchemas function exists and is callable', () => {
      expect(generateSchemas).toBeDefined();
      expect(typeof generateSchemas).toBe('function');
    });

    it('generateSchemas creates output directory if not exists', async () => {
      const newOutputDir = join(TEST_OUTPUT_DIR, 'nested', 'output');
      await generateSchemas(newOutputDir);

      expect(existsSync(newOutputDir)).toBe(true);
      expect(existsSync(join(newOutputDir, 'config.schema.json'))).toBe(true);
      expect(existsSync(join(newOutputDir, 'settings.schema.json'))).toBe(true);

      // Cleanup nested directory
      rmSync(newOutputDir, { recursive: true, force: true });
    });
  });
});