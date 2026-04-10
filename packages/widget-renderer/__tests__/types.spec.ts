/**
 * Type tests for widget renderer
 *
 * Verifies type definitions and registry structure.
 * Uses runtime checks to validate TypeScript types work correctly.
 */

import { describe, it, expect } from 'vitest';

import type {
    ColorValue,
    UsageBarColors,
    UsageDimension,
    WidgetConfig,
    Settings,
    RenderContext,
    Widget,
    WidgetSchema,
    NaVisibility,
    DimensionCategory,
    UsageAdapter,
} from '../src/types.js';
import { VALID_COLORS, isValidColor } from '../src/types.js';

import {
    BUILTIN_WIDGETS,
    getWidget,
    getWidgetSchema,
    getAllSchemas,
} from '../src/widgets/index.js';

describe('ColorValue type', () => {
    it('should have exactly 10 valid colors', () => {
        expect(VALID_COLORS.length).toBe(10);
    });

    it('should include all required colors', () => {
        const expectedColors: ColorValue[] = [
            'black',
            'red',
            'green',
            'yellow',
            'blue',
            'magenta',
            'cyan',
            'white',
            'dim',
            'bold',
        ];
        expect(VALID_COLORS).toEqual(expectedColors);
    });

    it('should validate correct color values', () => {
        expect(isValidColor('red')).toBe(true);
        expect(isValidColor('cyan')).toBe(true);
        expect(isValidColor('dim')).toBe(true);
        expect(isValidColor('bold')).toBe(true);
    });

    it('should reject invalid color values', () => {
        expect(isValidColor('invalid')).toBe(false);
        expect(isValidColor('purple')).toBe(false);
        expect(isValidColor(123)).toBe(false);
        expect(isValidColor(null)).toBe(false);
    });
});

describe('UsageBarColors interface', () => {
    it('should accept partial color config', () => {
        const partial: UsageBarColors = { low: 'green' };
        expect(partial.low).toBe('green');
        expect(partial.medium).toBeUndefined();
        expect(partial.high).toBeUndefined();
    });

    it('should accept full color config', () => {
        const full: UsageBarColors = {
            low: 'green',
            medium: 'yellow',
            high: 'red',
        };
        expect(full.low).toBe('green');
        expect(full.medium).toBe('yellow');
        expect(full.high).toBe('red');
    });
});

describe('UsageDimension interface', () => {
    it('should have required fields', () => {
        const dimension: UsageDimension = {
            key: '5h',
            label: '5 Hours',
        };
        expect(dimension.key).toBe('5h');
        expect(dimension.label).toBe('5 Hours');
    });

    it('should accept optional fields', () => {
        const dimension: UsageDimension = {
            key: 'week',
            label: 'Weekly',
            description: 'Weekly usage',
            maxValue: 100000,
        };
        expect(dimension.description).toBe('Weekly usage');
        expect(dimension.maxValue).toBe(100000);
    });
});

describe('DimensionCategory type', () => {
    it('should accept all valid category values', () => {
        const categories: DimensionCategory[] = ['usage', 'balance', 'concurrency', 'other'];
        expect(categories).toContain('usage');
        expect(categories).toContain('balance');
        expect(categories).toContain('concurrency');
        expect(categories).toContain('other');
    });
});

describe('UsageDimension.category field', () => {
    it('should work without category (optional field)', () => {
        const dimension: UsageDimension = {
            key: '5h',
            label: '5 Hours',
        };
        expect(dimension.category).toBeUndefined();
    });

    it('should accept category: balance', () => {
        const dimension: UsageDimension = {
            key: 'balance',
            label: 'Account Balance',
            category: 'balance',
        };
        expect(dimension.category).toBe('balance');
    });

    it('should accept category: concurrency', () => {
        const dimension: UsageDimension = {
            key: 'concurrency',
            label: 'Active Sessions',
            category: 'concurrency',
        };
        expect(dimension.category).toBe('concurrency');
    });
});

describe('WidgetConfig interface', () => {
    it('should have required widget field', () => {
        const config: WidgetConfig = { widget: 'separator' };
        expect(config.widget).toBe('separator');
    });

    it('should accept optional fields', () => {
        const config: WidgetConfig = {
            widget: 'usage',
            color: 'cyan',
            colors: { low: 'green' },
            options: { dimension: '5h' },
        };
        expect(config.color).toBe('cyan');
        expect(config.colors?.low).toBe('green');
        expect(config.options?.dimension).toBe('5h');
    });
});

