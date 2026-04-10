# @coding-status/cli

<p align="center">
  <strong>Cloud provider usage statusline tool for Claude Code CLI</strong>
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

CLI framework and command runner for [coding-status](https://github.com/coding-status). Provides the `coding-status` command-line interface and the `AdapterLoader` for dynamically loading usage adapters.

Part of the [coding-status](https://github.com/coding-status) project — real-time cloud AI service usage visibility in Claude Code statusline.

## Features

- **Full CLI suite** — `init`, `add`, `list`, `use`, `rm`, `doctor`, `statusline` commands
- **Dynamic adapter loading** — AdapterLoader discovers and initializes adapters by name
- **Singleton cache** — Loaded adapters are cached for reuse across commands
- **Rich error handling** — Dedicated error classes for different failure modes
- **Interactive prompts** — Uses `@clack/prompts` for guided provider configuration

## Installation

### Global install (recommended for end users)

```bash
npm install -g @coding-status/cli
```

This installs the `coding-status` CLI command globally.

### Library install (for developers)

```bash
npm install @coding-status/cli
```

Use this to import `AdapterLoader` and error classes in your own code.

## Quick Start

### CLI Usage

```bash
# Initialize configuration
coding-status init

# Add a provider
coding-status add

# List configured providers
coding-status list

# Check configuration health
coding-status doctor

# Output statusline string
coding-status statusline
```

For full usage documentation, see the [project README](https://github.com/coding-status).

### Library Usage

Import the adapter loader and error classes:

```typescript
import {
    AdapterLoader,
    AdapterError,
    AdapterNotFoundError,
    AdapterLoadError,
    AdapterInitError,
    AdapterUsageError,
} from '@coding-status/cli';

// Dynamically load and initialize an adapter
const loader = new AdapterLoader();
const adapter = await loader.getAdapter('bailian');

// Initialize with credentials
await adapter.init({
    accessKeyId: 'your-key',
    accessKeySecret: 'your-secret',
});

// Fetch usage data
const usage = await adapter.getUsage('5h');
```

## API Overview

### AdapterLoader

Dynamic adapter loading with singleton caching and lazy initialization.

```typescript
class AdapterLoader {
    // Get an adapter by name, loading and initializing if not cached
    getAdapter(name: string): Promise<UsageAdapter>;
}
```

- **Singleton cache** — Each adapter is loaded and initialized once, then cached
- **Lazy loading** — Adapters are loaded only when first requested
- **Validation** — Verifies adapter implements the `UsageAdapter` interface

### Error Classes

All error classes extend `AdapterError` and include the adapter name for debugging.

| Error Class | When It's Thrown |
|-------------|-----------------|
| `AdapterError` | Base error class for all adapter errors |
| `AdapterNotFoundError` | Adapter package cannot be found by name |
| `AdapterLoadError` | Adapter package found but failed to import |
| `AdapterInitError` | Adapter `init()` failed (invalid credentials, API error) |
| `AdapterUsageError` | Adapter `getUsage()` failed (API error, invalid dimension) |

```typescript
try {
    const adapter = await loader.getAdapter('bailian');
} catch (error) {
    if (error instanceof AdapterNotFoundError) {
        console.error(`Adapter not found: ${error.adapterName}`);
    }
}
```

### Commands

| Command | Description |
|---------|-------------|
| `coding-status init` | Initialize configuration and update Claude Code settings |
| `coding-status add` | Add a new provider interactively |
| `coding-status list` | List all configured providers |
| `coding-status use <name>` | Switch to a different provider |
| `coding-status rm <name>` | Remove a provider |
| `coding-status doctor` | Check configuration health |
| `coding-status statusline` | Output statusline string for Claude Code |

## Configuration

Provider configuration is stored in `~/.coding-status/config.json`. Widget settings are stored in `~/.coding-status/settings.json`.

For detailed configuration documentation, see the [project README](https://github.com/coding-status#configuration).

## Dependencies

| Package | Purpose |
|---------|---------|
| `@coding-status/widget-renderer` | Widget rendering for statusline output |
| `@clack/prompts` | Interactive CLI prompts |
| `chalk` | ANSI color output |
| `commander` | CLI framework |
| `zod` | Runtime schema validation |
| `parse-json` | JSON parsing with helpful error messages |

## License

MIT
