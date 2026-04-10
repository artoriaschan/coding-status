/**
 * Config module barrel export
 *
 * Exports all config-related functionality:
 * - Path constants (CONFIG_DIR, CONFIG_PATH, SETTINGS_PATH)
 * - Schema types (ProviderSchema, ConfigSchema, Provider, Config)
 * - Store operations (loadConfig, saveConfig, getConfigDir)
 */

// Paths
export { CONFIG_DIR, CONFIG_PATH, SETTINGS_PATH } from './paths.js';

// Schema
export { ProviderSchema, ConfigSchema, type Provider, type Config } from './config.schema.js';

// Store operations
export { loadConfig, saveConfig, getConfigDir } from './config-store.js';

// Error formatting
export { formatZodError } from './error-formatter.js';

// Claude Code integration
export { updateClaudeSettings, CLAUDE_SETTINGS_PATH } from './claude-settings.js';
