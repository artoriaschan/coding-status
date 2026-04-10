/**
 * Settings loader for widget layout configuration
 *
 * Loads and saves widget layout settings from ~/.coding-status/settings.json
 * with sensible defaults for first-time users.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Settings, WidgetConfig } from './types.js';

/**
 * Path to the settings file in user's home directory
 */
export const SETTINGS_PATH = join(homedir(), '.coding-status', 'settings.json');

/**
 * Default settings for widget layout
 *
 * Provides a sensible default layout with provider, separator, and usage widgets.
 * Theme includes standard bar colors and thresholds for usage visualization.
 */
export const DEFAULT_SETTINGS: Settings = {
    cacheTtl: 300000, // 5 minutes in milliseconds
    rows: [
        [
            { widget: 'provider', color: 'cyan' } as WidgetConfig,
            { widget: 'separator' } as WidgetConfig,
            { widget: 'usage', options: { dimension: '5h', label: '5h' } } as WidgetConfig,
        ],
    ],
    theme: {
        barColors: { low: 'green', medium: 'yellow', high: 'red' },
        thresholds: { low: 50, medium: 80 },
    },
    plain: false,
};

/**
 * Load settings from ~/.coding-status/settings.json
 *
 * Returns DEFAULT_SETTINGS if the file doesn't exist or cannot be parsed.
 * This ensures the application always has valid settings to work with.
 *
 * @returns Promise resolving to Settings object
 */
export async function loadSettings(): Promise<Settings> {
    try {
        const content = await readFile(SETTINGS_PATH, 'utf-8');
        return JSON.parse(content) as Settings;
    } catch {
        // File not found, parse error, or other IO issues
        // Return defaults to ensure app always has valid settings
        return DEFAULT_SETTINGS;
    }
}

/**
 * Save settings to ~/.coding-status/settings.json
 *
 * Creates the ~/.coding-status/ directory if it doesn't exist.
 * Writes settings as formatted JSON with 2-space indentation.
 *
 * @param settings - Settings object to save
 * @returns Promise that resolves when write is complete
 */
export async function saveSettings(settings: Settings): Promise<void> {
    const dir = join(homedir(), '.coding-status');
    await mkdir(dir, { recursive: true });
    await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
