/**
 * Config store operations
 *
 * CRUD operations for config.json.
 * Handles loading, saving, and validating configuration.
 */

import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';

import { ConfigSchema, type Config } from './config.schema.js';
import { CONFIG_DIR, CONFIG_PATH } from './paths.js';

/**
 * Default configuration
 *
 * Used when config file doesn't exist or is invalid.
 */
const DEFAULT_CONFIG: Config = {
    providers: [],
    current: undefined,
    cacheTtl: 300,
};

/**
 * Load configuration from ~/.cdps/config.json
 *
 * Returns DEFAULT_CONFIG if the file doesn't exist or cannot be parsed.
 * Validates loaded config against ConfigSchema.
 *
 * @returns Promise resolving to Config object
 */
export async function loadConfig(): Promise<Config> {
    try {
        const content = await readFile(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(content);
        return ConfigSchema.parse(parsed);
    } catch {
        // File not found, parse error, or validation error
        // Return default config per research pattern
        return ConfigSchema.parse(DEFAULT_CONFIG);
    }
}

/**
 * Save configuration to ~/.cdps/config.json
 *
 * Creates the ~/.cdps/ directory if it doesn't exist.
 * Writes config as formatted JSON with 2-space indentation.
 * Sets file permissions to 600 (owner read/write only) for credential security.
 *
 * @param config - Config object to save
 * @returns Promise that resolves when write is complete
 */
export async function saveConfig(config: Config): Promise<void> {
    // Ensure directory exists (per D-16)
    await mkdir(CONFIG_DIR, { recursive: true });

    // Write config as formatted JSON
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    // Set permissions to 600 per D-12 (credentials protection)
    await chmod(CONFIG_PATH, 0o600);
}

/**
 * Get the config directory path
 *
 * Returns the ~/.cdps/ directory path for external use.
 *
 * @returns Config directory path
 */
export function getConfigDir(): string {
    return CONFIG_DIR;
}
