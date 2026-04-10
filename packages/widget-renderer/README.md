# @coding-status/widget-renderer

<p align="center">
  <strong>Statusline widget rendering library for coding-status</strong>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
</p>

<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

---

Widget rendering engine and component library for [coding-status](https://github.com/coding-status). Provides types, built-in widgets, color utilities, settings management, and the statusline rendering pipeline.

Part of the [coding-status](https://github.com/coding-status) project — real-time cloud AI service usage visibility in Claude Code statusline.

## Features

- **Composable widget system** — Separator, text, provider, and usage widgets
- **Settings management** — Load/save settings with JSON Schema validation
- **Color utilities** — ANSI color output with threshold-based coloring, respects `NO_COLOR`
- **Type-safe API** — Full TypeScript types for all widgets, settings, and rendering
- **Zod schemas** — Runtime validation with generated JSON Schemas

## Installation

```bash
npm install @coding-status/widget-renderer
```

Note: This package is typically consumed as a dependency of `@coding-status/cli` or adapter packages. Direct usage is for developers building custom widgets or integrating the rendering pipeline.

## Quick Start

### Basic Rendering

```typescript
import { renderStatusLine, loadSettings } from '@coding-status/widget-renderer';

// Load settings from ~/.coding-status/settings.json
const settings = await loadSettings();

// Render the statusline
const output = renderStatusLine(settings, adapter, context);
console.log(output);
// Output: Bailian | 5h: 1,234 ▓▓▓░░░░░░░ 12%
```

### Widget Configuration

```typescript
import { Settings } from '@coding-status/widget-renderer';

const settings: Settings = {
    rows: [
        {
            widgets: [
                { type: 'provider' },
                { type: 'separator' },
                { type: 'usage', dimension: '5h', showBar: true },
            ],
        },
    ],
    thresholds: {
        low: 50,
        medium: 80,
    },
    colors: {
        low: 'green',
        medium: 'yellow',
        high: 'red',
    },
};
```

## API Overview

### Types

| Type | Description |
|------|-------------|
| `UsageAdapter` | Interface that all usage adapters must implement |
| `Widget` | Base widget interface |
| `WidgetConfig` | Widget configuration object |
| `Settings` | Full settings structure |
| `UsageDimension` | Time dimension type (`'5h'` | `'week'` | `'month'`) |
| `DimensionCategory` | Dimension category for adapter extensibility |
| `RenderContext` | Context passed to renderer (adapter, cached values) |
| `WidgetMeta` | Widget metadata (name, description, icon) |
| `ColorValue` | Valid color values (10 chalk-compatible colors) |

### Renderer

```typescript
import { renderStatusLine } from '@coding-status/widget-renderer';

// Render a complete statusline from settings and adapter
function renderStatusLine(
    settings: Settings,
    adapter: UsageAdapter | null,
    context: RenderContext
): string;
```

### Settings

```typescript
import {
    loadSettings,
    saveSettings,
    DEFAULT_SETTINGS,
    SETTINGS_PATH,
} from '@coding-status/widget-renderer';
```

- `loadSettings()` — Reads settings from `~/.coding-status/settings.json`, falls back to `DEFAULT_SETTINGS` on error
- `saveSettings(settings)` — Writes settings to disk
- `DEFAULT_SETTINGS` — Default settings with provider + separator + usage widgets
- `SETTINGS_PATH` — Path constant (`~/.coding-status/settings.json`)

### Settings Schema

```typescript
import {
    SettingsSchema,
    WidgetConfigSchema,
    ThemeSchema,
    WidgetTypeEnum,
} from '@coding-status/widget-renderer';
```

Also available via the `./settings.schema` subpath export for JSON Schema generation:

```typescript
import { SettingsSchema } from '@coding-status/widget-renderer/settings.schema';
```

### Built-in Widgets

Access the widget registry:

```typescript
import {
    BUILTIN_WIDGETS,
    getWidget,
    getWidgetSchema,
    getAllSchemas,
} from '@coding-status/widget-renderer';
```

| Widget | Description | Key Export |
|--------|-------------|------------|
| `separator` | Visual separator (`\|` by default) | `SeparatorWidget`, `SeparatorSchema` |
| `text` | Static text display | `TextWidget`, `TextSchema` |
| `provider` | Current provider name display | `ProviderWidget`, `ProviderSchema` |
| `usage` | Usage value with optional progress bar | `UsageWidget`, `UsageSchema` |

### Color Utilities

```typescript
import {
    setPlainMode,
    getChalkColor,
    colorize,
    createUsageBar,
} from '@coding-status/widget-renderer';
```

- `setPlainMode(true)` — Disable ANSI colors (also triggered by `NO_COLOR` env var)
- `getChalkColor('green')` — Get chalk color function by name
- `colorize(text, color, threshold)` — Apply threshold-based coloring
- `createUsageBar(value, max, segments, options)` — Create visual usage bar

### Shared Helpers

```typescript
import { getOption, renderWidgetWithLabel } from '@coding-status/widget-renderer';
```

- `getOption(widget, key, defaultValue)` — Get widget option with fallback
- `renderWidgetWithLabel(widget, value)` — Render a widget with its label prefix

### Constants

```typescript
import { VALID_COLORS, isValidColor } from '@coding-status/widget-renderer';
```

- `VALID_COLORS` — Array of valid color values
- `isValidColor(value)` — Check if a value is a valid color

## Widget Types

| Type | Options | Output Example |
|------|---------|----------------|
| `provider` | — | `Bailian` |
| `separator` | `char?: string` | `\|` |
| `text` | `content: string` | `Custom text` |
| `usage` | `dimension: '5h'\|'week'\|'month'`, `showBar?: boolean` | `5h: 1,234 ▓▓▓░░░░░░░` |

## Dependencies

| Package | Purpose |
|---------|---------|
| `chalk` | ANSI color output |
| `zod` | Schema validation and type inference |

## License

MIT
