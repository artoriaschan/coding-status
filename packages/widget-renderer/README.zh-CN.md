# @coding-status/widget-renderer

<p align="center">
  <strong>coding-status statusline 组件渲染库</strong>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
</p>

<p align="center">
  <a href="README.md">English</a> | 简体中文
</p>

---

[coding-status](https://github.com/coding-status) 的组件渲染引擎和组件库。提供类型定义、内置组件、颜色工具、设置管理和 statusline 渲染管线。

属于 [coding-status](https://github.com/coding-status) 项目的一部分 —— 在 Claude Code statusline 中实时展示云 AI 服务用量。

## 特性

- **可组合组件系统** — 分隔符、文本、供应商、用量四种基础组件
- **设置管理** — 带 JSON Schema 验证的设置加载/保存
- **颜色工具** — 基于阈值的 ANSI 颜色输出，支持 `NO_COLOR`
- **类型安全 API** — 完整的 TypeScript 类型定义
- **Zod Schema** — 运行时验证，支持生成 JSON Schema

## 安装

```bash
npm install @coding-status/widget-renderer
```

注意：此包通常作为 `@coding-status/cli` 或适配器包的依赖使用。直接导入适用于构建自定义组件或集成渲染管线的开发者。

## 快速开始

### 基础渲染

```typescript
import { renderStatusLine, loadSettings } from '@coding-status/widget-renderer';

// 从 ~/.coding-status/settings.json 加载设置
const settings = await loadSettings();

// 渲染 statusline
const output = renderStatusLine(settings, adapter, context);
console.log(output);
// 输出: Bailian | 5h: 1,234 ▓▓▓░░░░░░░ 12%
```

### 组件配置

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

## API 概览

### 类型

| 类型 | 描述 |
|------|------|
| `UsageAdapter` | 所有用量适配器必须实现的接口 |
| `Widget` | 基础组件接口 |
| `WidgetConfig` | 组件配置对象 |
| `Settings` | 完整设置结构 |
| `UsageDimension` | 时间维度类型（`'5h'` | `'week'` | `'month'`） |
| `DimensionCategory` | 用于适配器扩展的维度分类 |
| `RenderContext` | 传递给渲染器的上下文（适配器、缓存值） |
| `WidgetMeta` | 组件元数据（名称、描述、图标） |
| `ColorValue` | 有效颜色值（10 种 chalk 兼容颜色） |

### 渲染器

```typescript
import { renderStatusLine } from '@coding-status/widget-renderer';

// 从设置和适配器渲染完整的 statusline
function renderStatusLine(
    settings: Settings,
    adapter: UsageAdapter | null,
    context: RenderContext
): string;
```

### 设置

```typescript
import {
    loadSettings,
    saveSettings,
    DEFAULT_SETTINGS,
    SETTINGS_PATH,
} from '@coding-status/widget-renderer';
```

- `loadSettings()` — 从 `~/.coding-status/settings.json` 读取设置，错误时回退到 `DEFAULT_SETTINGS`
- `saveSettings(settings)` — 将设置写入磁盘
- `DEFAULT_SETTINGS` — 默认设置（包含 provider + separator + usage 组件）
- `SETTINGS_PATH` — 路径常量（`~/.coding-status/settings.json`）

### 设置 Schema

```typescript
import {
    SettingsSchema,
    WidgetConfigSchema,
    ThemeSchema,
    WidgetTypeEnum,
} from '@coding-status/widget-renderer';
```

也可通过 `./settings.schema` 子路径导出获取，用于生成 JSON Schema：

```typescript
import { SettingsSchema } from '@coding-status/widget-renderer/settings.schema';
```

### 内置组件

访问组件注册表：

```typescript
import {
    BUILTIN_WIDGETS,
    getWidget,
    getWidgetSchema,
    getAllSchemas,
} from '@coding-status/widget-renderer';
```

| 组件 | 描述 | 关键导出 |
|------|------|---------|
| `separator` | 视觉分隔符（默认 `\|`） | `SeparatorWidget`, `SeparatorSchema` |
| `text` | 静态文本显示 | `TextWidget`, `TextSchema` |
| `provider` | 当前供应商名称显示 | `ProviderWidget`, `ProviderSchema` |
| `usage` | 用量值，可选进度条 | `UsageWidget`, `UsageSchema` |

### 颜色工具

```typescript
import {
    setPlainMode,
    getChalkColor,
    colorize,
    createUsageBar,
} from '@coding-status/widget-renderer';
```

- `setPlainMode(true)` — 禁用 ANSI 颜色（也可通过 `NO_COLOR` 环境变量触发）
- `getChalkColor('green')` — 按名称获取 chalk 颜色函数
- `colorize(text, color, threshold)` — 应用基于阈值的着色
- `createUsageBar(value, max, segments, options)` — 创建可视化用量条

### 共享辅助函数

```typescript
import { getOption, renderWidgetWithLabel } from '@coding-status/widget-renderer';
```

- `getOption(widget, key, defaultValue)` — 获取组件选项，带回退值
- `renderWidgetWithLabel(widget, value)` — 渲染带标签前缀的组件

### 常量

```typescript
import { VALID_COLORS, isValidColor } from '@coding-status/widget-renderer';
```

- `VALID_COLORS` — 有效颜色值数组
- `isValidColor(value)` — 检查值是否为有效颜色

## 组件类型

| 类型 | 选项 | 输出示例 |
|------|------|---------|
| `provider` | — | `Bailian` |
| `separator` | `char?: string` | `\|` |
| `text` | `content: string` | `Custom text` |
| `usage` | `dimension: '5h'\|'week'\|'month'`, `showBar?: boolean` | `5h: 1,234 ▓▓▓░░░░░░░` |

## 依赖

| 包 | 用途 |
|----|------|
| `chalk` | ANSI 颜色输出 |
| `zod` | Schema 验证和类型推导 |

## 许可证

MIT
