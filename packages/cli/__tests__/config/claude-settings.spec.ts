/**
 * Claude Code settings.json integration tests
 *
 * Tests for updateClaudeSettings function that safely updates
 * Claude Code's settings.json with statusline command configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { updateClaudeSettings, CLAUDE_SETTINGS_PATH } from '../../src/config/claude-settings.js';

// Mock node:fs
vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

describe('claude-settings', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('CLAUDE_SETTINGS_PATH', () => {
        it('should equal ~/.claude/settings.json', () => {
            expect(CLAUDE_SETTINGS_PATH).toBe(join(homedir(), '.claude', 'settings.json'));
        });
    });

    describe('updateClaudeSettings', () => {
        it('should return false when settings.json does not exist', async () => {
            vi.mocked(existsSync).mockReturnValue(false);

            const result = await updateClaudeSettings();

            expect(result).toBe(false);
            expect(readFileSync).not.toHaveBeenCalled();
            expect(writeFileSync).not.toHaveBeenCalled();
        });

        it('should remove existing statusline entries (case-insensitive) and add correct one', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({
                    statusLine: { type: 'command', command: 'old-command' },
                    StatusLine: { type: 'command', command: 'another-command' },
                    STATUSLINE: { type: 'command', command: 'yet-another' },
                    otherSetting: 'preserved',
                })
            );
            vi.mocked(writeFileSync).mockReturnValue(undefined);

            const result = await updateClaudeSettings();

            expect(result).toBe(true);

            // Verify writeFileSync was called with correct settings
            expect(writeFileSync).toHaveBeenCalledTimes(1);
            const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
            const writtenSettings = JSON.parse(writtenContent);

            // Should have only one statusLine entry (lowercase)
            expect(writtenSettings.statusLine).toEqual({
                type: 'command',
                command: 'coding-status statusline',
            });

            // Should NOT have any other case variants
            expect(writtenSettings.StatusLine).toBeUndefined();
            expect(writtenSettings.STATUSLINE).toBeUndefined();

            // Should preserve other settings
            expect(writtenSettings.otherSetting).toBe('preserved');
        });

        it('should preserve other settings keys unchanged', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({
                    theme: 'dark',
                    editor: { fontSize: 14 },
                    customKey: 'customValue',
                })
            );
            vi.mocked(writeFileSync).mockReturnValue(undefined);

            const result = await updateClaudeSettings();

            expect(result).toBe(true);

            const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
            const writtenSettings = JSON.parse(writtenContent);

            expect(writtenSettings.theme).toBe('dark');
            expect(writtenSettings.editor).toEqual({ fontSize: 14 });
            expect(writtenSettings.customKey).toBe('customValue');
            expect(writtenSettings.statusLine).toEqual({
                type: 'command',
                command: 'coding-status statusline',
            });
        });

        it('should throw with clear error when JSON is malformed', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue('not valid json {{{');

            await expect(updateClaudeSettings()).rejects.toThrow(
                'Failed to read Claude Code settings.json'
            );
        });

        it('should throw with clear error when writeFileSync fails', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ existing: 'settings' }));
            vi.mocked(writeFileSync).mockImplementation(() => {
                throw new Error('EACCES: permission denied');
            });

            await expect(updateClaudeSettings()).rejects.toThrow(
                'Failed to write Claude Code settings.json'
            );
        });

        it('should write JSON with 2-space indent and trailing newline', async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));
            vi.mocked(writeFileSync).mockReturnValue(undefined);

            await updateClaudeSettings();

            const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;

            // Should have 2-space indent (check for formatted JSON)
            expect(writtenContent).toContain('\n  "statusLine"');

            // Should have trailing newline
            expect(writtenContent.endsWith('\n')).toBe(true);
        });
    });
});
