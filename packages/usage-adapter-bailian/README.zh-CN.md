# @coding-status/usage-adapter-bailian

<p align="center">
  <strong>Coding Status 阿里云百炼用量适配器</strong>
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

[coding-status](https://github.com/coding-status) 的阿里云百炼（Bailian）用量适配器。实现 `UsageAdapter` 接口，通过阿里云云监控 API 获取 CallCount 指标。

属于 [coding-status](https://github.com/coding-status) 项目的一部分 —— 在 Claude Code statusline 中实时展示云 AI 服务用量。

## 特性

- **CallCount 指标** — 通过阿里云云监控 DescribeMetricList API 获取 AI 服务用量
- **多时间维度** — 支持 `5h`（最近 5 小时）、`week`（最近 7 天）、`month`（最近 30 天）
- **熔断器保护** — 防止连续 API 失败，5 分钟后自动恢复
- **文件缓存** — 带可配置 TTL 的缓存（默认 300 秒）
- **超时处理** — 所有 API 调用强制执行超时，防止挂起
- **凭证验证** — 在 `init()` 期间验证 API 连通性

## 安装

```bash
npm install @coding-status/usage-adapter-bailian
```

注意：此适配器通常由 `@coding-status/cli` 在运行 `coding-status add` 并选择 `bailian` 类型时动态加载。直接导入适用于构建自定义集成的开发者。

## 快速开始

### 基础使用

```typescript
import BailianAdapter from '@coding-status/usage-adapter-bailian';

// 使用阿里云凭证初始化
await BailianAdapter.init({
    accessKeyId: 'your-access-key-id',
    accessKeySecret: 'your-access-key-secret',
});

// 获取可用的时间维度
const dimensions = await BailianAdapter.getDimensions();
// 返回: [{ key: '5h', label: '最近 5 小时' }, { key: 'week', label: '最近 7 天' }, { key: 'month', label: '最近 30 天' }]

// 获取指定维度的用量
const usage5h = await BailianAdapter.getUsage('5h');
console.log(`最近 5 小时调用次数: ${usage5h}`);

const usageWeek = await BailianAdapter.getUsage('week');
console.log(`最近 7 天调用次数: ${usageWeek}`);
```

### 配合 Coding Status CLI 使用

```bash
# CLI 会自动加载此适配器
coding-status add
# 选择 "bailian" 类型，输入凭证

# 在 statusline 中查看用量
coding-status statusline
```

## API 概览

### BailianAdapter

实现来自 `@coding-status/widget-renderer` 的 `UsageAdapter` 接口。

```typescript
const BailianAdapter: UsageAdapter = {
    name: 'bailian',
    displayName: 'Aliyun Bailian',
    init(credentials: Record<string, string>): Promise<void>,
    getDimensions(): Promise<UsageDimension[]>,
    getUsage(dimension: string): Promise<number>,
};
```

#### 属性

| 属性 | 值 | 描述 |
|------|-----|------|
| `name` | `'bailian'` | 适配器标识符，用于加载和缓存 |
| `displayName` | `'Aliyun Bailian'` | 用于 UI 显示的人类可读名称 |

#### 方法

**`init(credentials)`** — 使用阿里云凭证初始化适配器。

```typescript
await BailianAdapter.init({
    accessKeyId: 'LTAI...',
    accessKeySecret: 'xxxx...',
});
```

- 验证凭证结构（需要 `accessKeyId` 和 `accessKeySecret`）
- 创建阿里云云监控 SDK 客户端
- 通过查询最近 1 小时 CallCount 验证 API 连通性
- 失败时抛出 `AdapterInitError`

**`getDimensions()`** — 获取可用的时间维度。

```typescript
const dims = await BailianAdapter.getDimensions();
// [
//   { key: '5h', label: '最近 5 小时', category: 'recent' },
//   { key: 'week', label: '最近 7 天', category: 'history' },
//   { key: 'month', label: '最近 30 天', category: 'history' }
// ]
```

**`getUsage(dimension)`** — 获取指定维度的 CallCount。

```typescript
const count = await BailianAdapter.getUsage('5h');
```

- 检查文件缓存（TTL：默认 300 秒）
- 检查熔断器状态
- 如果缓存未命中，调用阿里云 DescribeMetricList API
- API 失败时回退到过期缓存
- 返回时间范围内的 CallCount 总和

## 配置

### 必需凭证

| 凭证 | 描述 | 示例 |
|------|------|------|
| `accessKeyId` | 阿里云 AccessKey ID | `LTAI5t...` |
| `accessKeySecret` | 阿里云 AccessKey Secret | `xxxx...` |

### 可选设置

| 设置 | 默认值 | 描述 |
|------|--------|------|
| `cacheTtl` | `300` | 缓存有效期（秒） |
| `region` | `cn-hangzhou` | API 调用的阿里云地域 |

### 缓存与熔断器

- **缓存路径：** `~/.coding-status/cache/bailian.json`
- **熔断器路径：** `~/.coding-status/cache/circuit-breaker.json`
- **恢复机制：** 连续 3 次失败后熔断器打开，5 分钟后关闭

## 阿里云 API 参考

| 项目 | 值 |
|------|-----|
| SDK | `@alicloud/cms20190101` v4.0 |
| API | DescribeMetricList |
| 命名空间 | `acs_bailian` |
| 指标 | `CallCount` |
| 超时 | 5000ms（可通过 `API_TIMEOUT` 配置） |

## 依赖

| 包 | 用途 |
|----|------|
| `@coding-status/widget-renderer` | UsageAdapter 接口、类型定义 |
| `@coding-status/cli` | AdapterInitError 错误类 |
| `@alicloud/cms20190101` | 阿里云云监控 SDK |
| `@alicloud/openapi-core` | 阿里云 OpenAPI 核心工具 |

## 许可证

MIT