describe('Settings interface', () => {
    it('should have required cacheTtl and rows', () => {
        const settings: Settings = {
            cacheTtl: 30000,
            rows: [[{ widget: 'provider' }]],
        };
        expect(settings.cacheTtl).toBe(30000);
        expect(settings.rows.length).toBe(1);
    });

    it('should accept optional theme and plain mode', () => {
        const settings: Settings = {
            cacheTtl: 30000,
            rows: [],
            theme: {
                barColors: { low: 'green' },
                thresholds: { low: 50, medium: 80 },
            },
            plain: true,
        };
        expect(settings.theme?.barColors?.low).toBe('green');
        expect(settings.theme?.thresholds?.low).toBe(50);
        expect(settings.plain).toBe(true);
    });
});

describe('RenderContext interface', () => {
    it('should have all required fields per D-06', () => {
        const ctx: RenderContext = {
            activeProvider: 'bailian',
            providerDisplayName: 'Bailian',
            dimensions: [{ key: '5h', label: '5 Hours' }],
            usageData: { '5h': 5000 },
            terminalWidth: 80,
        };
        expect(ctx.activeProvider).toBe('bailian');
        expect(ctx.providerDisplayName).toBe('Bailian');
        expect(ctx.dimensions.length).toBe(1);
        expect(ctx.usageData['5h']).toBe(5000);
        expect(ctx.terminalWidth).toBe(80);
    });

    it('should accept optional settings', () => {
        const ctx: RenderContext = {
            activeProvider: 'bailian',
            providerDisplayName: 'Bailian',
            dimensions: [],
            usageData: {},
            terminalWidth: 80,
            settings: { cacheTtl: 30000, rows: [] },
        };
        expect(ctx.settings?.cacheTtl).toBe(30000);
    });
});

describe('Widget interface', () => {
    it('can be implemented correctly', () => {
        const mockWidget: Widget = {
            name: 'mock',
            render(_ctx: RenderContext, _config?: WidgetConfig): string | null {
                return 'mock output';
            },
        };
        expect(mockWidget.name).toBe('mock');
        expect(mockWidget.render({} as RenderContext)).toBe('mock output');
    });

    it('can return null to hide widget', () => {
        const hideWidget: Widget = {
            name: 'hide',
            render(): string | null {
                return null;
            },
        };
        expect(hideWidget.render({} as RenderContext)).toBeNull();
    });
});

describe('UsageAdapter interface', () => {
    it('can be implemented with all required methods', () => {
        const mockAdapter: UsageAdapter = {
            name: 'mock',
            displayName: 'Mock Adapter',
            async init(_credentials: Record<string, string>): Promise<void> {},
            async getDimensions(): Promise<UsageDimension[]> {
                return [{ key: '5h', label: '5 Hours' }];
            },
            async getUsage(_dimension: string): Promise<number> {
                return 100;
            },
        };
        expect(mockAdapter.name).toBe('mock');
        expect(mockAdapter.displayName).toBe('Mock Adapter');
    });

    it('has readonly name property', () => {
        const adapter: UsageAdapter = {
            name: 'test',
            displayName: 'Test',
            async init(): Promise<void> {},
            async getDimensions(): Promise<UsageDimension[]> {
                return [];
            },
            async getUsage(): Promise<number> {
                return 0;
            },
        };
        // readonly is compile-time only, verify the value exists
        expect(adapter.name).toBe('test');
    });

    it('init method returns Promise<void>', async () => {
        const adapter: UsageAdapter = {
            name: 'test',
            displayName: 'Test',
            async init(): Promise<void> {},
            async getDimensions(): Promise<UsageDimension[]> {
                return [];
            },
            async getUsage(): Promise<number> {
                return 0;
            },
        };
        const result = await adapter.init({});
        expect(result).toBeUndefined();
    });

    it('getDimensions returns UsageDimension array', async () => {
        const adapter: UsageAdapter = {
            name: 'test',
            displayName: 'Test',
            async init(): Promise<void> {},
            async getDimensions(): Promise<UsageDimension[]> {
                return [
                    { key: '5h', label: '5 Hours', category: 'usage' },
                    { key: 'balance', label: 'Balance', category: 'balance' },
                ];
            },
            async getUsage(): Promise<number> {
                return 0;
            },
        };
        const dimensions = await adapter.getDimensions();
        expect(dimensions.length).toBe(2);
        expect(dimensions[0].category).toBe('usage');
        expect(dimensions[1].category).toBe('balance');
    });

    it('getUsage returns Promise<number>', async () => {
        const adapter: UsageAdapter = {
            name: 'test',
            displayName: 'Test',
            async init(): Promise<void> {},
            async getDimensions(): Promise<UsageDimension[]> {
                return [];
            },
            async getUsage(_dimension: string): Promise<number> {
                return 5000;
            },
        };
        const usage = await adapter.getUsage('5h');
        expect(usage).toBe(5000);
        expect(typeof usage).toBe('number');
    });
});

