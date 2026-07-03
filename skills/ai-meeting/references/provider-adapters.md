# Provider Adapter 设计

第一版主路径实现 Codex 和 Claude Code。Qoder、OpenCode、Cursor、Gemini 和 Hermes 已作为实验 provider 注册，但保持 `registryDefault=false` 和 `smokeVerified=false`，未通过 smoke gate 前不作为默认候选，也不进入正式 round/synthesis。Provider 已拆到 `ai-meeting/scripts/providers/`，由 `registry.mjs` 注册。后续 provider 只新增 adapter，不修改会议流程。

## 统一接口

```ts
interface AgentProvider {
  name: string;
  sessionKind?: "threadId" | "sessionId" | "chatId" | "none" | "unknown";
  registryDefault?: boolean;
  check(cwd?: string): ProviderStatus | Promise<ProviderStatus>;
  startSession(input: ProviderInput): Promise<ProviderResult>;
  continueSession(input: ProviderInput & { sessionId: string }): Promise<ProviderResult>;
}

interface ProviderInput {
  cwd: string;
  prompt: string;
  model?: string;
  mode?: "read-only" | "workspace-write";
  outputFile?: string;
  timeoutMs?: number;
}

interface ProviderResult {
  provider: string;
  sessionId: string | null;
  rawOutput: string;
  status: "completed" | "failed" | "unknown";
  resumed?: boolean;
  resumeFailed?: boolean;
  stderr?: string;
}
```

Provider 的 `status` 表示 CLI 调用结果。orchestrator 还会二次校验 `rawOutput`：只有非空输出才会写入正式 round，并记为会议账本里的 `completed`。

`sessionId` 是统一字段。各 provider 自己映射：

- Codex：`sessionId = thread_id`
- Claude Code：`sessionId = session_id`
- Qoder：orchestrator 生成 UUID；只接受 provider-control 顶层返回的同一 `session_id` / `sessionId`
- OpenCode：`sessionId = sessionID`
- Cursor：`sessionId = chatId`，兼容 `chat_id` / `session_id` / `sessionId`
- Gemini：orchestrator 生成 UUID，兼容 provider-control event 顶层合法 UUID
- Hermes：当前 stateless；不从文本输出中提取 session id

Session ID 只能从 provider-control event 提取，不得从 assistant text、final result 文本或任意深层 JSON 里盲目搜索。解析器必须忽略模型正文中伪造的 `session_id` / `thread_id`。

## Codex

新建：

```bash
codex exec --json --sandbox read-only -C <isolated-empty-dir> -o <tmp-output-file> -
```

续会：

```bash
codex exec resume --json -c 'sandbox_mode="read-only"' -o <tmp-output-file> <thread_id> -
```

从 JSONL stdout 的 provider-control event 顶层或明确 thread 对象中提取 `thread_id`、`threadId`、`thread.id` 等兼容字段。

不要使用 `codex exec resume --last` 作为主路径。
非 Git 工作区追加 `--skip-git-repo-check`。`tmp-output-file` 用于获取最后答案，避免把 JSONL 事件当最终报告。
`isolated-empty-dir` 是 orchestrator 为每个 Agent 创建并跨轮复用的隔离 workspace，例如 `workspaces/builder.codex/`。它不是项目根、会议根或用户 home。项目材料必须由 orchestrator 作为 data block 注入 prompt。

## Claude Code

新建：

```bash
cat <prompt-file> | claude -p --safe-mode --output-format stream-json --verbose --include-partial-messages --permission-mode dontAsk --tools ""
```

续会：

```bash
cat <prompt-file> | claude -p --safe-mode --output-format stream-json --verbose --include-partial-messages --permission-mode dontAsk --tools "" --resume <session_id>
```

从 stream-json stdout 的 provider-control event 顶层提取 `session_id` / `sessionId`。不要从 assistant/result 文本中提取。

