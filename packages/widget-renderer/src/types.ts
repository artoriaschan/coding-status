/**
 * Widget type definitions
 *
 * Core type system for the widget renderer library.
 * Defines all TypeScript interfaces that widgets, colors, and renderer use.
 */

// =============================================================================
// Color Types
// =============================================================================

/**
 * ANSI color values supported by chalk
 *
 * Includes standard colors and text modifiers (dim, bold).
 * These map directly to chalk's color methods.
 */
export type ColorValue =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'dim'
  | 'bold';

/**
 * All valid color values for validation
 */
export const VALID_COLORS: readonly ColorValue[] = [
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
] as const;

/**
 * Check if a value is a valid ColorValue
 */
export function isValidColor(value: unknown): value is ColorValue {
  return typeof value === 'string' && VALID_COLORS.includes(value as ColorValue);
}

// =============================================================================
// Usage Bar Types
// =============================================================================

/**
 * Usage bar color configuration for usage widgets
 *
 * Allows customizing colors based on usage percentage thresholds.
 */
export interface UsageBarColors {
  /** Color when usage is low (default: green) */
  low?: ColorValue;
  /** Color when usage is medium (default: yellow) */
  medium?: ColorValue;
  /** Color when usage is high (default: red) */
  high?: ColorValue;
}

/**
 * Usage adapter category for dimension classification
 * Per D-21: extensible dimension categories for future dimensions
 */
export type DimensionCategory = 'usage' | 'balance' | 'concurrency' | 'other';

/**
 * Usage dimension definition
 *
 * Describes a usage metric that adapters can provide.
 * Used by usage widget to display specific metrics.
 */
export interface UsageDimension {
  /** Unique dimension key (e.g., '5h', 'week', 'month') */
  key: string;
  /** Human-readable label (e.g., '5 Hours', 'Weekly', 'Monthly') */
  label: string;
  /** Optional description for GUI display */
  description?: string;
  /** Optional maximum value for percentage calculation */
  maxValue?: number;
  /** Category for rendering classification - default 'usage' */
  category?: DimensionCategory;
}

// =============================================================================
// Widget Configuration Types
// =============================================================================

/**
 * Inline widget configuration
 *
 * Each widget instance in a row can have its own configuration.
 * This is the per-instance config that goes in Settings.rows.
 */
export interface WidgetConfig {
  /** Widget ID (e.g., 'separator', 'text', 'provider', 'usage') */
  widget: string;
  /** Content color (for simple widgets) */
  color?: ColorValue;
  /** State-based colors (for widgets with multiple states) */
  colors?: Record<string, ColorValue>;
  /** Widget-specific options */
  options?: Record<string, unknown>;
}

/**
 * User settings for the statusline
 *
 * Configuration for widget layout and rendering behavior.
 */
export interface Settings {
  /** Cache TTL in milliseconds (default: 30000 = 30 seconds) */
  cacheTtl: number;
  /** Multi-row layout configuration */
  rows: WidgetConfig[][];
  /** Theme settings for colors and thresholds */
  theme?: {
    /** Usage bar gradient colors */
    barColors?: UsageBarColors;
    /** Percentage thresholds for color changes */
    thresholds?: {
      /** Low threshold (default: 50) */
      low?: number;
      /** Medium threshold (default: 80) */
      medium?: number;
    };
  };
  /** Plain mode flag (no ANSI colors) */
  plain?: boolean;
}

// =============================================================================
// Render Context Types
// =============================================================================

/**
 * Context passed to widgets during rendering
 *
 * Contains all data widgets need to render: provider info,
 * usage data, dimensions, terminal info, and settings.
 */
export interface RenderContext {
  /** Active provider identifier */
  activeProvider: string;
  /** Provider display name for rendering */
  providerDisplayName: string;
  /** Available usage dimensions from adapter */
  dimensions: UsageDimension[];
  /** Usage data by dimension key */
  usageData: Record<string, number>;
  /** Terminal width in columns */
  terminalWidth: number;
  /** User settings (optional, defaults used if not provided) */
  settings?: Settings;
}

// =============================================================================
// Widget Interface Types
// =============================================================================

/**
 * Widget interface that all statusline widgets must implement
 *
 * Each widget has a unique name and a render method that
 * returns either a colored string or null (to hide the widget).
 */
export interface Widget {
  /** Unique identifier for the widget */
  name: string;
  /**
   * Render the widget content
   * @param ctx - Render context with provider, usage, and settings
   * @param config - Optional inline widget configuration
   * @returns Rendered string with ANSI codes, or null if widget should be hidden
   */
  render(ctx: RenderContext, config?: WidgetConfig): string | null;
}

// =============================================================================
// Widget Schema Types
// =============================================================================

/**
 * Widget metadata - identity and categorization
 */
export interface WidgetMeta {
  /** Human-readable display name (e.g., 'Separator') */
  displayName: string;
  /** Brief description of what the widget shows */
  description: string;
  /** Category this widget belongs to */
  category: string;
}

/**
 * Custom config option for widget schema
 */
export interface WidgetCustomOption {
  /** Option key used in options object */
  key: string;
  /** Option type (select, checkbox, text, color) */
  type: string;
  /** Display label in config panel */
  label: string;
  /** Default value */
  default?: unknown;
  /** Available choices for select type */
  options?: Array<{ value: string; label: string }>;
  /** Maximum length for text input (text type) */
  maxLength?: number;
  /** Placeholder text for text input (text type) */
  placeholder?: string;
}

/**
 * Preview state for widget schema
 */
export interface WidgetPreviewState {
  /** State identifier */
  id: string;
  /** Display label */
  label: string;
  /** Description of what this state represents */
  description?: string;
  /** Mock data for preview */
  mockData?: unknown;
}

/**
 * Widget options configuration for schema
 */
export interface WidgetOptionsConfig {
  /** Content color options */
  content?: {
    /** Default content color */
    color?: ColorValue;
  };
  /** Usage bar options */
  bar?: {
    /** Whether bar is enabled */
    enabled?: boolean;
    /** Bar gradient colors */
    colors?: UsageBarColors;
  };
  /** Custom widget-specific options */
  custom?: WidgetCustomOption[];
}

/**
 * Complete widget schema - metadata for GUI and testing
 *
 * Each widget exports its schema alongside its implementation.
 * This is the single source of truth for:
 * - GUI palette display
 * - Category grouping
 * - Config panel rendering
 * - Default values
 */
export interface WidgetSchema {
  /** Unique widget identifier */
  id: string;
  /** Widget metadata (display name, description, category) */
  meta: WidgetMeta;
  /** Widget configuration options */
  options?: WidgetOptionsConfig;
  /** Preview states for testing */
  previewStates?: WidgetPreviewState[];
}

// =============================================================================
// Helper Types
// =============================================================================

/**
 * N/A visibility options for widgets
 *
 * Controls how widgets handle null/empty content.
 */
export type NaVisibility = 'hide' | 'na' | 'dash' | 'empty';