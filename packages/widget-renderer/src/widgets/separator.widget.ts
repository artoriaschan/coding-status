/**
 * Separator widget
 *
 * Displays a separator character between widgets.
 * Smart separator logic in the renderer handles skipping separators
 * when adjacent widgets return empty content.
 *
 * @example
 * { widget: 'separator' }  // Default: dim '│'
 * { widget: 'separator', options: { text: '•' }, color: 'dim' }
 */

import type { Widget, RenderContext, WidgetConfig, WidgetSchema } from '../types.js';
import { colorize } from '../colors.js';

/** Separator widget schema - defines all GUI metadata */
export const SeparatorSchema: WidgetSchema = {
    id: 'separator',
    meta: {
        displayName: 'Separator',
        description: 'Visual separator between widgets',
        category: 'layout',
    },
    options: {
        content: { color: 'dim' },
        custom: [
            {
                key: 'text',
                type: 'select',
                label: 'Separator Character',
                options: [
                    { value: '|', label: '| (pipe)' },
                    { value: '│', label: '│ (box vertical)' },
                    { value: '•', label: '• (bullet)' },
                ],
                default: '│',
            },
            {
                key: 'spaceBefore',
                type: 'checkbox',
                label: 'Space Before',
                default: true,
            },
            {
                key: 'spaceAfter',
                type: 'checkbox',
                label: 'Space After',
                default: true,
            },
        ],
    },
};

/** Separator options type */
interface SeparatorOptions {
    text?: string;
    spaceBefore?: boolean;
    spaceAfter?: boolean;
}

export const SeparatorWidget: Widget = {
    name: 'separator',

    render(_ctx: RenderContext, config?: WidgetConfig): string | null {
        const opts = config?.options as SeparatorOptions | undefined;
        const text = opts?.text ?? '│';
        const spaceBefore = opts?.spaceBefore ?? true;
        const spaceAfter = opts?.spaceAfter ?? true;

        // Build output with spacing
        let output = text;
        if (spaceBefore) output = ' ' + output;
        if (spaceAfter) output = output + ' ';

        // Apply color (default to dim if not specified)
        const color = config?.color ?? 'dim';
        return colorize(output, color);
    },
};