不要使用 `claude --continue` 作为主路径。

v1 默认不授予工具。`dontAsk` 只在工具列表为空时使用，避免在非可信 prompt 下自动批准文件、网络或 shell 操作。
Claude 同样在 Agent 专属固定隔离 workspace 中运行，并使用 `--safe-mode` 避免读取项目级自定义上下文。Claude Code 当前版本的 `--resume <session_id>` 对 cwd/project scope 敏感；orchestrator 必须为同一 Claude Agent 跨轮复用同一 cwd，否则会出现 `No conversation found with session ID`。

## Qoder（实验）

Qoder 当前已注册，但 `registryDefault=false` 且 `smokeVerified=false`。它只能在用户显式选择 `--agents role:qoder`、`doctor` 显示可用、并且当前 CLI 版本 smoke gate 通过后参与正式会议；未登录或 smoke 缺失时必须 fail fast，不能写成空成功。

新建：

```bash
printf '%s' "$PROMPT" | qodercli -p --output-format stream-json --cwd <isolated-empty-dir> --tools "" --mcp-config '{"mcpServers":{}}' --strict-mcp-config --session-id <uuid>
```

续会：

```bash
printf '%s' "$PROMPT" | qodercli -p --output-format stream-json --cwd <isolated-empty-dir> --tools "" --mcp-config '{"mcpServers":{}}' --strict-mcp-config --resume <session_id>
```

解析规则：

- 只从 stream-json 顶层 event 读取 `session_id` / `sessionId`，且必须匹配本次传入的 orchestrator UUID 或 resume id。
- `result.result` 是优先最终文本；没有 result 时拼接 assistant text block。
- assistant/result 文本里伪造的 `session_id` 不得进入 state。
- `is_error: true` 或顶层 `error` 必须记为 provider `failed`，即使进程退出码为 0。

安全规则：

- prompt 通过 stdin 传入，不把完整 prompt 放入 argv。
- 必须传空工具列表：`--tools ""`。
- 必须传空 MCP 配置和严格 MCP 配置：`--mcp-config '{"mcpServers":{}}' --strict-mcp-config`。
- 不传 `--dangerously-skip-permissions` 或任何自动批准权限的参数。
- `qodercli status` 包含 `Account: Not logged in` 时，`doctor` 标记 `auth: "missing"` 且 provider unavailable。
- 当前 resume、工具禁用和配置隔离仍标记为实验能力，必须有匹配当前 CLI 版本的 smoke 记录后才允许进入正式 round/synthesis 路径。

## OpenCode（实验）

OpenCode 当前已注册，但 `registryDefault=false` 且 `smokeVerified=false`。它只能在用户显式选择 `--agents role:opencode`、`doctor` 显示可用、并且当前 CLI 版本 smoke gate 通过后参与正式会议；缺少 `ai-meeting-readonly` agent、权限过宽、auth 缺失或 smoke 缺失时必须 fail fast。

前置只读 agent：

```txt
ai-meeting-readonly
```

`doctor` 使用 `opencode debug agent ai-meeting-readonly` 检查配置。允许的工具权限只能是只读类，例如 `read`、`glob`、`grep`、`list`；如果出现 wildcard allow、bash/write/edit/web 权限、或 agent 不存在导致 OpenCode fallback 到默认 agent，则该 provider 不可用。

新建：

```bash
printf '%s' "$PROMPT" | opencode run --format json --agent ai-meeting-readonly --title "ai-meeting:<meetingId>:<agentKey>"
```

续会：

```bash
printf '%s' "$PROMPT" | opencode run --format json --agent ai-meeting-readonly --session <sessionID>
```

解析规则：

- 只从 JSON event 顶层读取 `sessionID`，并映射到统一 `sessionId`。
- 只拼接 `type: "text"` 且 `part.type: "text"` 的 `part.text` 作为 `rawOutput`。
- assistant/result 文本里伪造的 `sessionID` 不得进入 state。
- 非 JSON stdout、空模型输出、`step_finish.reason: "error"`、顶层 `error`、auth/config 错误、`agent not found` 或 `falling back to default agent` 都必须记为 provider `failed`。

