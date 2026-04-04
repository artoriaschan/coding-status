/**
 * Text widget stub
 *
 * Placeholder implementation for text widget.
 * Full implementation in Plan 02-04.
 */

import type { Widget, WidgetSchema } from '../types.js';

export const TextSchema: WidgetSchema = {
  id: 'text',
  meta: {
    displayName: 'Text',
    description: 'Custom static text',
    category: 'layout',
  },
  options: {
    content: { color: 'dim' },
  },
};

export const TextWidget: Widget = {
  name: 'text',
  render(): string | null {
    // Stub - returns null until full implementation
    return null;
  },
};