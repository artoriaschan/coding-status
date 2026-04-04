/**
 * Status line renderer
 *
 * Assembles widgets into a complete status line output.
 * Handles smart separator logic - removing leading, trailing, and consecutive separators.
 */

import type { RenderContext, Settings } from './types.js';
import { BUILTIN_WIDGETS } from './widgets/index.js';
import { setPlainMode } from './colors.js';

/** Rendered item for separator cleanup */
interface RenderedItem {
  /** Whether this is a separator widget */
  isSeparator: boolean;
  /** Rendered output string */
  output: string;
}

/**
 * Render the complete status line
 *
 * Implements smart separator logic:
 * - Empty/null widgets are filtered out
 * - Leading separators are removed
 * - Trailing separators are removed
 * - Consecutive separators are collapsed to one
 * - Output is single line joined with space
 *
 * @param ctx - Render context with provider, usage, and settings
 * @param settings - Settings with widget layout configuration
 * @returns Rendered status line string (single line, no newlines)
 */
export function renderStatusLine(ctx: RenderContext, settings: Settings): string {
  // Set plain mode based on settings
  setPlainMode(settings.plain ?? false);

  // Get first row only (single row for statusline)
  const row = settings.rows?.[0] ?? [];

  if (!row || row.length === 0) {
    return '';
  }

  // Render all widgets and collect non-null outputs
  const items: RenderedItem[] = [];

  for (const config of row) {
    const entry = BUILTIN_WIDGETS[config.widget];
    if (!entry) continue;

    const output = entry.widget.render(ctx, config);
    if (!output) continue;

    items.push({
      isSeparator: config.widget === 'separator',
      output,
    });
  }

  // Smart separator cleanup

  // Remove leading separators
  while (items.length > 0 && items[0].isSeparator) {
    items.shift();
  }

  // Remove trailing separators
  while (items.length > 0 && items[items.length - 1].isSeparator) {
    items.pop();
  }

  // Collapse consecutive separators (keep first one only)
  const cleaned: RenderedItem[] = [];
  for (const item of items) {
    // Skip if this is a separator and previous item was also a separator
    if (item.isSeparator && cleaned.length > 0 && cleaned[cleaned.length - 1].isSeparator) {
      continue;
    }
    cleaned.push(item);
  }

  // Join with single space (no newlines)
  return cleaned.map((item) => item.output).join(' ');
}