/**
 * Schema generation script
 *
 * Generates JSON Schema files from Zod schemas at build time.
 * Per D-01 to D-03, D-15 to D-18:
 * - Uses zod-to-json-schema for conversion
 * - Adds Draft 7 metadata ($schema, $id, title, description)
 * - Outputs to schemas/ directories
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { ConfigSchema } from '../src/config/config.schema.js';
import { SettingsSchema } from '@coding-status/widget-renderer';

// Get script directory for reliable path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPackageDir = dirname(__dirname); // packages/cli
const monorepoRoot = dirname(dirname(cliPackageDir)); // monorepo root

/**
 * Generate JSON Schema files from Zod schemas
 *
 * @param outputDir - Directory to write schema files (defaults to package schemas dirs)
 */
export function generateSchemas(outputDir?: string): void {
    // Default output directories - use script location for reliable paths
    const coreSchemasDir = outputDir ? outputDir : join(cliPackageDir, 'schemas');
    const widgetSchemasDir = outputDir
        ? outputDir
        : join(monorepoRoot, 'packages', 'widget-renderer', 'schemas');

    // Ensure directories exist (D-18)
    mkdirSync(coreSchemasDir, { recursive: true });
    if (!outputDir) {
        mkdirSync(widgetSchemasDir, { recursive: true });
    }

    // Generate config.schema.json per D-01, D-17
    const configJsonSchema = zodToJsonSchema(ConfigSchema, {
        name: 'CDPSConfig',
        nameDefinitions: 'definitions',
    });

    // Add Draft 7 metadata (D-17)
    const configSchemaWithMeta = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: 'https://coding-status.dev/schemas/config.schema.json',
        title: 'Coding Status Configuration',
        description: 'Configuration for coding-status CLI - cloud provider usage statusline',
        ...configJsonSchema,
    };

    const configSchemaPath = join(coreSchemasDir, 'config.schema.json');
    writeFileSync(configSchemaPath, JSON.stringify(configSchemaWithMeta, null, 4) + '\n', 'utf-8');

    // Generate settings.schema.json per D-02, D-17
    const settingsJsonSchema = zodToJsonSchema(SettingsSchema, {
        name: 'CDPSSettings',
        nameDefinitions: 'definitions',
    });

    // Add Draft 7 metadata (D-17)
    const settingsSchemaWithMeta = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: 'https://coding-status.dev/schemas/settings.schema.json',
        title: 'Coding Status Settings',
        description: 'Widget layout settings for coding-status statusline',
        ...settingsJsonSchema,
    };

    const settingsSchemaPath = outputDir
        ? join(outputDir, 'settings.schema.json')
        : join(widgetSchemasDir, 'settings.schema.json');
    writeFileSync(
        settingsSchemaPath,
        JSON.stringify(settingsSchemaWithMeta, null, 4) + '\n',
        'utf-8'
    );

    console.log('Generated schemas successfully');
    console.log(`  - ${configSchemaPath}`);
    console.log(`  - ${settingsSchemaPath}`);
}

// Run when executed directly
generateSchemas();
