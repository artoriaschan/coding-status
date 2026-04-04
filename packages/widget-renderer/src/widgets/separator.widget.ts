/**
 * Separator widget stub
 *
 * Placeholder implementation for separator widget.
 * Full implementation in Plan 02-04.
 */

import type { Widget, WidgetSchema } from '../types.js';

export const SeparatorSchema: WidgetSchema = {
  id: 'separator',
  meta: {
    displayName: 'Separator',
    description: 'Visual separator between widgets',
    category: 'layout',
  },
  options: {
    content: { color: 'dim' },
  },
};

export const SeparatorWidget: Widget = {
  name: 'separator',
  render(): string | null {
    // Stub - returns null until full implementation
    return null;
  },
};