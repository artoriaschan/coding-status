# @coding-status/cli

<p align="center">
  <strong>Claude Code CLI 云供应商用量 statusline 工具</strong>
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

[coding-status](https://github.com/coding-status) 的 CLI 框架和命令运行器。提供 `coding-status` 命令行界面以及用于动态加载用量适配器的 `AdapterLoader`。

属于 [coding-status](https://github.com/coding-status) 项目的一部分 —— 在 Claude Code statusline 中实时展示云 AI 服务用量。

## 特性

- **完整 CLI 套件** — `init`、`add`、`list`、`use`、`rm`、`doctor`、`statusline` 命令
- **动态适配器加载** — AdapterLoader 按名称发现并初始化适配器
- **单例缓存** — 已加载的适配器会被缓存，跨命令复用
- **丰富的错误处理** — 针对不同失败模式的专用错误类
- **交互式提示** — 使用 `@clack/prompts` 引导供应商配置

## 安装

### 全局安装（推荐终端用户使用）

```bash
npm install -g @coding-status/cli
```

这将全局安装 `coding-status` CLI 命令。

### 库安装（供开发者使用）

```bash
npm install @coding-status/cli
```

用于在自己的代码中导入 `AdapterLoader` 和错误类。

## 快速开始

### CLI 使用

```bash
# 初始化配置
coding-status init

# 添加供应商
coding-status add

# 查看已配置的供应商列表
coding-status list

# 检查配置健康状态
coding-status doctor

# 输出 statusline 字符串
coding-status statusline
```

完整使用文档请参阅[项目 README](https://github.com/coding-status)。

### 库导入使用

导入适配器加载器和错误类：

```typescript
import {
    AdapterLoader,
    AdapterError,
    AdapterNotFoundError,
    AdapterLoadError,
    AdapterInitError,
    AdapterUsageError,
} from '@coding-status/cli';

// 动态加载并初始化适配器
const loader = new AdapterLoader();
const adapter = await loader.getAdapter('bailian');

// 使用凭证初始化
await adapter.init({
    accessKeyId: 'your-key',
    accessKeySecret: 'your-secret',
});

// 获取用量数据
const usage = await adapter.getUsage('5h');
```

## API 概览

### AdapterLoader

动态适配器加载，带有单例缓存和延迟初始化。

```typescript
class AdapterLoader {
    // 按名称获取适配器，如果未缓存则加载并初始化
    getAdapter(name: string): Promise<UsageAdapter>;
}
```

- **单例缓存** — 每个适配器只加载和初始化一次，然后缓存
- **延迟加载** — 适配器仅在首次请求时加载
- **验证** — 验证适配器实现了 `UsageAdapter` 接口

### 错误类

所有错误类都继承自 `AdapterError`，并包含适配器名称以便调试。

| 错误类 | 触发时机 |
|--------|---------|
| `AdapterError` | 所有适配器错误的基类 |
| `AdapterNotFoundError` | 按名称找不到适配器包 |
| `AdapterLoadError` | 找到适配器包但导入失败 |
| `AdapterInitError` | 适配器 `init()` 失败（凭证无效、API 错误） |
| `AdapterUsageError` | 适配器 `getUsage()` 失败（API 错误、维度无效） |

```typescript
try {
    const adapter = await loader.getAdapter('bailian');
} catch (error) {
    if (error instanceof AdapterNotFoundError) {
        console.error(`找不到适配器: ${error.adapterName}`);
    }
}
```

### 命令

| 命令 | 描述 |
|------|------|
| `coding-status init` | 初始化配置并更新 Claude Code 设置 |
| `coding-status add` | 交互式添加新供应商 |
| `coding-status list` | 列出所有已配置的供应商 |
| `coding-status use <name>` | 切换到不同的供应商 |
| `coding-status rm <name>` | 删除一个供应商 |
| `coding-status doctor` | 检查配置健康状态 |
| `coding-status statusline` | 为 Claude Code 输出 statusline 字符串 |

## 配置

供应商配置存储在 `~/.coding-status/config.json` 中。组件设置存储在 `~/.coding-status/settings.json` 中。

详细配置文档请参阅[项目 README](https://github.com/coding-status#configuration)。

## 依赖

| 包 | 用途 |
|----|------|
| `@coding-status/widget-renderer` | statusline 输出的组件渲染 |
| `@clack/prompts` | 交互式 CLI 提示 |
| `chalk` | ANSI 颜色输出 |
| `commander` | CLI 框架 |
| `zod` | 运行时 Schema 验证 |
| `parse-json` | 带有帮助错误信息的 JSON 解析 |

## 许可证

MIT
