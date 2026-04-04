/**
 * Text widget
 *
 * Displays configurable static text with optional color.
 * Useful for adding custom labels, prefixes, or decorations to the statusline.
 *
 * @example
 * { widget: 'text', options: { text: 'Hello' }, color: 'cyan' }
 */

import type { Widget, RenderContext, WidgetConfig, WidgetSchema } from '../types.js';
import { colorize } from '../colors.js';
import { getOption } from '../shared/widget.helper.js';

/** Text widget schema - defines all GUI metadata */
export const TextSchema: WidgetSchema = {
  id: 'text',
  meta: {
    displayName: 'Text',
    description: 'Static text with optional color',
    category: 'layout',
  },
  options: {
    content: { color: 'white' },
    custom: [
      {
        key: 'text',
        type: 'text',
        label: 'Text Content',
        default: '',
        maxLength: 100,
        placeholder: 'Enter custom text, emoji, or Unicode...',
      },
    ],
  },
};

/** Text options type */
interface TextOptions {
  text?: string;
}

export const TextWidget: Widget = {
  name: 'text',

  render(_ctx: RenderContext, config?: WidgetConfig): string | null {
    const text = getOption<string>(config, 'text');

    // Return null if no text configured (empty string, undefined, or whitespace-only)
    // Note: whitespace-only text is allowed (user might want spacing)
    if (!text) return null;

    // Apply color
    return colorize(text, config?.color);
  },
};