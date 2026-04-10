# coding-plans-statusline (coding-status)

## Project

coding-status is a CLI tool that integrates with cloud provider usage APIs to display real-time usage information in Claude Code's statusline. Users configure different cloud providers through an adapter pattern. The first adapter supports Aliyun Bailian (querying CallCount metrics via CloudMonitor API).

**Target users:** Developers who use Claude Code for development and cloud AI services like Aliyun Bailian.

**Core Value:** Real-time usage visibility — Users can see current AI service usage consumption directly in Claude Code without leaving the development environment to check the provider console.

### Constraints

- **Tech Stack:** TypeScript ESM only (`"type": "module"`), chalk 5.x is ESM only
- **Runtime:** Node.js >= 18.0.0
- **Monorepo:** pnpm workspaces, no npm/yarn workspaces
- **Version:** Changesets fixed mode (all packages share unified version numbers)
- **Dependencies:** @alicloud/cms20190101 SDK for Bailian API calls
- **Security:** AccessKey/Secret stored in ~/.coding-status/config.json (user local, not committed to git)

## Technology Stack

### Core Technologies

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Node.js | 20.x LTS (>=18.0.0) | Runtime | LTS stability, native ESM support, required by project constraints |
| TypeScript | 5.4.x+ | Language | Native ESM support, strict type checking, modern decorator support |
| pnpm | 9.x+ | Package Manager | Fastest installs, strict peer dependency handling, workspace-native features |
| Commander | 13.x | CLI Framework | Mature, lightweight, excellent TypeScript support, auto-generated help |
| Chalk | 5.x | ANSI Colors | ESM-only (matches project constraint), minimal overhead, chainable API |
| Zod | 3.24.x | Schema Validation | TypeScript-first, runtime validation, excellent error messages |

### Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| tsup | 8.x | Bundler - Zero-config TypeScript bundling, ESM/CJS dual output |
| tsx | 4.x | TypeScript Execution - Run TypeScript directly in dev, ESM-native |
| Changesets | 2.x | Version Management - Industry standard for monorepos, fixed mode support |
| Vitest | 3.x | Testing - ESM-native, TypeScript-first, faster than Jest |

### Supporting Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| @clack/prompts | 0.10.x | Interactive Prompts - Modern, beautiful, minimal |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint 10.1.0 + typescript-eslint + Sheriff 0.19.6 | Linting with module boundary enforcement |
| Prettier 3.8.1 | Code formatting |
| Turborepo 2.x | Build orchestration with caching |
| Husky 9.x + lint-staged 16.x | Git hooks for pre-commit checks |

## Package Structure

```
packages/
  widget-renderer/       # Base layer - types, colors, widgets
  cli/                   # CLI framework + commands + bin entry (@coding-status/cli)
  usage-adapter-bailian/ # Aliyun Bailian provider adapter
```

## Installation

```bash
npm install -g coding-status
```

Requires Node.js >= 18.0.0

## Quick Start

```bash
# 1. Initialize coding-status
coding-status init

# 2. Add a provider
coding-status add

# 3. Configure Claude Code statusline (auto-detected during init)
# Or manually add to ~/.claude/settings.json:
# { "statusline": "$(coding-status statusline)" }

# 4. Test statusline output
coding-status statusline
```

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

## Configuration

### Provider Config (~/.coding-status/config.json)

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

Security note: This file is created with `chmod 600` to restrict access.

### Widget Settings (~/.coding-status/settings.json)

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

## Conventions

### Code Style
- Single quotes for strings
- 100 character line width
- 4-space indentation
- Barrel exports enforced via Sheriff rules

### Module Structure
- `domain/` - Business logic and core types
- `core/` - Shared utilities and helpers  
- `feature/` - Command implementations and adapters

### Testing
- `.spec.ts` naming convention
- Vitest for ESM-native testing
- Exclude `third_parts/` from test runs

## Architecture

### Widget Rendering Flow

1. **Settings Loader** reads ~/.coding-status/settings.json
2. **Widget Registry** maps widget types to implementations
3. **Renderer Engine** composes widgets into statusline output
4. **Color Utilities** apply thresholds and ANSI colors (respects NO_COLOR)

### Adapter Loading Flow

1. **AdapterLoader** dynamically imports adapter packages by name
2. **UsageAdapter** interface provides contract for all providers
3. **BailianAdapter** implements Aliyun CMS API integration
4. **Circuit Breaker** protects against consecutive API failures
5. **File Cache** stores results with configurable TTL

### CLI Command Flow

```
cli.ts (bootstrap)
  -> registerInit(program)
  -> registerAdd(program)
  -> registerList(program)
  -> registerUse(program)
  -> registerRm(program)
  -> registerDoctor(program)
  -> registerStatusline(program)
```

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ts-node | Slower than tsx, CommonJS default, complex ESM config | tsx (4.x) |
| Jest | CommonJS-first, slow, complex ESM support | Vitest (3.x) |
| Inquirer.js | Large bundle, dated API, maintenance mode | @clack/prompts |
| npm/yarn workspaces | Slower installs, less strict dependency resolution | pnpm workspaces |
| chalk 4.x | CommonJS, project requires ESM only | chalk 5.x |
| oclif | Overkill for simple CLI, large bundle | Commander |
| Joi | Large bundle, CommonJS default, less TypeScript-native | Zod |

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless explicitly asked to bypass it.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| chalk 5.x | Node.js >=18.0.0 | ESM-only, requires `"type": "module"` |
| tsx 4.x | TypeScript 5.x | Use `tsx watch` for dev, `tsup` for build |
| Commander 13.x | Node.js >=18.0.0 | Requires `"moduleResolution": "NodeNext"` |
| Zod 3.24.x | TypeScript 5.4+ | Best type inference with strict mode |
| pnpm 9.x | Node.js >=18.0.0 | Lockfile version 9, faster installs |

## Sources

- Commander.js documentation: https://github.com/tj/commander.js
- Chalk 5.x ESM release: https://github.com/chalk/chalk/releases/tag/v5.0.0
- tsup documentation: https://tsup.egoist.dev/
- pnpm workspaces: https://pnpm.io/workspaces
- Changesets documentation: https://github.com/changesets/changesets
- @clack/prompts: https://github.com/natemoo-re/clack
- Zod documentation: https://zod.dev/
- Vitest documentation: https://vitest.dev/
- tsx documentation: https://github.com/privatenumber/tsx
