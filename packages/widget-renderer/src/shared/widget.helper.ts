/**
 * Widget configuration helpers
 *
 * Utility functions for working with widget configuration.
 */

import type { WidgetConfig, ColorValue, NaVisibility } from '../types.js';
import { colorize } from '../colors.js';

/**
 * Get option value from inline config
 *
 * Extracts typed option values from widget configuration.
 *
 * @param config - Inline widget configuration
 * @param key - Option key
 * @returns Option value or undefined
 */
export function getOption<T>(config: WidgetConfig | undefined, key: string): T | undefined {
    return config?.options?.[key] as T | undefined;
}

/**
 * Render widget content with optional label prefix
 *
 * Internal helper that adds label formatting if configured.
 *
 * @param content - Colored widget content (already colorized)
 * @param config - Inline widget configuration
 * @param defaultLabelColor - Default color for label if not specified
 * @returns Content with optional label prefix: "Label: content" or just "content"
 */
function renderWithLabel(
    content: string,
    config: WidgetConfig | undefined,
    defaultLabelColor: ColorValue = 'dim'
): string {
    const label = getOption<string>(config, 'label');

    // No label configured - return content as-is
    if (!label) {
        return content;
    }

    // Get label color (or use default)
    const labelColor = getOption<ColorValue>(config, 'labelColor') ?? defaultLabelColor;

    // Format: "Label: content" (separator included in colorized label)
    return `${colorize(label + ':', labelColor)} ${content}`;
}

/**
 * Render widget with N/A handling and optional label
 *
 * Handles the complete widget rendering flow:
 * 1. If content is null, check naVisibility option
 * 2. Apply colorization to content or placeholder
 * 3. Apply optional label prefix
 *
 * @param content - Widget content (null if unavailable)
 * @param config - Inline widget configuration
 * @param defaultColor - Default color for content
 * @param defaultLabelColor - Default color for label
 * @returns Rendered widget string or null (if naVisibility='hide')
 */
export function renderWidgetWithLabel(
    content: string | null,
    config: WidgetConfig | undefined,
    defaultColor?: ColorValue,
    defaultLabelColor: ColorValue = 'dim'
): string | null {
    // Handle null content based on naVisibility option
    if (content === null) {
        const naVisibility = getOption<NaVisibility>(config, 'naVisibility') ?? 'hide';

        if (naVisibility === 'hide') {
            return null; // Hide entire widget
        }

        // Determine placeholder based on naVisibility
        const placeholder = naVisibility === 'na' ? 'N/A' : naVisibility === 'dash' ? '-' : ''; // empty

        // Colorize placeholder (use defaultColor or dim)
        const colored = colorize(placeholder, defaultColor ?? 'dim');
        return renderWithLabel(colored, config, defaultLabelColor);
    }

    // Normal rendering: colorize content and add label
    const coloredContent = colorize(content, config?.color ?? defaultColor);
    return renderWithLabel(coloredContent, config, defaultLabelColor);
}
