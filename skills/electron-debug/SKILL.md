---
name: electron-debug
description: Diagnose a running local Electron application after code changes by attaching to Node Inspector and Chromium DevTools Protocol endpoints, then collecting status, targets, and logs for Agent-led verification. Use when runtime evidence is needed from an Electron project; this skill does not start or control the application.
license: MIT
---

# Electron Debug Skill

## 目标和边界

在 Agent 完成 Electron 代码修改后，使用 `electron-agent-debug` MCP 收集运行时事实，结合项目已有测试或回归操作判断修改是否生效。

本 Skill 只使用当前 MCP Server 已提供的四个工具：

- `electron_attach`
- `electron_status`
- `electron_targets`
- `electron_logs`

MCP Server 只连接 Agent 已经准备好的 Electron 应用，不启动、停止、重启或操作应用，也不执行页面代码。业务操作、DOM 检查、截图、断点和单步调试由 Agent 使用项目已有测试或其他工具完成。

## 宿主接入和兼容性

本 Skill 适用于能够启动本地 MCP stdio Server 并调用 MCP tools 的 Agent 宿主。模型类型不影响协议兼容性；宿主需要具备以下能力：

- 启动本地命令并保持 stdin/stdout 通道。
- 发送 MCP `initialize`、`tools/list` 和 `tools/call` 请求，或通过宿主界面完成等价验证。
- 读取结构化工具结果。
- 让 Agent 读取本 Skill，或把本 Skill 内容纳入项目级 instructions。

### Skill 的全局和项目级使用

本 Skill 可以全局使用，也可以只在单个项目中使用：

- 全局使用：将本文件复制或链接到 Agent 宿主的全局 Skill 目录，并按宿主要求启用或刷新。适合多个 Electron 项目共享同一套诊断流程。
- 项目级使用：将本文件放入项目采用的 Skill 目录，或由项目级 `AGENTS.md`、instructions 或等效规则引用。适合项目固定 Skill 版本或只对一个项目启用。

全局目录、项目 Skill 目录、命名方式和刷新入口由 Agent 宿主决定，本 Skill 不写死路径。项目级规则与全局规则同时存在时，优先遵守项目级规则，同时保留本 Skill 的 MCP 前提、安全边界和证据要求。

Skill 的安装或加载不会自动注册 MCP Server。Agent 仍必须单独配置 MCP，并通过 `initialize`、`tools/list` 或宿主等价界面确认四个核心工具可见。

### Agent 必须自行完成 MCP 配置

在开始 Electron 诊断前，Agent 必须自行完成并验证 MCP 接入：

