/**
 * Renderer tests
 *
 * Tests for renderStatusLine function with smart separator logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type { RenderContext, Settings, WidgetConfig } from '../src/types.js';

// Helper to create mock render context
function createMockCtx(overrides?: Partial<RenderContext>): RenderContext {
    return {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [{ key: '5h', label: '5 Hours' }],
        usageData: { '5h': 50000 },
        terminalWidth: 80,
        settings: createMockSettings([]),
        ...overrides,
    };
}

// Helper to create mock settings
function createMockSettings(widgets: WidgetConfig[]): Settings {
    return {
        cacheTtl: 30000,
        rows: [widgets],
        plain: false,
    };
}

describe('renderStatusLine', () => {
    // Import will fail until renderer.ts is implemented
    // This is the RED phase of TDD
    let renderStatusLine: (ctx: RenderContext, settings: Settings) => string;

    beforeEach(async () => {
        // Dynamic import to handle module not existing yet
        try {
            const module = await import('../src/renderer.js');
            renderStatusLine = module.renderStatusLine;
        } catch {
            // Module doesn't exist yet - tests will fail
            renderStatusLine = () => '';
        }
    });

    it('renders widgets in order', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'text', options: { text: 'Hello' } },
            { widget: 'text', options: { text: 'World' } },
        ]);

        const result = renderStatusLine(ctx, settings);
        expect(result).toContain('Hello');
        expect(result).toContain('World');
    });

    it('removes leading separators', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'separator' },
            { widget: 'text', options: { text: 'Content' } },
        ]);

        const result = renderStatusLine(ctx, settings);
        // Should not start with separator
        expect(result.trim()).not.toMatch(/^[│|•]/);
        expect(result).toContain('Content');
    });

    it('removes trailing separators', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'text', options: { text: 'Content' } },
            { widget: 'separator' },
        ]);

        const result = renderStatusLine(ctx, settings);
        // Should not end with separator
        expect(result.trim()).not.toMatch(/[│|•]$/);
        expect(result).toContain('Content');
    });

    it('collapses consecutive separators', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'text', options: { text: 'Start' } },
            { widget: 'separator' },
            { widget: 'separator' },
            { widget: 'separator' },
            { widget: 'text', options: { text: 'End' } },
        ]);

        const result = renderStatusLine(ctx, settings);
        // Should have only one separator between texts
        expect(result).toContain('Start');
        expect(result).toContain('End');
        // Count separator occurrences - should be 1, not 3
        const separatorMatch = result.match(/[│|•]/g);
        expect(separatorMatch?.length ?? 0).toBeLessThanOrEqual(1);
    });

    it('filters null widgets', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'text', options: { text: 'Visible' } },
            { widget: 'text', options: { text: '' } }, // Empty text returns null
            { widget: 'text', options: { text: 'AlsoVisible' } },
        ]);

        const result = renderStatusLine(ctx, settings);
        expect(result).toContain('Visible');
        expect(result).toContain('AlsoVisible');
        // Should not have extra separators due to null widget
    });

    it('filters unknown widgets', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'text', options: { text: 'Before' } },
            { widget: 'unknown-widget' },
            { widget: 'text', options: { text: 'After' } },
        ]);

        const result = renderStatusLine(ctx, settings);
        expect(result).toContain('Before');
        expect(result).toContain('After');
        // Unknown widget should be skipped entirely
    });

    it('plain mode disables ANSI', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'text', options: { text: 'PlainText' }, color: 'cyan' },
        ]);
        settings.plain = true;

        const result = renderStatusLine(ctx, settings);
        // No ANSI escape codes should be present
        expect(result).not.toMatch(/\x1b\[/);
        expect(result).toContain('PlainText');
    });

    it('empty settings returns empty string', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([]);

        const result = renderStatusLine(ctx, settings);
        expect(result).toBe('');
    });

    it('renders complex layout with provider separator usage', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'provider' },
            { widget: 'separator' },
            { widget: 'usage', options: { dimension: '5h' } },
        ]);

        const result = renderStatusLine(ctx, settings);
        // Should show provider name
        expect(result).toContain('Bailian');
        // Should show usage
        expect(result).toMatch(/\d+/); // Contains a number (usage value)
    });

    it('handles all widgets returning null', async () => {
        const ctx = createMockCtx({
            providerDisplayName: '',
            activeProvider: '',
        });
        const settings = createMockSettings([
            { widget: 'provider' }, // Returns null when no provider
            { widget: 'text', options: { text: '' } }, // Returns null
            { widget: 'separator' },
        ]);

        const result = renderStatusLine(ctx, settings);
        expect(result).toBe('');
    });

    it('joins widgets with single space', async () => {
        const ctx = createMockCtx();
        const settings = createMockSettings([
            { widget: 'text', options: { text: 'A' } },
            { widget: 'text', options: { text: 'B' } },
            { widget: 'text', options: { text: 'C' } },
        ]);

        const result = renderStatusLine(ctx, settings);
        // Should be joined with spaces, not newlines
        expect(result).not.toContain('\n');
        expect(result).toBe('A B C');
    });
});