安全规则：

- prompt 通过 stdin 传入，不把完整 prompt 放入 argv。
- OpenCode `run --help` 当前没有 `--cwd`/`--workspace` 参数，所以 cwd 隔离依赖 `spawn(..., { cwd: isolatedEmptyDir })`，测试必须覆盖。
- 不使用用户默认 agent，不自动创建或修改用户全局 OpenCode 配置。
- 当前 read-only agent 权限和路径 scope 仍需真实 smoke 验证，缺少匹配当前 CLI 版本的 smoke 记录前不能进入正式 round/synthesis 路径。

## Cursor（实验）

Cursor 当前已注册，但 `registryDefault=false` 且 `smokeVerified=false`。它只能在用户显式选择 `--agents role:cursor`、`doctor` 显示可用、并且当前 CLI 版本 smoke gate 通过后参与正式会议；未登录、工具限制不可验证、sandbox/workspace 隔离不可验证或 smoke 缺失时必须 fail fast。

新建：

```bash
printf '%s' "$PROMPT" | agent --print --output-format stream-json --mode ask --sandbox enabled --workspace <isolated-empty-dir>
```

续会：

```bash
printf '%s' "$PROMPT" | agent --print --output-format stream-json --mode ask --sandbox enabled --workspace <isolated-empty-dir> --resume <chatId>
```

解析规则：

- 只从 stream-json 顶层 event 读取 `chatId` / `chat_id` / `session_id` / `sessionId`，并映射到统一 `sessionId`。
- `result.result` 是优先最终文本；没有 result 时兼容 assistant text block 和顶层 text event。
- assistant/result 文本里伪造的 session id 不得进入 state。
- 非 JSON stdout、空模型输出、顶层 `error`、`is_error: true`、auth 错误都必须记为 provider `failed`。

安全规则：

- prompt 通过 stdin 传入，不把完整 prompt 放入 argv。
- 必须传 `--mode ask` 和 `--sandbox enabled`。
- 必须传 `--workspace <isolated-empty-dir>`，且 `spawn(..., { cwd })` 也指向 isolated empty dir。
- 不传 `--force` / `--yolo` / `--trust` / `--approve-mcps` / `--add-dir` / `--plugin-dir`。
- Cursor help 当前明确 `--print` 可访问所有工具，所以 ask-mode、sandbox 和 workspace 的真实限制必须由 smoke 证明；缺少匹配当前 CLI 版本的 smoke 记录前不能进入正式 round/synthesis 路径。

## Gemini（实验）

Gemini 当前已注册，但 `registryDefault=false` 且 `smokeVerified=false`。它只能在用户显式选择 `--agents role:gemini`、`doctor` 显示可用、并且当前 CLI 版本 smoke gate 通过后参与正式会议；auth/tier 错误、sandbox/policy 不可验证、UUID resume 不可验证或 smoke 缺失时必须 fail fast。

新建：

```bash
printf '%s' "$PROMPT" | gemini --prompt "" --output-format stream-json --approval-mode plan --sandbox --session-id <uuid>
```

续会：

```bash
printf '%s' "$PROMPT" | gemini --prompt "" --output-format stream-json --approval-mode plan --sandbox --resume <uuid>
```

解析规则：

- 默认使用 orchestrator 生成的 UUID 作为 `sessionId`。
- 只从 provider-control event 顶层读取合法 UUID 形态的 `session_id` / `sessionId` / `sessionID`，并覆盖 orchestrator UUID。
- `result.result` 是优先最终文本；没有 result 时兼容 assistant text block 和顶层 text event。
- assistant/result 文本里伪造的 session id 不得进入 state。
- 非 JSON stdout、空模型输出、顶层 `error`、`is_error: true`、auth/tier 错误都必须记为 provider `failed`。

