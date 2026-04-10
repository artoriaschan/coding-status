/**
 * Claude Code settings.json integration
 *
 * Provides safe, idempotent updates to Claude Code's settings.json
 * for statusline command registration.
 *
 * Per D-17: Command format is { type: "command", command: "coding-status statusline" }
 * Per D-18: Safe idempotent update - removes all statusline variants (case-insensitive)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Path to Claude Code settings.json
 */
export const CLAUDE_SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

/**
 * The statusline command to register in Claude Code settings
 */
const STATUSLINE_COMMAND = 'coding-status statusline';

/**
 * Claude Code settings.json structure
 */
interface ClaudeSettings {
    [key: string]: unknown;
}

/**
 * Update Claude Code settings.json with statusline configuration.
 *
 * Per D-18:
 * - Safe idempotent update
 * - Remove all statusline related configs (case-insensitive)
 * - Add new coding-status config
 *
 * @returns true if updated, false if settings.json doesn't exist
 * @throws Error if file read/write fails or JSON is malformed
 */
export async function updateClaudeSettings(): Promise<boolean> {
    // 1. Check if settings.json exists
    if (!existsSync(CLAUDE_SETTINGS_PATH)) {
        return false;
    }

    // 2. Read current settings
    let settings: ClaudeSettings;
    try {
        const content = readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8');
        settings = JSON.parse(content) as ClaudeSettings;
    } catch (error) {
        throw new Error(
            `Failed to read Claude Code settings.json: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    // 3. Remove all statusline entries (case-insensitive) - per D-18
    const keysToRemove: string[] = [];
    for (const key in settings) {
        if (key.toLowerCase() === 'statusline') {
            keysToRemove.push(key);
        }
    }
    for (const key of keysToRemove) {
        delete settings[key];
    }

    // 4. Add correct statusLine configuration - per D-17
    settings.statusLine = {
        type: 'command',
        command: STATUSLINE_COMMAND,
    };

    // 5. Write back to settings.json with newline at end
    try {
        writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    } catch (error) {
        throw new Error(
            `Failed to write Claude Code settings.json: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    return true;
}
