/**
 * Statusline command implementation
 *
 * Per RESEARCH.md Open Questions:
 * - Implement statusline command structure in Phase 3
 * - Output placeholder until Phase 6 (adapter integration)
 */

import { Command } from 'commander';

import { loadConfig } from '../config/index.js';
import {
  loadSettings,
  renderStatusLine,
  type RenderContext,
} from '@cdps/widget-renderer';

/**
 * Register the statusline command with Commander program.
 *
 * Per RESEARCH.md Open Questions:
 * - Implement statusline command structure in Phase 3
 * - Output placeholder until Phase 6 (adapter integration)
 *
 * @param program - Commander program instance
 */
export function registerStatusline(program: Command): void {
  program
    .command('statusline')
    .description('Output statusline for Claude Code (Phase 6: full integration)')
    .action(async () => {
      // Load config and settings
      const config = await loadConfig();
      const settings = await loadSettings();

      // Phase 3 stub: Output placeholder
      // Phase 6: Full implementation with adapter loading and usage data
      if (!config.current) {
        console.log('No provider configured. Run `cdps add` first.');
        return;
      }

      const currentProvider = config.providers.find((p) => p.name === config.current);
      if (!currentProvider) {
        console.log('Current provider not found in config.');
        return;
      }

      // Stub context - no actual usage data until Phase 6
      const ctx: RenderContext = {
        provider: {
          name: currentProvider.name,
          type: currentProvider.type,
        },
        usage: null, // No adapter data in Phase 3
        settings,
      };

      // Render and output
      const output = renderStatusLine(ctx, settings);
      console.log(output);
    });
}