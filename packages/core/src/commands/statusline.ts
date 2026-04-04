/**
 * Statusline command implementation
 *
 * Phase 6: Full integration with adapter loading, timeout protection,
 * silent failure mode, and proper output format per D-14~21.
 */

import { Command } from 'commander';

import { loadConfig } from '../config/index.js';
import {
  loadSettings,
  renderStatusLine,
  setPlainMode,
  type RenderContext,
  type Settings,
} from '@cdps/widget-renderer';
import { AdapterLoader } from '../adapters/loader.js';
import { withTimeout, TimeoutError, STATUSLINE_TIMEOUT_MS } from '../utils/index.js';
import type { Provider } from '../config/index.js';

/**
 * Register the statusline command with Commander program.
 *
 * Per D-14~21:
 * - D-14: Overall timeout via withTimeout wrapper (1000ms)
 * - D-15: Timeout fallback to provider name only
 * - D-16: Promise.allSettled for partial success
 * - D-17: Adapter errors return provider name only
 * - D-18: process.stdout.write() not console.log()
 * - D-19: NO_COLOR check before setPlainMode()
 * - D-20: loadSettings() returns DEFAULT_SETTINGS on missing file
 * - D-21: Fetch all dimensions, render filters by settings
 *
 * @param program - Commander program instance
 */
export function registerStatusline(program: Command): void {
  program
    .command('statusline')
    .description('Output statusline for Claude Code (Phase 6: full integration)')
    .action(async () => {
      try {
        const output = await executeStatusline();
        process.stdout.write(output); // D-18: no newline
      } catch {
        // Silent failure per D-15/D-16
        process.stdout.write('');
      }
    });
}

/**
 * Execute statusline and return output string
 *
 * Handles config/settings loading, NO_COLOR check, adapter integration,
 * timeout protection, and silent failure modes.
 *
 * @returns Output string for statusline (empty on no provider, provider name on error)
 */
async function executeStatusline(): Promise<string> {
  // 1. Load config and settings (D-20: returns DEFAULT_SETTINGS if missing)
  const config = await loadConfig();
  const settings = await loadSettings();

  // 2. NO_COLOR check (D-19)
  const plain = process.env.NO_COLOR !== undefined || (settings.plain ?? false);
  setPlainMode(plain);

  // 3. Check for current provider
  if (!config.current) {
    return ''; // No provider configured
  }

  const currentProvider = config.providers.find((p) => p.name === config.current);
  if (!currentProvider) {
    return ''; // Provider not found
  }

  // 4. Wrap entire data fetching in timeout (D-14)
  try {
    return await withTimeout(
      fetchAndRender(currentProvider, settings),
      STATUSLINE_TIMEOUT_MS,
      'Statusline execution'
    );
  } catch (error) {
    // Timeout or adapter error - return provider name only (D-15)
    if (error instanceof TimeoutError) {
      return currentProvider.name;
    }
    // Adapter errors also fall back to provider name (D-17)
    return currentProvider.name;
  }
}

/**
 * Fetch usage data from adapter and render statusline
 *
 * Handles adapter loading, dimension fetching, partial success
 * with Promise.allSettled, and render context assembly.
 *
 * @param currentProvider - Current provider config
 * @param settings - User settings for rendering
 * @returns Rendered statusline string
 */
async function fetchAndRender(
  currentProvider: Provider,
  settings: Settings
): Promise<string> {
  const loader = AdapterLoader.getInstance();

  try {
    // Load adapter
    const adapter = await loader.getAdapter(
      currentProvider.packageName,
      currentProvider.credentials
    );

    // Get dimensions (D-21)
    const dimensions = await adapter.getDimensions();

    // Fetch usage for all dimensions in parallel (D-16: partial success)
    const results = await Promise.allSettled(
      dimensions.map((d) => adapter.getUsage(d.key))
    );

    // Collect successful results only (D-16)
    const usageData: Record<string, number> = {};
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        usageData[dimensions[i].key] = result.value;
      }
      // Silently ignore rejected results per D-16
    }

    // Assemble RenderContext
    const ctx: RenderContext = {
      activeProvider: currentProvider.name,
      providerDisplayName: adapter.displayName,
      dimensions,
      usageData,
      terminalWidth: process.stdout.columns ?? 80,
      settings,
    };

    // Render and return
    return renderStatusLine(ctx, settings);
  } catch (error) {
    // Adapter load/init error - return provider name only (D-17)
    return currentProvider.name;
  }
}