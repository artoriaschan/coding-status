#!/usr/bin/env node
/**
 * CDPS - Cloud provider usage statusline for Claude Code
 *
 * Bootstrap entry point.
 *
 * Per D-10 and RESEARCH.md Pattern 1:
 * - Set FORCE_COLOR before any imports
 * - Dynamically import CLI handler
 */

// Export adapters module for external use
export * from './adapters/index.js';

// Force colors BEFORE any imports (chalk requires this)
process.env.FORCE_COLOR = '1';

// Dynamic import ensures FORCE_COLOR is set first
import('./cli.js')
  .then(({ cli }) => {
    cli(process.argv.slice(2));
  })
  .catch((error) => {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  });