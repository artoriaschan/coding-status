# coding-status

<p align="center">
  <strong>Claude Code CLI 的云供应商用量状态栏工具</strong>
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
  <a href="README.md">English</a> | 简体中文
</p>

---

在 Claude Code 状态栏中直接显示云 AI 服务的实时用量。目前通过 CloudMonitor API 支持阿里云百炼。

## 特性

- **实时用量可见性** — 无需离开编辑器即可查看 CallCount 指标
- **多时间维度** — 查看最近 5 小时、7 天或 30 天的用量
- **可视化指示器** — 彩色输出，可选进度条显示
- **静默失败** — 即使 API 出错，状态栏也不会中断
- **可配置组件** — 自定义显示的信息

## 安装

```bash
npm install -g coding-status
```

需要 Node.js >= 20.12.0

## 快速开始

### 1. 初始化 coding-status

```bash
coding-status init
```

这会创建 `~/.coding-status/` 目录，并在可用时更新 Claude Code 设置。

### 2. 添加供应商

```bash
coding-status add
```

按提示配置阿里云百炼凭证：
- AccessKey ID
- AccessKey Secret
- 地域（如 cn-hangzhou）

### 3. 配置 Claude Code 状态栏

添加到你的 Claude Code 设置（通常位于 `~/.claude/settings.json`）：

```json
{
  "statusline": "$(coding-status statusline)"
}
```

或运行 `coding-status init`，它会自动提供此选项。

### 4. 查看效果

```bash
coding-status statusline
# 输出: Bailian | 5h: 1,234 ▓▓▓░░░░░░░ 12%
```

## 配置

### 供应商配置 (`~/.coding-status/config.json`)

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

**安全提示：** 此文件以 `chmod 600` 创建，限制访问权限。

### 组件设置 (`~/.coding-status/settings.json`)

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

### 组件类型

| 组件 | 描述 | 选项 |
|------|------|------|
| `provider` | 显示当前供应商名称 | — |
| `usage` | 显示某维度的用量 | `dimension`: `5h`/`week`/`month`, `showBar`: 布尔值 |
| `separator` | 显示 `\|` 分隔符 | `char`: 自定义字符 |
| `text` | 静态文本 | `content`: 字符串 |

## 命令

| 命令 | 描述 |
|------|------|
| `coding-status init` | 初始化 coding-status 配置 |
| `coding-status add` | 交互式添加新供应商 |
| `coding-status list` | 列出所有已配置供应商 |
| `coding-status use <name>` | 切换到其他供应商 |
| `coding-status rm <name>` | 删除供应商 |
| `coding-status doctor` | 检查配置健康状况 |
| `coding-status statusline` | 输出状态栏字符串 |

## 故障排除

### 状态栏只显示供应商名称

API 调用失败。运行 `coding-status doctor` 检查：
- 凭证是否有效
- 网络连接是否正常
- 熔断器状态（3 次失败后触发）

### "No provider configured"

先运行 `coding-status add` 添加供应商。

### Claude Code 不显示状态栏

1. 验证 settings.json 路径：`~/.claude/settings.json`
2. 检查 `coding-status` 是否在 PATH 中：`which coding-status`
3. 手动测试：`coding-status statusline`

### 缓存问题

清除缓存：
```bash
rm -rf ~/.coding-status/cache/
```

## 本地开发

### 环境要求

- Node.js >= 20.12.0
- pnpm >= 9.x

### 初始化

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test:run
```

### 本地开发

```bash
# 监听模式 - 文件变更时自动构建
pnpm dev

# 使用 tsx 本地运行 CLI
npx tsx packages/core/src/index.ts <命令>

# 示例
npx tsx packages/core/src/index.ts statusline
```

### 调试日志

```bash
# 启用调试输出
DEBUG=1 npx tsx packages/core/src/index.ts statusline

# 查看配置
cat ~/.coding-status/config.json
cat ~/.coding-status/settings.json
```

## 发布流程

本项目使用 [Changesets](https://github.com/changesets/changesets) 进行版本管理。

### 创建 Changeset

```bash
# 为改动添加 changeset
pnpm changeset

# 选择修改的包
# 输入改动摘要
```

### 预发布版本 (Beta/RC)

```bash
# 进入预发布模式
pnpm changeset pre enter beta

# 创建 changeset 并更新版本
pnpm changeset
pnpm changeset version

# 构建并使用 beta 标签发布
pnpm build
pnpm changeset publish

# 退出预发布模式
pnpm changeset pre exit
```

### 正式版本发布

**自动发布（推荐）：**
1. 创建包含 changeset 的 PR
2. 合并到 `main` 分支
3. GitHub Actions 创建 "Version Packages" PR
4. 合并 "Version Packages" PR → 自动发布到 npm

**手动发布（仅维护者）：**
```bash
pnpm build
pnpm version    # 更新版本和变更日志
pnpm release    # 发布到 npm
```

### 发布配置

- **固定模式**：所有包使用相同版本号
- **基础分支**：`main`
- **访问权限**：公开的 npm 包

## 快速参考

| 任务 | 命令 |
|------|------|
| 安装依赖 | `pnpm install` |
| 构建所有包 | `pnpm build` |
| 运行测试 | `pnpm test:run` |
| 运行测试（带覆盖率） | `pnpm test:coverage` |
| 代码检查 | `pnpm lint` |
| 格式化代码 | `pnpm format` |
| 创建 changeset | `pnpm changeset` |
| 检查 changeset 状态 | `pnpm changeset status` |
| 本地运行 CLI | `npx tsx packages/core/src/index.ts <命令>` |

## 环境要求

- Node.js >= 20.12.0
- Claude Code CLI（用于状态栏集成）
- 阿里云账号并开通百炼服务（用于用量数据）

## 许可证

MIT
