/**
 * Widget renderer library exports
 *
 * Provides all types, widgets, and utilities for statusline rendering.
 */

// Type exports (re-export from types.ts)
export type {
  ColorValue,
  UsageBarColors,
  UsageDimension,
  WidgetConfig,
  Settings,
  RenderContext,
  Widget,
  WidgetSchema,
  WidgetMeta,
  WidgetCustomOption,
  WidgetPreviewState,
  WidgetOptionsConfig,
  NaVisibility,
  UsageAdapter,
  DimensionCategory,
} from './types.js';

// Constant exports
export { VALID_COLORS, isValidColor } from './types.js';

// Renderer exports
export { renderStatusLine } from './renderer.js';

// Settings loader exports
export {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  SETTINGS_PATH,
} from './settings.js';

// Settings schema exports (for JSON Schema generation)
export {
  SettingsSchema,
  WidgetConfigSchema,
  ThemeSchema,
  WidgetTypeEnum,
  type Theme,
} from './settings.schema.js';

// Color utilities
export {
  setPlainMode,
  getChalkColor,
  colorize,
  createUsageBar,
  type UsageBarOptions,
} from './colors.js';

// Widget registry exports
export {
  BUILTIN_WIDGETS,
  getWidget,
  getWidgetSchema,
  getAllSchemas,
  type WidgetEntry,
} from './widgets/index.js';

// Individual widget exports
export {
  SeparatorWidget,
  SeparatorSchema,
  TextWidget,
  TextSchema,
  ProviderWidget,
  ProviderSchema,
  UsageWidget,
  UsageSchema,
} from './widgets/index.js';

// Shared helper exports
export { getOption, renderWidgetWithLabel } from './shared/index.js';

// Version placeholder
export const version = '0.0.1';