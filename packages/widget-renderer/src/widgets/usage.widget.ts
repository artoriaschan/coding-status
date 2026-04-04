/**
 * Usage widget stub
 *
 * Placeholder implementation for usage widget.
 * Full implementation in Plan 02-04.
 */

import type { Widget, WidgetSchema } from '../types.js';

export const UsageSchema: WidgetSchema = {
  id: 'usage',
  meta: {
    displayName: 'Usage',
    description: 'Usage for a specific dimension',
    category: 'limits',
  },
  options: {
    content: { color: 'cyan' },
    bar: {
      enabled: true,
    },
  },
};

export const UsageWidget: Widget = {
  name: 'usage',
  render(): string | null {
    // Stub - returns null until full implementation
    return null;
  },
};