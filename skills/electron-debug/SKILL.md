---
name: electron-debug
description: Use when validating Electron main-process, BrowserWindow, renderer, preload, or IPC changes, or investigating a blank window or runtime error in a running local Electron app. Collect Inspector/CDP status, targets, logs, and exceptions using the bundled attach-only MCP runtime for Agent-led verification.
license: MIT
---

# Electron Agent Debug

为编码 Agent 提供轻量、attach-only 的 Electron 诊断能力。MCP 返回运行时事实；Agent 准备应用、执行业务回归并自行判断结果。

## 触发条件

| 场景 | 行为与通道 |
| --- | --- |
| 主进程、BrowserWindow 或窗口生命周期修改后需要运行时验证 | 检查主进程 Inspector、日志及项目回归结果 |
| renderer 白屏、页面加载或前端异常 | 检查 renderer CDP、正确的 page target、日志及项目回归结果 |
| preload、contextBridge 或 IPC 修改 | 同时检查主进程和 renderer，双方各需证据，并执行覆盖调用链的项目回归 |
| 用户明确要求诊断已经运行的本地 Electron 应用 | 根据问题选择最小必要通道 |
| 纯类型或构建问题，无运行时观察需求 | 优先使用项目已有检查，不必 attach |
| 需要截图、DOM、evaluate、断点或交互操作 | 使用项目已有测试或其他工具；本 MCP 不提供这些能力 |

## 核心能力

| 工具 | 返回内容 |
| --- | --- |
| `electron_attach` | 两个通道各自的连接结果、target 和结构化错误 |
| `electron_status` | 当前在线状态、endpoint 来源、selected target 和事件数量 |
| `electron_targets` | renderer page targets 与明确选择结果 |
| `electron_logs` | 有界缓存中的日志、异常、连接和协议事件 |

MCP 不启动、停止、重启或操作 Electron，不执行页面代码，不修改用户项目。业务测试、视觉验证和最终验收由 Agent 使用项目已有工具完成。

## 使用方法

### 1. 准备随包 MCP

本 Skill 包含 `runtime/launch.cjs`、MCP JavaScript bundle、版本清单及依赖许可证。Agent 使用当前已安装 Skill 的实际绝对目录，运行环境需要 Node.js 22 或更高版本。

先确认安装渠道及版本符合当前任务要求，再执行本地完整性检查：

```text
node <absolute-skill-directory>/runtime/launch.cjs --verify
```

校验通过后，以同一个入口配置本地 MCP stdio Server：

```json
{
  "mcpServers": {
    "electron-agent-debug": {
      "command": "node",
      "args": ["<absolute-skill-directory>/runtime/launch.cjs"]
    }
  }
}
```

这只是配置概念示例。Agent 根据实际宿主查找配置入口，避免重复注册，按宿主规则刷新，并验证四个工具可见。Skill 安装不会自动注册 MCP。全局和项目级安装均使用对应 Skill 目录中的运行文件，不写死用户目录或配置路径。

运行文件缺失或校验失败时报告 `BLOCKED`，从已获准的安装渠道重新安装完整版本。正常使用不下载额外源码、不安装依赖、不在本机构建 MCP，也不以远程执行作为备用路径。

宿主配置、版本更新和校验边界见 [MCP 接入说明](references/mcp-setup.md)。当前包版本见 [VERSION.md](VERSION.md)。

### 2. 由 Agent 提供诊断前提

- Electron 项目目录、本次修改要证明的预期行为。
- 项目已有启动、停止或重启命令，以及测试或业务回归步骤。
- 已运行的 Electron 应用及本次实际使用的 Inspector 和/或 CDP discovery endpoint。
- 多窗口时的 target 选择条件。

Agent 可以通过项目已有启动命令支持的参数暴露所需 endpoint。端口由 Agent 或项目动态决定，不扫描端口、不猜测入口，也不为了接入 MCP 改写项目启动脚本。只允许本地回环 HTTP(S) discovery endpoint，其返回的 WebSocket 地址也必须是回环地址。

缺少必要前提且无法补齐时报告 `BLOCKED`，不要归因为用户代码失败。

## 工作流程

```text
┌──────────────────────────────────────────┐
│ 确认任务、包来源与诊断前提               │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ 校验随包 MCP → 配置宿主 → 确认四工具可见 │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ attach → status → 按需 targets → logs    │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ Agent 执行项目已有测试或业务回归         │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ Agent 按需 reload / 重启 → 重新收集证据  │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ Agent 根据预期行为与证据判断结果         │
│ PASS / FAIL / BLOCKED                    │
└──────────────────────────────────────────┘

任何阶段缺少必要前提或完整性检查失败
    └─► BLOCKED：说明缺少什么
```

1. **收集基线**：向 `electron_attach` 传入本次实际的 `mainUrl` 和/或 `rendererUrl`；如使用环境变量，可以省略相应输入。分别记录两个通道的状态与错误。部分成功时保留可用通道证据。
2. **确认 target**：需要 renderer 时调用 `electron_targets`。一个可连接 page target 可自动选择；多个或同名窗口使用 `targetId`、完整 URL 或标题明确选择，歧义时不要静默选第一个。
3. **执行回归**：Agent 运行项目已有检查或业务操作。主进程、preload、BrowserWindow 或 IPC handler 修改后使用项目已有方式重启；renderer 修改后使用项目已有方式 reload。缺少必要操作时报告 `BLOCKED`。
4. **刷新证据**：Electron 重启或窗口重建后重新 attach。旧 target 失效时通过 `electron_targets` 的 `clearSelection=true` 清除旧条件，再选择当前窗口。读取 status、按需 targets 和 logs，比较回归前后结果。

日志只代表当前 MCP 观察到的事件，不保证包含 attach 前的历史。需要区分不同轮次时使用 `since` 或按范围清空缓存，并保留已经用于判断的证据。清空历史记录不等于错误已修复。

## 错误处理

| 情况 | Agent 的处理 |
| --- | --- |
| Node 不满足要求、运行文件缺失或完整性校验失败 | `BLOCKED`；说明缺少项，重新安装获准版本后再验证 |
| 找不到宿主配置入口、初始化失败或工具不可见 | 检查宿主配置和 stderr；不要归因于 Electron 业务代码 |
| 应用未运行、endpoint 不可用 | 核对本次启动结果和实际 endpoint；无法确定原因时报告 `BLOCKED` |
| 某一通道连接失败 | 保留另一通道的状态和证据，按本次修改范围判断是否足够 |
| target 歧义、断开或窗口已重建 | 重新发现并明确选择；不要沿用失效 target |
| 需要的业务、DOM 或视觉证据无法取得 | 使用项目其他工具补齐；无法补齐时说明验证限制 |

## 结论与输出

结论由 Agent 结合用户目标、项目回归和 MCP 事实自行生成：

- `PASS`：预期行为被实际回归或明确运行时观察证实，相关通道和 target 符合预期。
- `FAIL`：预期行为可执行但结果不符合要求，或有与本次修改相关的错误证据。区分已确认根因与推测。
- `BLOCKED`：缺少前提、可观察结果或必要回归，尚不能完成判断。

不能只凭 attach 成功、没有 console error 或存在日志输出 `PASS`。`electron_attach` 的 `ok` 只表示返回了结构化诊断结果。

报告包含：预期行为、诊断范围、本次修改、执行的回归、各通道关键证据、target、问题归属、根因确定程度、连接恢复操作和剩余限制。preload/IPC 需要主进程和 renderer 各至少一项证据，并有覆盖调用链的回归结果。
