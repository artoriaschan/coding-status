/**
 * Init command implementation
 *
 * Per D-16:
 * - Creates ~/.cdps/ directory (via saveConfig mkdir)
 * - Creates config.json with empty providers array
 * - Creates settings.json with DEFAULT_SETTINGS
 * - Updates Claude Code settings.json (if exists)
 */

import { Command } from 'commander';

import { saveConfig, updateClaudeSettings } from '../config/index.js';
import { saveSettings, DEFAULT_SETTINGS } from '@cdps/widget-renderer';

/**
 * Register the init command with Commander program.
 *
 * Per D-16:
 * - Creates ~/.cdps/ directory (via saveConfig mkdir)
 * - Creates config.json with empty providers array
 * - Creates settings.json with DEFAULT_SETTINGS
 * - Updates Claude Code settings.json (if exists)
 *
 * @param program - Commander program instance
 */
export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize ~/.cdps/ directory and configure Claude Code statusline')
    .action(async () => {
      console.log('Initializing cdps...');

      // 1. Create config.json with empty providers array (per D-16)
      await saveConfig({
        providers: [],
        current: undefined,
        cacheTtl: 300,
      });

      // 2. Create settings.json with DEFAULT_SETTINGS (per D-16)
      await saveSettings(DEFAULT_SETTINGS);

      // 3. Update Claude Code settings.json (per D-16)
      const claudeUpdated = await updateClaudeSettings();
      if (claudeUpdated) {
        console.log('Updated Claude Code settings.json');
      } else {
        console.log('Claude Code settings.json not found (skipped)');
      }

      console.log('Initialization complete!');
      console.log('Config directory: ~/.cdps/');
      console.log('Next step: Run `cdps add` to add a provider');
    });
}