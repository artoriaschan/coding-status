/**
 * Widget registry and exports
 *
 * All available widgets and their schemas are registered here.
 * The unified registry provides both widget implementations and their
 * metadata schemas for the configuration GUI.
 */

// Type exports
export type { Widget, WidgetSchema } from '../types.js';

// Widget exports
export { SeparatorWidget, SeparatorSchema } from './separator.widget.js';
export { TextWidget, TextSchema } from './text.widget.js';
export { ProviderWidget, ProviderSchema } from './provider.widget.js';
export { UsageWidget, UsageSchema } from './usage.widget.js';

import type { Widget, WidgetSchema } from '../types.js';

import { SeparatorWidget, SeparatorSchema } from './separator.widget.js';
import { TextWidget, TextSchema } from './text.widget.js';
import { ProviderWidget, ProviderSchema } from './provider.widget.js';
import { UsageWidget, UsageSchema } from './usage.widget.js';

/**
 * Widget entry with both implementation and schema
 */
export interface WidgetEntry {
  /** Widget implementation */
  widget: Widget;
  /** Widget schema (metadata for GUI) */
  schema: WidgetSchema;
}

/**
 * Unified widget registry - single source of truth for widgets and schemas
 *
 * This registry stores both the widget implementation and its schema together,
 * ensuring consistency between runtime behavior and configuration GUI.
 */
export const BUILTIN_WIDGETS: Record<string, WidgetEntry> = {
  separator: { widget: SeparatorWidget, schema: SeparatorSchema },
  text: { widget: TextWidget, schema: TextSchema },
  provider: { widget: ProviderWidget, schema: ProviderSchema },
  usage: { widget: UsageWidget, schema: UsageSchema },
};

/**
 * Get a widget by ID
 */
export function getWidget(id: string): Widget | undefined {
  return BUILTIN_WIDGETS[id]?.widget;
}

/**
 * Get a widget's schema by ID
 */
export function getWidgetSchema(id: string): WidgetSchema | undefined {
  return BUILTIN_WIDGETS[id]?.schema;
}

/**
 * Get all widget schemas
 */
export function getAllSchemas(): WidgetSchema[] {
  return Object.values(BUILTIN_WIDGETS).map((entry) => entry.schema);
}