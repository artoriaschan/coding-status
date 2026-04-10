/**
 * Config paths constants
 *
 * Defines file paths for configuration storage.
 * All paths are under ~/.coding-status/ directory for user-local config.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Directory for all coding-status configuration files
 */
export const CONFIG_DIR = join(homedir(), '.coding-status');

/**
 * Path to the main configuration file (providers, credentials)
 */
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

/**
 * Path to the settings file (widget layout, theme)
 * Shared with widget-renderer for consistency
 */
export const SETTINGS_PATH = join(CONFIG_DIR, 'settings.json');