安全规则：

- prompt 通过 stdin 传入，不把完整 prompt 放入 argv；`--prompt ""` 只用于启用 headless 模式。
- 必须传 `--approval-mode plan` 和 `--sandbox`。
- 不传 `--yolo` / `--raw-output` / `--accept-raw-output-risk`。
- 不使用 deprecated `--allowed-tools ""` 作为安全主路径。
- Gemini extensions/MCP/skills/hooks 和 policy/config 隔离仍需真实 smoke 验证；缺少匹配当前 CLI 版本的 smoke 记录前不能进入正式 round/synthesis 路径。

## Hermes（实验）

Hermes 当前已注册，但 `registryDefault=false` 且 `smokeVerified=false`。它只能在用户显式选择 `--agents role:hermes`、`doctor` 显示可用、并且当前 CLI 版本 smoke gate 通过后参与正式会议；auth/provider config 缺失、toolset 隔离不可验证、quiet 输出格式不可验证或 smoke 缺失时必须 fail fast。

新建：

```bash
printf '%s' "$PROMPT" | hermes chat --query - --quiet --toolsets "" --ignore-user-config --ignore-rules --source ai-meeting --max-turns 1
```

续会（实验）：

```bash
printf '%s' "$PROMPT" | hermes chat --query - --quiet --toolsets "" --ignore-user-config --ignore-rules --source ai-meeting --max-turns 1 --resume <session_id>
```

解析规则：

- 当前按 stateless provider 处理，`sessionId=null`。
- quiet stdout 是最终文本来源；写入 round 前去除明确匹配 `Session ID: ...` / `session_id=...` 的 metadata 行。
- 不从 assistant 文本或普通 stdout 中提取 session id。
- 空输出、auth/provider config 错误、非零退出、超时都必须记为 provider `failed`。

安全规则：

- prompt 通过 stdin 传入，不把完整 prompt 放入 argv。
- 不使用 `--oneshot`，因为 oneshot 不打印 session id 且会自动旁路 approvals。
- 不传 `--yolo` / `--accept-hooks` / `--pass-session-id` / `--skills`。
- 必须传 `--ignore-user-config` 和 `--ignore-rules`。
- `--toolsets ""` 是否真正禁工具仍需当前版本 smoke 验证；缺少匹配当前 CLI 版本的 smoke 记录前不能进入正式 round/synthesis 路径。

## 子 Agent 环境约束

orchestrator 调用 provider 时设置：

```txt
AI_MEETING_ACTIVE=1
```

本 skill 脚本检测到该环境变量会拒绝运行，防止子 Agent 递归启动会议。

Prompt 中也必须声明角色锁定：子 Agent 只输出当前角色分析，不得组织会议、调用脚本或模拟其他 Agent。

## 降级规则

如果 provider 不支持稳定 session：

1. 标记 `sessionMode: "stateless"`。
2. 每轮只传入 brief 摘要、该 Agent 历史摘要、其他 Agent 摘要和本轮任务。
3. 在最终报告记录该 provider 使用了降级模式。

如果 provider 声称支持 resume 但显式续会失败：

1. 在同一 Agent 固定隔离 workspace 中使用自足 prompt 新建 session 恢复一次。
2. 恢复成功时标记 `sessionMode: "recovered"`，写入 round record 的 `recovery` 字段。
3. 恢复失败时记录 `failed`，不得把空输出记为 completed。
4. final provenance 必须列出恢复或失败记录。

## 并发规则

- 不要并发调用同一个 Agent 的同一个 session。
- 可以并发调用不同 Agent。
- 写 `state.json` 时使用原子写入，避免半写入损坏。
- v1 脚本按 Agent 串行调用；后续要并发时必须给状态更新加锁，避免覆盖其他 Agent 的 session id。
