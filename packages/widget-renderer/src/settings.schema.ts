/**
 * Settings schema validation
 *
 * Zod schemas for settings.json validation.
 * Validates widget configuration, theme settings, and threshold constraints.
 */

import { z } from 'zod';

import { VALID_COLORS, type ColorValue } from './types.js';

// =============================================================================
// Widget Type Enum (D-13)
// =============================================================================

/**
 * Widget type enum per D-13
 *
 * Restricts widget types to known values for security and consistency.
 */
export const WidgetTypeEnum = z.enum(['provider', 'separator', 'usage', 'text']);

// =============================================================================
// Widget Configuration Schema
// =============================================================================

/**
 * Color enum schema derived from VALID_COLORS
 */
const ColorEnumSchema = z.enum(VALID_COLORS as [ColorValue, ...ColorValue[]]);

/**
 * Widget configuration schema per D-13
 *
 * Validates each widget instance in the rows array.
 */
export const WidgetConfigSchema = z.object({
  widget: WidgetTypeEnum,
  color: ColorEnumSchema.optional(),
  colors: z.record(z.string(), ColorEnumSchema).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// Theme Schema (D-14)
// =============================================================================

/**
 * Usage bar colors schema
 */
const UsageBarColorsSchema = z.object({
  low: ColorEnumSchema.optional(),
  medium: ColorEnumSchema.optional(),
  high: ColorEnumSchema.optional(),
});

/**
 * Thresholds schema with range validation (0-100)
 */
const ThresholdsSchema = z.object({
  low: z.number().int().min(0).max(100).optional(),
  medium: z.number().int().min(0).max(100).optional(),
});

/**
 * Theme schema per D-14 with threshold refinement
 *
 * Ensures thresholds.low < thresholds.medium when both are present.
 */
export const ThemeSchema = z
  .object({
    barColors: UsageBarColorsSchema.optional(),
    thresholds: ThresholdsSchema.optional(),
  })
  .refine(
    (data) => {
      // Only validate when both thresholds are present
      if (data.thresholds?.low !== undefined && data.thresholds?.medium !== undefined) {
        return data.thresholds.low < data.thresholds.medium;
      }
      return true;
    },
    {
      message: 'Thresholds must satisfy: low < medium',
      path: ['thresholds'],
    }
  );

// =============================================================================
// Settings Schema (D-12)
// =============================================================================

/**
 * Settings schema per D-12
 *
 * Validates the overall settings file structure.
 * Default cacheTtl is 300000 milliseconds (5 minutes).
 */
export const SettingsSchema = z.object({
  cacheTtl: z.number().int().positive().default(300000),
  rows: z.array(z.array(WidgetConfigSchema)).default([]),
  theme: ThemeSchema.optional(),
  plain: z.boolean().default(false),
});

// =============================================================================
// Exported Types
// =============================================================================

/**
 * Inferred Settings type from schema
 *
 * Use this type for type-safe settings access.
 */
export type Settings = z.infer<typeof SettingsSchema>;

/**
 * Inferred WidgetConfig type from schema
 */
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

/**
 * Inferred Theme type from schema
 */
export type Theme = z.infer<typeof ThemeSchema>;