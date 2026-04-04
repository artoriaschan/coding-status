/**
 * Provider widget stub
 *
 * Placeholder implementation for provider widget.
 * Full implementation in Plan 02-04.
 */

import type { Widget, WidgetSchema } from '../types.js';

export const ProviderSchema: WidgetSchema = {
  id: 'provider',
  meta: {
    displayName: 'Provider',
    description: 'Current provider name',
    category: 'limits',
  },
  options: {
    content: { color: 'cyan' },
  },
};

export const ProviderWidget: Widget = {
  name: 'provider',
  render(): string | null {
    // Stub - returns null until full implementation
    return null;
  },
};