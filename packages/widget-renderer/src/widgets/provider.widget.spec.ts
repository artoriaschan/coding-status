/**
 * Provider widget tests
 */

import { describe, it, expect } from 'vitest';

import type { RenderContext, WidgetConfig } from '../types.js';

import { ProviderWidget, ProviderSchema } from './provider.widget.js';

describe('ProviderWidget', () => {
  describe('render', () => {
    it('should render providerDisplayName when available', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian Provider',
        dimensions: [],
        usageData: {},
        terminalWidth: 80,
      };
      const result = ProviderWidget.render(ctx);
      expect(result).toBeTruthy();
      expect(result).toContain('Bailian Provider');
    });

    it('should fall back to activeProvider when providerDisplayName is empty', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: '',
        dimensions: [],
        usageData: {},
        terminalWidth: 80,
      };
      const result = ProviderWidget.render(ctx);
      expect(result).toBeTruthy();
      expect(result).toContain('bailian');
    });

    it('should return null when both providerDisplayName and activeProvider are empty', () => {
      const ctx: RenderContext = {
        activeProvider: '',
        providerDisplayName: '',
        dimensions: [],
        usageData: {},
        terminalWidth: 80,
      };
      const result = ProviderWidget.render(ctx);
      expect(result).toBeNull();
    });

    it('should apply default cyan color', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: {},
        terminalWidth: 80,
      };
      const result = ProviderWidget.render(ctx);
      expect(result).toBeTruthy();
      expect(result).toContain('Bailian');
    });

    it('should apply custom color from config', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: {},
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'provider',
        color: 'green',
      };
      const result = ProviderWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('Bailian');
    });

    it('should render with label when configured', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: {},
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'provider',
        options: { label: 'Provider' },
      };
      const result = ProviderWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('Provider:');
      expect(result).toContain('Bailian');
    });

    it('should apply labelColor from config', () => {
      const ctx: RenderContext = {
        activeProvider: 'bailian',
        providerDisplayName: 'Bailian',
        dimensions: [],
        usageData: {},
        terminalWidth: 80,
      };
      const config: WidgetConfig = {
        widget: 'provider',
        options: { label: 'P', labelColor: 'yellow' },
      };
      const result = ProviderWidget.render(ctx, config);
      expect(result).toBeTruthy();
      expect(result).toContain('P:');
    });
  });
});

describe('ProviderSchema', () => {
  it('should have id "provider"', () => {
    expect(ProviderSchema.id).toBe('provider');
  });

  it('should have correct meta', () => {
    expect(ProviderSchema.meta.displayName).toBe('Provider');
    expect(ProviderSchema.meta.description).toBe('Current cloud provider name');
    expect(ProviderSchema.meta.category).toBe('info');
  });

  it('should have content options with default color cyan', () => {
    expect(ProviderSchema.options?.content?.color).toBe('cyan');
  });

  it('should have custom options for label and labelColor', () => {
    const custom = ProviderSchema.options?.custom ?? [];
    expect(custom.find((o) => o.key === 'label')).toBeTruthy();
    expect(custom.find((o) => o.key === 'labelColor')).toBeTruthy();
  });
});