1. 识别当前使用的 Agent 宿主及其 MCP 配置入口。
2. 检查 `electron-agent-debug` 是否已经配置并可用；如果没有，从 [electron-agent-debug 源仓库](https://github.com/longhun12346/electron-agent-debug) 获取 MCP Server 源码，在 MCP 源仓库中运行 `npm ci` 和 `npm run build`。MCP 源仓库和待诊断的 Electron 项目是两个不同的工作目录。
3. 只有在未配置时，才在宿主的 MCP 配置中添加 `electron-agent-debug` Server。
4. 启动或刷新 MCP 配置。
5. 通过宿主确认 Server 初始化成功，并确认能看到以下四个工具：
   - `electron_attach`
   - `electron_status`
   - `electron_targets`
   - `electron_logs`
6. 只有 MCP 接入成功后，才继续准备 Electron 应用和调试 endpoint。

Agent 不应假设 MCP 已经配置，也不应因为 Skill 文件已经从仓库加载就认为 MCP Server 会自动注册。Agent 宿主的配置文件、项目路径和刷新方式由宿主决定；Agent 应根据当前环境实际查找和修改，不应写入不存在的固定配置路径。

当前项目没有为某一个 Agent 实现专用适配器。任何支持本地 stdio MCP 的宿主在协议层都可以使用同一个 Server 启动方式；具体配置文件名、字段名和 UI 入口由宿主决定。下面的 JSON 只是配置概念示意，不能直接假设适用于所有宿主，也不代表每个宿主都已经完成专门的端到端验证。

本地构建版本的配置概念如下，`<absolute-mcp-repository-path>` 必须替换为 MCP 源仓库的实际绝对路径，不能替换为待诊断的 Electron 项目路径，并映射到宿主要求的字段：

```json
{
  "mcpServers": {
    "electron-agent-debug": {
      "command": "node",
      "args": [
        "<absolute-mcp-repository-path>/dist/index.js"
      ]
    }
  }
}
```

Skill 从仓库获取后，Agent 应优先读取本文件。宿主不会自动发现 Skill 时，Agent 应由项目级 instructions、`AGENTS.md` 或等效规则显式加载本文件。MCP Server 能启动不代表 Skill 已加载；未加载 Skill 时，Agent 仍可能调用工具，但不会自动遵守本项目的诊断顺序和结论规则。

如果 Agent 无法找到宿主的 MCP 配置入口、无法启动 Server、无法完成初始化或看不到四个核心工具，应先报告 `BLOCKED`，不要继续把 Electron 应用问题归因于用户代码。

## 调用 MCP 前的前提

Agent 需要先确认以下信息：

- Electron 项目工作目录。
- 项目已有的启动、停止或重启命令，或者已经运行的应用。
- 本次修改要证明的预期行为。
- 可执行的测试、检查命令或回归操作。
- 本次诊断需要的 endpoint：
  - 主进程问题需要 Node Inspector discovery endpoint。
  - renderer 问题需要 CDP discovery endpoint。
  - preload 或 IPC 问题需要两个 endpoint。
- 多窗口场景下的 target 选择条件。

端口必须由 Agent 或项目启动脚本动态决定。不要假设固定端口，也不要扫描端口。MCP 只接受回环 HTTP(S) discovery endpoint。

如果缺少启动方式、实际 endpoint 或可观察的预期行为，先补齐前提。无法补齐时输出 `BLOCKED`，不要把缺少前提误判为代码失败。

## 第一步：判断诊断范围

根据修改文件和用户报告选择通道：

| 问题或修改 | 主要通道 | 证据要求 |
| --- | --- | --- |
| 应用启动、BrowserWindow、窗口生命周期、主进程异常 | 主进程 | 主进程状态、主进程日志或异常、项目启动结果 |
| 页面白屏、renderer 异常、页面加载和事件失效 | renderer | target、renderer 状态、renderer 日志或异常、项目回归结果 |
| preload、contextBridge、IPC 请求或返回值 | 双通道 | 主进程和 renderer 各至少一项证据，加上项目回归结果 |
| 纯类型、构建或静态检查问题 | 项目检查优先 | 运行项目已有命令；只有需要运行时事实时才 attach |
| 视觉、DOM 或复杂交互问题 | renderer 加项目工具 | MCP 提供连接和日志；截图、DOM 和交互由项目已有测试或其他工具完成 |

不要因为使用了 Electron 就默认连接两个通道。根据修改范围选择最小必要范围；preload 和 IPC 是必须同时检查的例外。

## 第二步：准备应用和 endpoint

在调用 MCP 前，Electron 应用必须已经由 Agent 使用项目已有命令准备并运行。Skill 可以指导 Agent 使用这些已有命令启动或重启应用，但 MCP Server 不执行应用生命周期控制。endpoint 只能通过已有命令支持的启动参数或环境变量提供；不要为了接入 MCP 修改项目启动脚本。命令形式只作示意：

```text
electron --inspect=<agent-chosen-main-port> --remote-debugging-port=<agent-chosen-renderer-port> .
```

实际入口可能由 Vite、Webpack、electron-vite 或自定义脚本提供。不要猜测入口文件；如果已有命令不能暴露所需 endpoint，报告 `BLOCKED`，不要改写项目脚本来适配 MCP。

启动后确认：

- 应用进程仍在运行。
- 需要的 discovery endpoint 能返回 target 列表。
- endpoint 是本次运行实际使用的地址。
- 多窗口项目已经确定要检查的窗口。

如果应用没有启动、endpoint 不可用或无法确定 target，先修复或补齐启动前提；不能仅凭 `electron_attach` 失败判断代码失败。

## 第三步：收集基线证据

按以下顺序调用核心工具：

1. `electron_attach`
   - 传入本次实际使用的 `mainUrl` 和/或 `rendererUrl`。
   - 如已有环境变量配置，可以省略对应输入。
   - 记录两个通道分别是否在线以及返回的错误。
2. `electron_status`
   - 记录 `online`、`status`、endpoint 来源、selected target 和 eventCount。
3. `electron_targets`
   - 需要 renderer 时调用。
   - 单个 page target 可以自动选择。
   - 多个 page target 必须使用 `targetId`、完整 URL 或标题选择。
4. `electron_logs`
   - 读取基线日志和异常。
   - 记住日志只包含 Session 建立后观察到的事件，不代表 attach 前的历史。

主进程不可用时，仍然检查 renderer 是否可用；renderer 不可用时，仍然保留主进程结果。部分 attach 的结果不能被另一通道的失败覆盖。

## 第四步：执行项目回归

Agent 使用项目已有命令或回归步骤验证预期行为，例如：

- `npm test`
- `npm run typecheck`
- `pnpm test:e2e`
- 项目文档中规定的启动、点击、输入或 IPC 流程

MCP Server 不替 Agent 执行业务操作，也不把“连接成功”当成业务验证成功。

修改后的进程处理规则：

- 主进程、preload、BrowserWindow、窗口生命周期或 IPC handler 修改后，Agent 使用项目已有重启命令；没有可用命令时报告 `BLOCKED`。
- renderer 修改后，Agent 使用项目已有方式 reload 当前页面；没有可用 reload 操作时报告 `BLOCKED`。
- Electron 重启或窗口重建后，重新调用 `electron_attach`。
- 如果旧 target 已失效，先调用 `electron_targets` 并传入 `clearSelection=true`，再按当前条件重新选择。

## 第五步：收集回归证据

回归操作完成后再次调用：

1. `electron_status`
2. 需要 renderer 时调用 `electron_targets`
3. `electron_logs`

比较修改前后的状态、target、日志、异常和项目测试结果。只读取与本次预期行为有关的证据，避免把历史日志或无关 warning 当成结论。

最低证据要求：

- 主进程修改：主进程在线或有明确启动失败证据，并有项目检查或回归结果。
- renderer 修改：存在正确的 page target，renderer 在线，并有项目回归结果或相关运行时事件。
- preload/IPC 修改：主进程和 renderer 各有一项证据，并有一次能覆盖调用链的项目回归。
- 视觉或 DOM 目标：必须由项目已有测试或其他 Agent 工具提供业务证据；MCP 日志只能作为辅助证据。

## 结论规则

结论由 Agent 根据用户目标、项目回归和 MCP 事实自行生成：

- `PASS`
  - 预期行为已经被项目测试、回归操作或明确的运行时观察证实。
  - 相关通道、target 和连接状态与预期一致。
  - 不能只因为 attach 成功、没有 console error 或存在日志就输出 `PASS`。
- `FAIL`
  - 预期行为可执行，但结果不符合预期，或观察到与本次修改相关的异常、错误日志或错误状态。
  - 根因可以尚未完全确定，但必须说明当前证据和不确定性。
- `BLOCKED`
  - 缺少工作目录、启动命令、endpoint、target、预期行为或必要的回归操作。
  - 应用尚未运行、调试端点不可用，且无法确认这是代码行为还是启动前提问题。
  - 不要把无法观察等同于代码已经失败。

## 输出模板

完成一次诊断后，Agent 输出：

```text
结论: PASS | FAIL | BLOCKED

预期行为:
- 本次修改要证明什么

诊断范围:
- 主进程 / renderer / preload-IPC

本次修改:
- 文件或行为

执行的回归:
- 命令或操作

关键证据:
- electron_status:
- electron_targets:
- electron_logs:
- 项目测试或回归结果:

问题归属:
- 主进程 / preload-IPC / renderer / 启动前提 / 未确定

根因判断:
- 已确认 / 当前最可能原因 / 尚未确定

连接和恢复:
- attach、重启、reload、重新选择 target 的操作

剩余限制:
- 仍未验证的部分，或需要其他工具完成的部分
```

`electron_attach` 的 `ok` 只表示 MCP 请求得到了结构化结果，不表示用户代码正确。最终结论必须能够由用户根据预期行为、回归结果和关键证据复核。
