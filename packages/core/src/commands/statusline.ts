/**
 * Statusline command implementation
 *
 * Per D-17: Claude Code executes `cdps statusline` to render usage
 * This is the primary output command that Claude Code calls.
 */

import { Command } from 'commander';

import { loadConfig } from '../config/index.js';

/**
 * Register the statusline command with Commander program.
 *
 * Per D-17: Claude Code settings.json configures this command:
 * ```json
 * {
 *   "statusLine": {
 *     "type": "command",
 *     "command": "cdps statusline"
 *   }
 * }
 * ```
 *
 * Phase 3 stub: Outputs placeholder until Phase 5+6 (adapter + renderer integration).
 *
 * @param program - Commander program instance
 */
export function registerStatusline(program: Command): void {
  program
    .command('statusline')
    .description('Render statusline output for Claude Code')
    .action(async () => {
      const config = await loadConfig();

      if (!config.current) {
        // No provider configured - output nothing
        return;
      }

      // Phase 3 stub: Output placeholder text
      // Actual implementation:
      // 1. Load adapter for current provider (Phase 5)
      // 2. Fetch usage data via adapter API (Phase 5)
      // 3. Render via widget-renderer (Phase 6)
      const currentProvider = config.providers.find((p) => p.name === config.current);

      if (currentProvider) {
        // Stub output - shows provider name only
        console.log(`${currentProvider.name}`);
      }
    });
}