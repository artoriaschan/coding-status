# cdps

Cloud provider usage statusline for Claude Code CLI

[![npm version](https://badge.fury.io/js/cdps.svg)](https://www.npmjs.com/package/cdps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Display real-time cloud AI service usage directly in your Claude Code statusline. Currently supports Aliyun Bailian (百炼) through CloudMonitor API.

## Features

- **Real-time usage visibility** — See CallCount metrics without leaving your editor
- **Multiple time dimensions** — View usage for last 5 hours, 7 days, or 30 days
- **Visual indicators** — Color-coded output with optional progress bars
- **Silent failure** — Statusline never breaks, even on API errors
- **Configurable widgets** — Customize what information displays

## Installation

```bash
npm install -g cdps
```

Requires Node.js >= 18.0.0

## Quick Start

### 1. Initialize cdps

```bash
cdps init
```

This creates the `~/.cdps/` directory and updates Claude Code settings if available.

### 2. Add a provider

```bash
cdps add
```

Follow the prompts to configure your Aliyun Bailian credentials:
- AccessKey ID
- AccessKey Secret
- Region (e.g., cn-hangzhou)

### 3. Configure Claude Code statusline

Add to your Claude Code settings (usually at `~/.claude/settings.json`):

```json
{
  "statusline": "$(cdps statusline)"
}
```

Or run `cdps init` which will offer to do this automatically.

### 4. See it in action

```bash
cdps statusline
# Output: Bailian | 5h: 1,234 ▓▓▓░░░░░░░ 12%
```

## Configuration

### Provider Config (`~/.cdps/config.json`)

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

### Widget Settings (`~/.cdps/settings.json`)

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
| `usage` | Shows usage for a dimension | `dimension`: 5h/week/month, `showBar`: boolean |
| `separator` | Shows `\|` separator | `char`: custom character |
| `text` | Static text | `content`: string |

## Commands

| Command | Description |
|---------|-------------|
| `cdps init` | Initialize cdps configuration |
| `cdps add` | Add a new provider interactively |
| `cdps list` | List all configured providers |
| `cdps use <name>` | Switch to a different provider |
| `cdps rm <name>` | Remove a provider |
| `cdps doctor` | Check configuration health |
| `cdps statusline` | Output statusline string |

## Troubleshooting

### Statusline shows only provider name

API call failed. Run `cdps doctor` to check:
- Credentials are valid
- Network connectivity
- Circuit breaker state (after 3 failures)

### "No provider configured"

Run `cdps add` to add a provider first.

### Claude Code not showing statusline

1. Verify settings.json path: `~/.claude/settings.json`
2. Check that `cdps` is in your PATH: `which cdps`
3. Test manually: `cdps statusline`

### Cache issues

Clear the cache:
```bash
rm -rf ~/.cdps/cache/
```

## Requirements

- Node.js >= 18.0.0
- Claude Code CLI (for statusline integration)
- Aliyun account with Bailian service (for usage data)

## License

MIT
