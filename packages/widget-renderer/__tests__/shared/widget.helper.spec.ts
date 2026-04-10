/**
 * Tests for widget helper utilities
 *
 * Tests getOption extraction, renderWidgetWithLabel with N/A handling,
 * and label prefix formatting.
 */

import { describe, expect, it } from 'vitest';

import type { WidgetConfig, NaVisibility } from '../../src/types.js';
import { getOption, renderWidgetWithLabel } from '../../src/shared/widget.helper.js';

/**
 * Helper to strip ANSI codes from strings for comparison
 */
function stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('getOption', () => {
    it('should extract string value from config', () => {
        const config: WidgetConfig = {
            widget: 'test',
            options: { label: 'Branch' },
        };
        const result = getOption<string>(config, 'label');
        expect(result).toBe('Branch');
    });

    it('should extract number value from config', () => {
        const config: WidgetConfig = {
            widget: 'test',
            options: { maxValue: 100000 },
        };
        const result = getOption<number>(config, 'maxValue');
        expect(result).toBe(100000);
    });

    it('should extract boolean value from config', () => {
        const config: WidgetConfig = {
            widget: 'test',
            options: { showBar: true },
        };
        const result = getOption<boolean>(config, 'showBar');
        expect(result).toBe(true);
    });

    it('should return undefined for missing key', () => {
        const config: WidgetConfig = {
            widget: 'test',
            options: { label: 'Branch' },
        };
        const result = getOption<string>(config, 'missing');
        expect(result).toBeUndefined();
    });

    it('should return undefined for undefined config', () => {
        const result = getOption<string>(undefined, 'label');
        expect(result).toBeUndefined();
    });

    it('should return undefined for config with undefined options', () => {
        const config: WidgetConfig = { widget: 'test' };
        const result = getOption<string>(config, 'label');
        expect(result).toBeUndefined();
    });
});

describe('renderWidgetWithLabel', () => {
    describe('with normal content', () => {
        it('should render content without label', () => {
            const config: WidgetConfig = { widget: 'test' };
            const result = renderWidgetWithLabel('content', config, 'cyan');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('content');
        });

        it('should render content with label prefix', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { label: 'Branch' },
            };
            const result = renderWidgetWithLabel('main', config, 'cyan');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('Branch: main');
        });

        it('should apply custom labelColor', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { label: 'Model', labelColor: 'yellow' },
            };
            const result = renderWidgetWithLabel('opus', config, 'cyan');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('Model: opus');
        });

        it('should apply defaultColor to content', () => {
            const config: WidgetConfig = { widget: 'test' };
            const result = renderWidgetWithLabel('content', config, 'green');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('content');
        });

        it('should apply config.color over defaultColor', () => {
            const config: WidgetConfig = { widget: 'test', color: 'red' };
            const result = renderWidgetWithLabel('content', config, 'green');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('content');
        });
    });

    describe('with null content', () => {
        it('should return null when naVisibility="hide"', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { naVisibility: 'hide' as NaVisibility },
            };
            const result = renderWidgetWithLabel(null, config, 'cyan');
            expect(result).toBeNull();
        });

        it('should show "N/A" when naVisibility="na"', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { naVisibility: 'na' as NaVisibility },
            };
            const result = renderWidgetWithLabel(null, config, 'cyan');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('N/A');
        });

        it('should show "-" when naVisibility="dash"', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { naVisibility: 'dash' as NaVisibility },
            };
            const result = renderWidgetWithLabel(null, config, 'cyan');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('-');
        });

        it('should show "" when naVisibility="empty"', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { naVisibility: 'empty' as NaVisibility },
            };
            const result = renderWidgetWithLabel(null, config, 'cyan');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('');
        });

        it('should default to "hide" when naVisibility not specified', () => {
            const config: WidgetConfig = { widget: 'test' };
            const result = renderWidgetWithLabel(null, config, 'cyan');
            expect(result).toBeNull();
        });

        it('should apply N/A placeholder with defaultColor', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { naVisibility: 'na' as NaVisibility },
            };
            const result = renderWidgetWithLabel(null, config, 'red');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('N/A');
        });

        it('should apply N/A placeholder with dim when no defaultColor', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { naVisibility: 'na' as NaVisibility },
            };
            const result = renderWidgetWithLabel(null, config);
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('N/A');
        });

        it('should add label prefix to N/A placeholder', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { label: 'Usage', naVisibility: 'na' as NaVisibility },
            };
            const result = renderWidgetWithLabel(null, config, 'cyan');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('Usage: N/A');
        });
    });

    describe('with default label color', () => {
        it('should use defaultLabelColor parameter', () => {
            const config: WidgetConfig = {
                widget: 'test',
                options: { label: 'Status' },
            };
            const result = renderWidgetWithLabel('active', config, 'cyan', 'yellow');
            expect(result).not.toBeNull();
            expect(stripAnsi(result!)).toBe('Status: active');
        });
    });
});
