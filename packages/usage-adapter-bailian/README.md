# @coding-status/usage-adapter-bailian

<p align="center">
  <strong>Aliyun Bailian usage adapter for Coding Status</strong>
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

Aliyun Bailian (阿里云百炼) usage adapter for [coding-status](https://github.com/coding-status). Implements the `UsageAdapter` interface to fetch CallCount metrics via Aliyun CloudMonitor API.

Part of the [coding-status](https://github.com/coding-status) project — real-time cloud AI service usage visibility in Claude Code statusline.

## Features

- **CallCount metrics** — Fetches AI service usage via Aliyun CloudMonitor DescribeMetricList API
- **Multiple time dimensions** — Supports `5h` (last 5 hours), `week` (last 7 days), `month` (last 30 days)
- **Circuit breaker** — Protects against consecutive API failures, auto-recovers after 5 minutes
- **File cache** — Caches results with configurable TTL (default 300 seconds)
- **Timeout handling** — All API calls enforce a timeout to prevent hanging
- **Credential validation** — Verifies API connectivity during `init()`

## Installation

```bash
npm install @coding-status/usage-adapter-bailian
```

Note: This adapter is typically loaded dynamically by `@coding-status/cli` when you run `coding-status add` and select the `bailian` type. Direct import is for developers building custom integrations.

## Quick Start

### Basic Usage

```typescript
import BailianAdapter from '@coding-status/usage-adapter-bailian';

// Initialize with Aliyun credentials
await BailianAdapter.init({
    accessKeyId: 'your-access-key-id',
    accessKeySecret: 'your-access-key-secret',
});

// Get available dimensions
const dimensions = await BailianAdapter.getDimensions();
// Returns: [{ key: '5h', label: 'Last 5 hours' }, { key: 'week', label: 'Last 7 days' }, { key: 'month', label: 'Last 30 days' }]

// Fetch usage for a dimension
const usage5h = await BailianAdapter.getUsage('5h');
console.log(`Last 5 hours CallCount: ${usage5h}`);

const usageWeek = await BailianAdapter.getUsage('week');
console.log(`Last 7 days CallCount: ${usageWeek}`);
```

### With Coding Status CLI

```bash
# The CLI loads this adapter automatically
coding-status add
# Select "bailian" type, enter credentials

# View usage in statusline
coding-status statusline
```

## API Overview

### BailianAdapter

Implements the `UsageAdapter` interface from `@coding-status/widget-renderer`.

```typescript
const BailianAdapter: UsageAdapter = {
    name: 'bailian',
    displayName: 'Aliyun Bailian',
    init(credentials: Record<string, string>): Promise<void>,
    getDimensions(): Promise<UsageDimension[]>,
    getUsage(dimension: string): Promise<number>,
};
```

#### Properties

| Property | Value | Description |
|----------|-------|-------------|
| `name` | `'bailian'` | Adapter identifier, used for loading and caching |
| `displayName` | `'Aliyun Bailian'` | Human-readable name for UI display |

#### Methods

**`init(credentials)`** — Initialize adapter with Aliyun credentials.

```typescript
await BailianAdapter.init({
    accessKeyId: 'LTAI...',
    accessKeySecret: 'xxxx...',
});
```

- Validates credential structure (requires `accessKeyId` and `accessKeySecret`)
- Creates Aliyun CloudMonitor SDK client
- Verifies API connectivity by querying last 1 hour CallCount
- Throws `AdapterInitError` on failure

**`getDimensions()`** — Get available time dimensions.

```typescript
const dims = await BailianAdapter.getDimensions();
// [
//   { key: '5h', label: 'Last 5 hours', category: 'recent' },
//   { key: 'week', label: 'Last 7 days', category: 'history' },
//   { key: 'month', label: 'Last 30 days', category: 'history' }
// ]
```

**`getUsage(dimension)`** — Fetch CallCount for the specified dimension.

```typescript
const count = await BailianAdapter.getUsage('5h');
```

- Checks file cache (TTL: 300s by default)
- Checks circuit breaker state
- Calls Aliyun DescribeMetricList API if cache miss
- Falls back to stale cache on API failure
- Returns CallCount sum for the time range

## Configuration

### Required Credentials

| Credential | Description | Example |
|------------|-------------|---------|
| `accessKeyId` | Aliyun AccessKey ID | `LTAI5t...` |
| `accessKeySecret` | Aliyun AccessKey Secret | `xxxx...` |

### Optional Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `cacheTtl` | `300` | Cache time-to-live in seconds |
| `region` | `cn-hangzhou` | Aliyun region for API calls |

### Cache and Circuit Breaker

- **Cache path:** `~/.coding-status/cache/bailian.json`
- **Circuit breaker path:** `~/.coding-status/cache/circuit-breaker.json`
- **Recovery:** Circuit breaker opens after 3 consecutive failures, closes after 5 minutes

## Aliyun API Reference

| Item | Value |
|------|-------|
| SDK | `@alicloud/cms20190101` v4.0 |
| API | DescribeMetricList |
| Namespace | `acs_bailian` |
| Metric | `CallCount` |
| Timeout | 5000ms (configurable via `API_TIMEOUT`) |

## Dependencies

| Package | Purpose |
|---------|---------|
| `@coding-status/widget-renderer` | UsageAdapter interface, types |
| `@coding-status/cli` | AdapterInitError error class |
| `@alicloud/cms20190101` | Aliyun CloudMonitor SDK |
| `@alicloud/openapi-core` | Aliyun OpenAPI core utilities |

## License

MIT
