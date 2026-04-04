/**
 * Provider widget
 *
 * Displays the current cloud provider name from the context.
 * Uses providerDisplayName with activeProvider as fallback.
 *
 * @example
 * { widget: 'provider' }  // Default: cyan colored provider name
 * { widget: 'provider', options: { label: 'Using' } }  // "Using: ProviderName"
 */

import type { Widget, RenderContext, WidgetConfig, WidgetSchema } from '../types.js';
import { colorize } from '../colors.js';
import { renderWidgetWithLabel } from '../shared/widget.helper.js';

/** Provider widget schema - defines all GUI metadata */
export const ProviderSchema: WidgetSchema = {
  id: 'provider',
  meta: {
    displayName: 'Provider',
    description: 'Current cloud provider name',
    category: 'info',
  },
  options: {
    content: { color: 'cyan' },
    custom: [
      {
        key: 'label',
        type: 'text',
        label: 'Label',
        default: '',
        maxLength: 20,
        placeholder: 'e.g., "Using"',
      },
      {
        key: 'labelColor',
        type: 'color',
        label: 'Label Color',
        default: 'dim',
      },
    ],
  },
};

export const ProviderWidget: Widget = {
  name: 'provider',

  render(ctx: RenderContext, config?: WidgetConfig): string | null {
    // Get display name with fallback to activeProvider (handle empty string too)
    const displayName = ctx.providerDisplayName || ctx.activeProvider;

    // Return null if no provider info available
    if (!displayName) return null;

    // Colorize the content
    const content = colorize(displayName, config?.color ?? 'cyan');

    // Apply optional label
    return renderWidgetWithLabel(content, config, 'cyan');
  },
};