describe('WidgetSchema interface', () => {
    it('should have required id and meta fields', () => {
        const schema: WidgetSchema = {
            id: 'test',
            meta: {
                displayName: 'Test Widget',
                description: 'A test widget',
                category: 'layout',
            },
        };
        expect(schema.id).toBe('test');
        expect(schema.meta.displayName).toBe('Test Widget');
        expect(schema.meta.category).toBe('layout');
    });

    it('should accept optional options and previewStates', () => {
        const schema: WidgetSchema = {
            id: 'test',
            meta: {
                displayName: 'Test',
                description: 'Test',
                category: 'limits',
            },
            options: {
                content: { color: 'cyan' },
            },
            previewStates: [{ id: 'default', label: 'Default' }],
        };
        expect(schema.options?.content?.color).toBe('cyan');
        expect(schema.previewStates?.length).toBe(1);
    });
});

describe('NaVisibility type', () => {
    it('should accept all valid values', () => {
        const values: NaVisibility[] = ['hide', 'na', 'dash', 'empty'];
        expect(values).toContain('hide');
        expect(values).toContain('na');
        expect(values).toContain('dash');
        expect(values).toContain('empty');
    });
});

describe('BUILTIN_WIDGETS registry', () => {
    it('should have exactly 4 entries', () => {
        const keys = Object.keys(BUILTIN_WIDGETS);
        expect(keys.length).toBe(4);
    });

    it('should have correct widget keys', () => {
        const keys = Object.keys(BUILTIN_WIDGETS);
        expect(keys).toContain('separator');
        expect(keys).toContain('text');
        expect(keys).toContain('provider');
        expect(keys).toContain('usage');
    });

    it('should have widget and schema for each entry', () => {
        for (const key of Object.keys(BUILTIN_WIDGETS)) {
            const entry = BUILTIN_WIDGETS[key];
            expect(entry.widget).toBeDefined();
            expect(entry.widget.name).toBe(key);
            expect(entry.schema).toBeDefined();
            expect(entry.schema.id).toBe(key);
        }
    });
});

describe('getWidget function', () => {
    it('should return widget for valid keys', () => {
        expect(getWidget('separator')).toBeDefined();
        expect(getWidget('text')).toBeDefined();
        expect(getWidget('provider')).toBeDefined();
        expect(getWidget('usage')).toBeDefined();
    });

    it('should return undefined for invalid keys', () => {
        expect(getWidget('invalid')).toBeUndefined();
        expect(getWidget('nonexistent')).toBeUndefined();
        expect(getWidget('')).toBeUndefined();
    });
});

describe('getWidgetSchema function', () => {
    it('should return schema for valid keys', () => {
        const separatorSchema = getWidgetSchema('separator');
        expect(separatorSchema).toBeDefined();
        expect(separatorSchema?.id).toBe('separator');
        expect(separatorSchema?.meta.displayName).toBe('Separator');
    });

    it('should return undefined for invalid keys', () => {
        expect(getWidgetSchema('invalid')).toBeUndefined();
    });
});

describe('getAllSchemas function', () => {
    it('should return all 4 schemas', () => {
        const schemas = getAllSchemas();
        expect(schemas.length).toBe(4);
    });

    it('should have correct schema IDs', () => {
        const schemas = getAllSchemas();
        const ids = schemas.map(s => s.id);
        expect(ids).toContain('separator');
        expect(ids).toContain('text');
        expect(ids).toContain('provider');
        expect(ids).toContain('usage');
    });
});
