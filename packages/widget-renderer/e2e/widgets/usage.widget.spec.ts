/**
 * Usage widget tests
 */

import { describe, it, expect } from 'vitest';

import type { RenderContext, WidgetConfig, UsageBarColors } from '../../src/types.js';

import { UsageWidget, UsageSchema } from '../../src/../src/widgets/usage.widget.js';

describe('UsageWidget', () => {
  describe('render', () => {
    it('should return null when dimension is missing', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 1000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: {}, // no dimension
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeNull();
    });

    it('should render value from usageData', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 50000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h' },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('50,000');
    });

    it('should default to 0 when dimension value is missing', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: {}, // no '5h' data
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h' },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('0');
    });

    it('should show usage bar when showBar enabled', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 80000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: true },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('█');
      expect(result).toContain('░');
    });

    it('should not show bar when showBar disabled', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 50000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: false },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).not.toContain('█');
    });

    it('should show percentage when showPercent enabled', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 50000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: true, showPercent: true, maxValue: 100000 },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('50%');
    });

    it('should hide percentage when showPercent disabled', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 50000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: true, showPercent: false },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      // Percentage should not be shown (just bar)
      expect(result).not.toContain('50%');
    });

    it('should use custom maxValue for percent calculation', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 5000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: true, showPercent: true, maxValue: 10000 },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('50%');
    });

    it('should use default maxValue 100000', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 25000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: true, showPercent: true },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('25%');
    });

    it('should clamp percent to 100 max', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 150000 }, // over maxValue
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: true, showPercent: true, maxValue: 100000 },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('100%');
    });

    it('should render with label when configured', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 1000 },
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', label: '5h' },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('5h:');
    });

    it('should apply barColors from config', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: { '5h': 90000 }, // high usage
        terminalWidth: 80,
      };
      const barColors: UsageBarColors = { low: 'green', medium: 'yellow', high: 'red' };
      const config: WidgetConfig = {
        widget: 'usage',
        options: { dimension: '5h', showBar: true, barColors },
      };
      const result = UsageWidget.render(ctx, config);
      expect(result).toBeTruthy();
      // 90% is high, should use red color (via createUsageBar)
    });
  });
});

describe('UsageSchema', () => {
  it('should have id "usage"', () => {
    expect(UsageSchema.id).toBe('usage');
  });

  it('should have correct meta', () => {
    expect(UsageSchema.meta.displayName).toBe('Usage');
    expect(UsageSchema.meta.description).toBe('Display usage for a specific dimension');
    expect(UsageSchema.meta.category).toBe('limits');
  });

  it('should have content options with default color cyan', () => {
    expect(UsageSchema.options?.content?.color).toBe('cyan');
  });

  it('should have bar options enabled by default', () => {
    expect(UsageSchema.options?.bar?.enabled).toBe(true);
  });

  it('should have bar colors with low/medium/high', () => {
    const colors = UsageSchema.options?.bar?.colors;
    expect(colors?.low).toBe('green');
    expect(colors?.medium).toBe('yellow');
    expect(colors?.high).toBe('red');
  });

  it('should have custom options for dimension, showBar, showPercent, maxValue, label', () => {
    const custom = UsageSchema.options?.custom ?? [];
    expect(custom.find((o) => o.key === 'dimension')).toBeTruthy();
    expect(custom.find((o) => o.key === 'showBar')).toBeTruthy();
    expect(custom.find((o) => o.key === 'showPercent')).toBeTruthy();
    expect(custom.find((o) => o.key === 'maxValue')).toBeTruthy();
    expect(custom.find((o) => o.key === 'label')).toBeTruthy();
  });

  it('should have naVisibility option', () => {
    const custom = UsageSchema.options?.custom ?? [];
    const naOption = custom.find((o) => o.key === 'naVisibility');
    expect(naOption).toBeTruthy();
    expect(naOption?.type).toBe('select');
    expect(naOption?.default).toBe('hide');
  });
});