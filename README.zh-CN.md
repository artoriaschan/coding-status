# cdps

Claude Code CLI 的云供应商用量状态栏工具

[English](README.md) | 简体中文

[![npm version](https://badge.fury.io/js/cdps.svg)](https://www.npmjs.com/package/cdps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

在 Claude Code 状态栏中直接显示云 AI 服务的实时用量。目前通过 CloudMonitor API 支持阿里云百炼。

## 特性

- **实时用量可见性** — 无需离开编辑器即可查看 CallCount 指标
- **多时间维度** — 查看最近 5 小时、7 天或 30 天的用量
- **可视化指示器** — 彩色输出，可选进度条显示
- **静默失败** — 即使 API 出错，状态栏也不会中断
- **可配置组件** — 自定义显示的信息

## 安装

```bash
npm install -g cdps
```

需要 Node.js >= 18.0.0

## 快速开始

### 1. 初始化 cdps

```bash
cdps init
```

这会创建 `~/.cdps/` 目录，并在可用时更新 Claude Code 设置。

### 2. 添加供应商

```bash
cdps add
```

按提示配置阿里云百炼凭证：
- AccessKey ID
- AccessKey Secret
- 地域（如 cn-hangzhou）

### 3. 配置 Claude Code 状态栏

添加到你的 Claude Code 设置（通常位于 `~/.claude/settings.json`）：

```json
{
  "statusline": "$(cdps statusline)"
}
```

或运行 `cdps init`，它会自动提供此选项。

### 4. 查看效果

```bash
cdps statusline
# 输出: Bailian | 5h: 1,234 ▓▓▓░░░░░░░ 12%
```

## 配置

### 供应商配置 (`~/.cdps/config.json`)

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

### 组件设置 (`~/.cdps/settings.json`)

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
| `usage` | 显示某维度的用量 | `dimension`: 5h/week/month, `showBar`: 布尔值 |
| `separator` | 显示 `\|` 分隔符 | `char`: 自定义字符 |
| `text` | 静态文本 | `content`: 字符串 |

## 命令

| 命令 | 描述 |
|------|------|
| `cdps init` | 初始化 cdps 配置 |
| `cdps add` | 交互式添加新供应商 |
| `cdps list` | 列出所有已配置供应商 |
| `cdps use <name>` | 切换到其他供应商 |
| `cdps rm <name>` | 删除供应商 |
| `cdps doctor` | 检查配置健康状况 |
| `cdps statusline` | 输出状态栏字符串 |

## 故障排除

### 状态栏只显示供应商名称

API 调用失败。运行 `cdps doctor` 检查：
- 凭证是否有效
- 网络连接是否正常
- 熔断器状态（3 次失败后触发）

### "No provider configured"

先运行 `cdps add` 添加供应商。

### Claude Code 不显示状态栏

1. 验证 settings.json 路径：`~/.claude/settings.json`
2. 检查 `cdps` 是否在 PATH 中：`which cdps`
3. 手动测试：`cdps statusline`

### 缓存问题

清除缓存：
```bash
rm -rf ~/.cdps/cache/
```

## 环境要求

- Node.js >= 18.0.0
- Claude Code CLI（用于状态栏集成）
- 阿里云账号并开通百炼服务（用于用量数据）

## 许可证

MIT
