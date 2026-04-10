/**
 * Text widget tests
 */

import { describe, it, expect } from 'vitest';

import type { RenderContext, WidgetConfig } from '../../src/types.js';

import { TextWidget, TextSchema } from '../../src/../src/widgets/text.widget.js';

// Mock context
const mockCtx: RenderContext = {
    activeProvider: 'bailian',
    providerDisplayName: 'Bailian',
    dimensions: [],
    usageData: {},
    terminalWidth: 80,
};

describe('TextWidget', () => {
    describe('render', () => {
        it('should render provided text', () => {
            const config: WidgetConfig = {
                widget: 'text',
                options: { text: 'Hello' },
            };
            const result = TextWidget.render(mockCtx, config);
            expect(result).toBe('Hello');
        });

        it('should return null for empty text', () => {
            const config: WidgetConfig = {
                widget: 'text',
                options: { text: '' },
            };
            const result = TextWidget.render(mockCtx, config);
            expect(result).toBeNull();
        });

        it('should return null for undefined text option', () => {
            const config: WidgetConfig = {
                widget: 'text',
                options: {},
            };
            const result = TextWidget.render(mockCtx, config);
            expect(result).toBeNull();
        });

        it('should return null for undefined config', () => {
            const result = TextWidget.render(mockCtx);
            expect(result).toBeNull();
        });

        it('should apply color from config', () => {
            const config: WidgetConfig = {
                widget: 'text',
                options: { text: 'Hello' },
                color: 'cyan',
            };
            const result = TextWidget.render(mockCtx, config);
            expect(result).toBeTruthy();
            expect(result).toContain('Hello');
        });

        it('should handle whitespace-only text', () => {
            const config: WidgetConfig = {
                widget: 'text',
                options: { text: '   ' },
            };
            const result = TextWidget.render(mockCtx, config);
            // Whitespace text should render (user might want spacing)
            expect(result).toBeTruthy();
        });
    });
});

describe('TextSchema', () => {
    it('should have id "text"', () => {
        expect(TextSchema.id).toBe('text');
    });

    it('should have correct meta', () => {
        expect(TextSchema.meta.displayName).toBe('Text');
        expect(TextSchema.meta.description).toBe('Static text with optional color');
        expect(TextSchema.meta.category).toBe('layout');
    });

    it('should have content options with default color white', () => {
        expect(TextSchema.options?.content?.color).toBe('white');
    });

    it('should have custom options for text content', () => {
        const custom = TextSchema.options?.custom ?? [];
        const textOption = custom.find(o => o.key === 'text');
        expect(textOption).toBeTruthy();
        expect(textOption?.type).toBe('text');
        expect(textOption?.label).toBe('Text Content');
        expect(textOption?.maxLength).toBe(100);
    });
});
