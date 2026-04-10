# coding-status

<p align="center">
  <strong>Cloud provider usage statusline for Claude Code CLI</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/coding-status">
    <img src="https://badge.fury.io/js/coding-status.svg" alt="npm version">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
</p>

<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

---

Display real-time cloud AI service usage directly in your Claude Code statusline. Currently supports Aliyun Bailian (百炼) through CloudMonitor API.

## Features

- **Real-time usage visibility** — See CallCount metrics without leaving your editor
- **Multiple time dimensions** — View usage for last 5 hours, 7 days, or 30 days
- **Visual indicators** — Color-coded output with optional progress bars
- **Silent failure** — Statusline never breaks, even on API errors
- **Configurable widgets** — Customize what information displays

## Installation

```bash
npm install -g coding-status
```

Requires Node.js >= 20.12.0

## Quick Start

### 1. Initialize coding-status

```bash
coding-status init
```

This creates the `~/.coding-status/` directory and updates Claude Code settings if available.

### 2. Add a provider

```bash
coding-status add
```

Follow the prompts to configure your Aliyun Bailian credentials:
- AccessKey ID
- AccessKey Secret
- Region (e.g., cn-hangzhou)

### 3. Configure Claude Code statusline

Add to your Claude Code settings (usually at `~/.claude/settings.json`):

```json
{
  "statusline": "$(coding-status statusline)"
}
```

Or run `coding-status init` which will offer to do this automatically.

### 4. See it in action

```bash
coding-status statusline
# Output: Bailian | 5h: 1,234 ▓▓▓░░░░░░░ 12%
```

## Configuration

### Provider Config (`~/.coding-status/config.json`)

```json
{
  "providers": [
    {
      "name": "my-bailian",
      "type": "bailian",
      "credentials": {
        "accessKeyId": "your-access-key",
        "accessKeySecret": "your-secret",
        "region": "cn-hangzhou"
      }
    }
  ],
  "current": "my-bailian",
  "cacheTtl": 300
}
```

**Security note:** This file is created with `chmod 600` to restrict access.

### Widget Settings (`~/.coding-status/settings.json`)

```json
{
  "rows": [
    {
      "widgets": [
        { "type": "provider" },
        { "type": "separator" },
        { "type": "usage", "dimension": "5h", "showBar": true }
      ]
    }
  ],
  "thresholds": {
    "low": 50,
    "medium": 80
  },
  "colors": {
    "low": "green",
    "medium": "yellow",
    "high": "red"
  }
}
```

### Widget Types

| Widget | Description | Options |
|--------|-------------|---------|
| `provider` | Shows current provider name | — |
| `usage` | Shows usage for a dimension | `dimension`: `5h`/`week`/`month`, `showBar`: boolean |
| `separator` | Shows `\|` separator | `char`: custom character |
| `text` | Static text | `content`: string |

## Commands

| Command | Description |
|---------|-------------|
| `coding-status init` | Initialize coding-status configuration |
| `coding-status add` | Add a new provider interactively |
| `coding-status list` | List all configured providers |
| `coding-status use <name>` | Switch to a different provider |
| `coding-status rm <name>` | Remove a provider |
| `coding-status doctor` | Check configuration health |
| `coding-status statusline` | Output statusline string |

## Troubleshooting

### Statusline shows only provider name

API call failed. Run `coding-status doctor` to check:
- Credentials are valid
- Network connectivity
- Circuit breaker state (after 3 failures)

### "No provider configured"

Run `coding-status add` to add a provider first.

### Claude Code not showing statusline

1. Verify settings.json path: `~/.claude/settings.json`
2. Check that `coding-status` is in your PATH: `which coding-status`
3. Test manually: `coding-status statusline`

### Cache issues

Clear the cache:
```bash
rm -rf ~/.coding-status/cache/
```

## Development

### Prerequisites

- Node.js >= 20.12.0
- pnpm >= 9.x

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test:run
```

### Local Development

```bash
# Watch mode - rebuilds on file changes
pnpm dev

# Run CLI locally with tsx
npx tsx packages/core/src/index.ts <command>

# Example
npx tsx packages/core/src/index.ts statusline
```

### Debug with Logs

```bash
# Enable debug output
DEBUG=1 npx tsx packages/core/src/index.ts statusline

# Check configuration
cat ~/.coding-status/config.json
cat ~/.coding-status/settings.json
```

## Publishing Workflow

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

### Creating a Changeset

```bash
# Add a changeset for your changes
pnpm changeset

# Select the packages you've modified
# Enter a summary of changes
```

### Prerelease (Beta/RC)

```bash
# Enter prerelease mode
pnpm changeset pre enter beta

# Create changeset and version
pnpm changeset
pnpm changeset version

# Build and publish with beta tag
pnpm build
pnpm changeset publish

# Exit prerelease mode
pnpm changeset pre exit
```

### Production Release

**Automated (Recommended):**
1. Create a PR with your changes and changeset
2. Merge to `main` branch
3. GitHub Actions creates a "Version Packages" PR
4. Merge the "Version Packages" PR → auto-publishes to npm

**Manual (Maintainers only):**
```bash
pnpm build
pnpm version    # Update versions and changelog
pnpm release    # Publish to npm
```

### Release Configuration

- **Fixed mode**: All packages share the same version
- **Base branch**: `main`
- **Access**: Public npm packages

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Build all packages | `pnpm build` |
| Run tests | `pnpm test:run` |
| Run tests with coverage | `pnpm test:coverage` |
| Lint | `pnpm lint` |
| Format code | `pnpm format` |
| Create changeset | `pnpm changeset` |
| Check changeset status | `pnpm changeset status` |
| Run CLI locally | `npx tsx packages/core/src/index.ts <command>` |

## Requirements

- Node.js >= 20.12.0
- Claude Code CLI (for statusline integration)
- Aliyun account with Bailian service (for usage data)

## License

MIT
