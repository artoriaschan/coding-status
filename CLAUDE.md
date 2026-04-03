<!-- GSD:project-start source:PROJECT.md -->
## Project

**coding-plans-statusline (cdps)**

cdps 是一个 CLI 工具，用于接入云供应商用量查询 API，将用量信息实时展示在 Claude Code 的 statusline 中。用户通过适配器模式配置不同云供应商，首个适配器支持阿里百炼（通过云监控 API 查询 CallCount 指标）。

目标用户：使用 Claude Code 开发，同时使用阿里百炼等云 AI 服务的开发者。

**Core Value:** **实时用量可见性** — 用户能在 Claude Code 中直接看到当前 AI 服务的用量消耗，无需离开开发环境去查看供应商控制台。

### Constraints

- **Tech Stack**: TypeScript ESM only (`"type": "module"`)，chalk 5.x 是 ESM only
- **Runtime**: Node.js >= 18.0.0
- **Monorepo**: pnpm workspaces，不使用 npm/yarn workspaces
- **Version**: Changesets fixed mode（所有包统一版本号）
- **Dependencies**: @alicloud/cms20190101 SDK 用于百炼 API 调用
- **Security**: AccessKey/Secret 存储在 ~/.cdps/config.json（用户本地，不上传 git）
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 20.x LTS (>=18.0.0) | Runtime | LTS stability, native ESM support, required by project constraints |
| TypeScript | 5.4.x+ | Language | Native ESM support, strict type checking, modern decorator support |
| pnpm | 9.x+ | Package Manager | Fastest installs, strict peer dependency handling, workspace-native features |
| Commander | 13.x | CLI Framework | Mature, lightweight, excellent TypeScript support, auto-generated help |
| Chalk | 5.x | ANSI Colors | ESM-only (matches project constraint), minimal overhead, chainable API |
| Zod | 3.24.x | Schema Validation | TypeScript-first, runtime validation, excellent error messages |
### Infrastructure (Monorepo & Build)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tsup | 8.x | Bundler | Zero-config TypeScript bundling, ESM/CJS dual output, blazing fast |
| tsx | 4.x | TypeScript Execution | Run TypeScript directly in dev, faster than ts-node, ESM-native |
| Changesets | 2.x | Version Management | Industry standard for monorepos, fixed mode support, GitHub Actions integration |
| Vitest | 3.x | Testing | ESM-native, TypeScript-first, faster than Jest, Vite-based |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @clack/prompts | 0.10.x | Interactive Prompts | All interactive commands (init, add) — modern, beautiful, minimal |
| execa | 9.x | Process Execution | Shelling out to modify Claude Code settings.json |
| cosmiconfig | 9.x | Config Discovery | If expanding to support multiple config file formats |
| consola | 3.x | Logging | CLI output with icons/colors — Nuxt/Vue CLI proven |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| @types/node | Type definitions | Always match Node.js version |
| tsx | Dev script runner | Replaces ts-node, `tsx watch src/index.ts` |
| rimraf | Cross-platform rm | Windows compatibility for clean scripts |
| c8 | Code coverage | Native alternative to nyc, works with Vitest |
## Installation
### Project Root (pnpm workspace)
# Initialize monorepo
# Core CLI dependencies (installed in packages/core/)
# Widget renderer (installed in packages/widget-renderer/)
# Bailian adapter (installed in packages/usage-adapter-bailian/)
# Interactive prompts (for core)
### TypeScript Configuration (tsconfig.base.json)
### Package.json ESM Configuration
## Alternatives Considered
### CLI Framework: Commander vs oclif vs cac
| Aspect | Commander (Recommended) | oclif | cac |
|--------|------------------------|-------|-----|
| Maturity | Very High (10+ years) | High | Medium |
| Bundle Size | Small (~50KB) | Large (~500KB+) | Tiny (~20KB) |
| TypeScript | Excellent | Good | Good |
| Plugin System | Manual | Built-in | Manual |
| Help Generation | Auto | Auto | Auto |
| Learning Curve | Low | Medium | Low |
### Bundler: tsup vs pkgroll
| Aspect | tsup (Recommended) | pkgroll |
|--------|-------------------|---------|
| Config | Zero-config | Minimal config |
| Speed | Fast (esbuild) | Fast (rollup) |
| Watch Mode | Built-in | Via separate tool |
| ESM/CJS | Dual output easy | Dual output easy |
| TypeScript | Native | Native |
| Ecosystem | Larger | Smaller, Sindre Sorhus |
### Color Library: chalk vs picocolors vs ansi-colors
| Aspect | chalk 5.x (Recommended) | picocolors | ansi-colors |
|--------|------------------------|------------|-------------|
| ESM | Native | Native | CommonJS |
| Size | ~30KB | ~5KB | ~10KB |
| Features | Rich (256 colors, styles) | Basic 16 colors | Moderate |
| Chaining | Excellent | Good | Good |
| Project Fit | Required (ESM constraint) | ESM but basic | ESM issues |
### Prompt Library: @clack/prompts vs Inquirer vs prompts
| Aspect | @clack/prompts (Recommended) | Inquirer | prompts |
|--------|------------------------------|----------|---------|
| Modern | Yes (2023+) | No (2015+) | Medium |
| TypeScript | First-class | Good | Good |
| Bundle Size | Small | Large | Small |
| Aesthetics | Excellent (modern) | Dated | Basic |
| Validation | Built-in | Manual | Manual |
### Schema Validation: Zod vs Ajv vs Joi
| Aspect | Zod (Recommended) | Ajv | Joi |
|--------|-------------------|-----|-----|
| TypeScript | Native inference | Requires JSON Schema | Good |
| Bundle Size | ~50KB | ~25KB + schemas | ~100KB |
| DX | Excellent | Good | Good |
| Error Messages | Excellent | Configurable | Good |
| ESM | Native | Native | CommonJS default |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **ts-node** | Slower than tsx, CommonJS default, complex ESM config | tsx (4.x) |
| **Jest** | CommonJS-first, slow, complex ESM support | Vitest (3.x) |
| **Inquirer.js** | Large bundle, dated API, maintenance mode | @clack/prompts |
| **npm/yarn workspaces** | Slower installs, less strict dependency resolution | pnpm workspaces |
| **chalk 4.x** | CommonJS, project requires ESM only | chalk 5.x |
| **oclif** | Overkill for simple CLI, large bundle | Commander |
| **Ink (React terminal)** | Heavy dependency (React), overkill for statusline | Chalk + manual layout |
| **Yargs** | Large bundle, complex API, slower | Commander |
| **Joi** | Large bundle, CommonJS default, less TypeScript-native | Zod |
| **tsup 7.x or lower** | Older esbuild, potential ESM issues | tsup 8.x |
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| chalk 5.x | Node.js >=18.0.0 | ESM-only, requires `"type": "module"` |
| tsx 4.x | TypeScript 5.x | Use `tsx watch` for dev, `tsup` for build |
| Commander 13.x | Node.js >=18.0.0 | Requires `"moduleResolution": "NodeNext"` |
| Zod 3.24.x | TypeScript 5.4+ | Best type inference with strict mode |
| pnpm 9.x | Node.js >=18.0.0 | Lockfile version 9, faster installs |
### Critical Compatibility Notes
## Stack Patterns by Use Case
### If CLI grows to 10+ commands with plugins:
- **Switch to:** oclif
- **Why:** Plugin architecture, command topics, sophisticated help
### If bundle size is critical (< 100KB total):
- **Switch to:** picocolors (instead of chalk)
- **Switch to:** cac (instead of commander)
- **Why:** Smaller footprint for distribution-sensitive tools
### If team prefers explicit JSON Schema:
- **Switch to:** Ajv (instead of Zod)
- **Why:** Industry standard JSON Schema validation, separate schema files
### If CI/CD requires CommonJS:
- **Switch to:** chalk 4.x + tsx with CJS target
- **Why:** Dual-mode output from tsup handles both
## Confidence Assessment
| Area | Confidence | Notes |
|------|------------|-------|
| Core Stack (Node/TS/pnpm) | HIGH | Industry standard 2025, well-documented |
| CLI Framework (Commander) | HIGH | 10+ years mature, excellent docs |
| Color/Styling (Chalk 5.x) | HIGH | ESM-native, widely adopted |
| Bundler (tsup) | HIGH | Zero-config, battle-tested |
| Validation (Zod) | HIGH | TypeScript community favorite |
| Prompts (@clack/prompts) | MEDIUM-HIGH | Relatively new (2023) but stable |
| Monorepo (Changesets) | HIGH | Industry standard for versioning |
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
