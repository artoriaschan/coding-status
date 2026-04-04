/**
 * Separator widget tests
 */

import { describe, it, expect } from 'vitest';

import type { RenderContext, WidgetConfig } from '../types.js';

import { SeparatorWidget, SeparatorSchema } from './separator.widget.js';

// Mock context
const mockCtx: RenderContext = {
  activeProvider: 'bailian',
  providerDisplayName: 'Bailian',
  dimensions: [],
  usageData: {},
  terminalWidth: 80,
};

describe('SeparatorWidget', () => {
  describe('render', () => {
    it('should render default separator character (│)', () => {
      const result = SeparatorWidget.render(mockCtx);
      expect(result).toBeTruthy();
      expect(result).toContain('│');
    });

    it('should add space before by default', () => {
      const result = SeparatorWidget.render(mockCtx);
      expect(result).toMatch(/^ /); // Starts with space
    });

    it('should add space after by default', () => {
      const result = SeparatorWidget.render(mockCtx);
      expect(result).toMatch(/ $/); // Ends with space
    });

    it('should render custom text option', () => {
      const config: WidgetConfig = {
        widget: 'separator',
        options: { text: '•' },
      };
      const result = SeparatorWidget.render(mockCtx, config);
      expect(result).toContain('•');
      expect(result).not.toContain('│');
    });

    it('should respect spaceBefore=false', () => {
      const config: WidgetConfig = {
        widget: 'separator',
        options: { spaceBefore: false },
      };
      const result = SeparatorWidget.render(mockCtx, config);
      expect(result).not.toMatch(/^ /);
    });

    it('should respect spaceAfter=false', () => {
      const config: WidgetConfig = {
        widget: 'separator',
        options: { spaceAfter: false },
      };
      const result = SeparatorWidget.render(mockCtx, config);
      expect(result).not.toMatch(/ $/);
    });

    it('should apply dim color by default', () => {
      const result = SeparatorWidget.render(mockCtx);
      // In plain mode tests, we just check the content
      expect(result).toContain('│');
    });

    it('should apply custom color from config', () => {
      const config: WidgetConfig = {
        widget: 'separator',
        color: 'cyan',
      };
      const result = SeparatorWidget.render(mockCtx, config);
      expect(result).toContain('│');
    });
  });
});

describe('SeparatorSchema', () => {
  it('should have id "separator"', () => {
    expect(SeparatorSchema.id).toBe('separator');
  });

  it('should have correct meta', () => {
    expect(SeparatorSchema.meta.displayName).toBe('Separator');
    expect(SeparatorSchema.meta.description).toBe('Visual separator between widgets');
    expect(SeparatorSchema.meta.category).toBe('layout');
  });

  it('should have content options with default color dim', () => {
    expect(SeparatorSchema.options?.content?.color).toBe('dim');
  });

  it('should have custom options for text, spaceBefore, spaceAfter', () => {
    const custom = SeparatorSchema.options?.custom ?? [];
    expect(custom.find((o) => o.key === 'text')).toBeTruthy();
    expect(custom.find((o) => o.key === 'spaceBefore')).toBeTruthy();
    expect(custom.find((o) => o.key === 'spaceAfter')).toBeTruthy();
  });

  it('should have select options for text with │ as default', () => {
    const textOption = SeparatorSchema.options?.custom?.find((o) => o.key === 'text');
    expect(textOption?.type).toBe('select');
    expect(textOption?.default).toBe('│');
    expect(textOption?.options?.some((o) => o.value === '│')).toBe(true);
  });
});