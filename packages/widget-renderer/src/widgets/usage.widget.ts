/**
 * Usage widget
 *
 * Displays usage data for a specific dimension from the context.
 * Supports usage bar visualization with color coding.
 *
 * @example
 * { widget: 'usage', options: { dimension: '5h' } }  // Shows 5h usage
 * { widget: 'usage', options: { dimension: '5h', showBar: true, maxValue: 100000 } }
 */

import type { Widget, RenderContext, WidgetConfig, WidgetSchema, UsageBarColors } from '../types.js';
import { colorize, createUsageBar } from '../colors.js';
import { getOption, renderWidgetWithLabel } from '../shared/widget.helper.js';

/** Usage widget schema - defines all GUI metadata */
export const UsageSchema: WidgetSchema = {
  id: 'usage',
  meta: {
    displayName: 'Usage',
    description: 'Display usage for a specific dimension',
    category: 'limits',
  },
  options: {
    content: { color: 'cyan' },
    bar: {
      enabled: true,
      colors: {
        low: 'green',
        medium: 'yellow',
        high: 'red',
      },
    },
    custom: [
      {
        key: 'dimension',
        type: 'text',
        label: 'Dimension Key',
        default: '5h',
        placeholder: 'e.g., "5h", "week", "month"',
      },
      {
        key: 'showBar',
        type: 'checkbox',
        label: 'Show Usage Bar',
        default: true,
      },
      {
        key: 'showPercent',
        type: 'checkbox',
        label: 'Show Percentage',
        default: true,
      },
      {
        key: 'maxValue',
        type: 'number',
        label: 'Max Value',
        default: 100000,
      },
      {
        key: 'label',
        type: 'text',
        label: 'Label',
        default: '',
        maxLength: 20,
      },
      {
        key: 'naVisibility',
        type: 'select',
        label: 'Visibility on N/A',
        options: [
          { value: 'hide', label: 'Hide' },
          { value: 'na', label: 'Show N/A' },
          { value: 'dash', label: 'Show -' },
        ],
        default: 'hide',
      },
    ],
  },
};

export const UsageWidget: Widget = {
  name: 'usage',

  render(ctx: RenderContext, config?: WidgetConfig): string | null {
    // Get dimension from options - required
    const dimension = getOption<string>(config, 'dimension');
    if (!dimension) return null;

    // Get usage value for dimension (default to 0)
    const value = ctx.usageData[dimension] ?? 0;

    // Get maxValue for percent calculation (default 100000)
    const maxValue = getOption<number>(config, 'maxValue') ?? 100000;

    // Calculate percentage (clamp to 100)
    const percent = Math.min((value / maxValue) * 100, 100);

    // Build content string
    let content = value.toLocaleString();

    // Add usage bar if enabled
    if (getOption(config, 'showBar')) {
      const barColors = getOption<UsageBarColors>(config, 'barColors');
      const showPercent = getOption<boolean>(config, 'showPercent');
      const bar = createUsageBar(percent, { colors: barColors, showPercent });
      if (bar) {
        content += ' ' + bar;
      }
    }

    // Apply optional label
    return renderWidgetWithLabel(content, config, 'cyan');
  },
};