# state.json Schema 草案

```json
{
  "version": 1,
  "meetingId": "2026-07-01-ai-meeting-skill",
  "topic": "AI Meeting Skill 第一版设计",
  "workspaceRoot": "/path/to/user/project",
  "createdAt": "2026-07-01T10:00:00.000Z",
  "updatedAt": "2026-07-01T10:10:00.000Z",
  "briefPath": "brief.md",
  "materials": [
    {
      "label": "docs/design.md",
      "materialPath": "materials/001-docs-design.md",
      "bytes": 12345,
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "truncatedForPrompt": false
    }
  ],
  "providers": {
    "codex": {
      "enabled": true,
      "sessionKind": "threadId"
    },
    "claude": {
      "enabled": true,
      "sessionKind": "sessionId"
    },
    "qoder": {
      "enabled": false,
      "sessionKind": "sessionId",
      "registryDefault": false
    },
    "opencode": {
      "enabled": false,
      "sessionKind": "sessionId",
      "registryDefault": false
    },
    "cursor": {
      "enabled": false,
      "sessionKind": "chatId",
      "registryDefault": false
    },
    "gemini": {
      "enabled": false,
      "sessionKind": "sessionId",
      "registryDefault": false
    },
    "hermes": {
      "enabled": false,
      "sessionKind": "none",
      "registryDefault": false
    }
  },
  "agents": {
    "builder": {
      "provider": "codex",
      "role": "Builder",
      "workspacePath": "workspaces/builder.codex",
      "sessionId": null,
      "status": "pending",
      "rounds": []
    }
  },
  "rounds": []
}
```

会议目录默认包含 `.gitignore`，忽略除 `.gitignore` 之外的所有文件。`state.json` 可能保存真实 session id，默认不提交。

`briefPath` 是会议目标和评审标准。`materials[]` 是 orchestrator 受控收集的上下文原文，例如开发文档、设计文档、代码片段、测试输出或 diff。子 Agent 不直接读取项目根；它们只接收 brief、materials 和会议历史的 data-fenced prompt。

Agent status:

- `pending`
- `active`
- `needs_recovery`
- `failed`
- `disabled`

Session mode:

- `persistent`：provider 返回了可续接 session id。
- `stateless`：provider 完成输出但没有返回 session id；后续轮次依赖自足 prompt。
- `recovered`：显式续会失败后，orchestrator 使用同一自足 prompt 新建 session 恢复成功。

`sessionMode` 在 Agent 成功完成一轮后写入；`pending` Agent 可以没有该字段。
`workspacePath` 是该 Agent 跨轮复用的隔离 cwd，必须是会议目录内的相对路径，不能是项目根或会议根。它用于保留 provider resume 语义，尤其是 Claude Code 的 cwd/project scoped session。

Round record:

```json
{
  "round": 1,
  "agent": "builder",
  "provider": "codex",
  "sessionId": "xxx",
  "outputPath": "rounds/round-1/builder.codex.md",
  "promptPath": "rounds/round-1/builder.codex.prompt.md",
  "status": "completed",
  "sessionMode": "persistent",
  "recovery": "Resume failed for redacted session ...; started a fresh provider session using the self-contained prompt.",
  "createdAt": "..."
}
```

`completed` 只表示该轮有可用的非空输出文件。provider 进程退出码为 0 但输出为空时，orchestrator 必须记录为 `failed`。

路径字段规则：

- `briefPath`
- `materials[].materialPath`
- `outputPath`
- `promptPath`
- `judge.outputPath`
- `judge.promptPath`
- `agents.<role>.workspacePath`

以上字段必须是会议目录内的相对路径，不允许绝对路径或 `..` 路径逃逸。
`materials[].label` 只是显示标签，不作为读取路径使用。`sha256` 用于证明材料内容，`truncatedForPrompt` 表示该材料在 prompt data block 中会被截断；会议目录内仍保存完整复制件。
`create` 会在 stdout JSON 中报告材料预算警告；该警告不写入 state。最终 prompt 和 Provenance 会基于 `truncatedForPrompt` 重新生成可信度边界说明。

全局 round record:

```json
{
  "round": 1,
  "createdAt": "...",
  "dryRun": false,
  "summaryPath": "synthesis/round-1-summary.md",
  "results": [
    {
      "agent": "builder",
      "provider": "codex",
      "status": "completed",
      "sessionId": "abcd...[redacted]...wxyz",
      "outputPath": "rounds/round-1/builder.codex.md"
    }
  ]
}
```

`round --dry-run` 只写入 `dry-run/round-<n>/` 下的 prompt 和预览输出，不修改 `state.json`。
正式 `round` 完成后写入 `summaryPath`，下一轮 prompt 使用该摘要增强自足性。
正式会议 artifacts 默认以 `0600` 写入。`state.json` 使用 atomic write。

最终裁决记录：

```json
{
  "judge": {
    "provider": "codex",
    "sessionId": "xxx",
    "status": "completed",
    "outputPath": "synthesis/final.md",
    "draftPath": null,
    "missingSections": [],
    "promptPath": "synthesis/judge.prompt.md",
    "updatedAt": "..."
  }
}
```

当 judge 输出缺少必需章节时，`status` 为 `failed`，`outputPath` 为 `null`，`draftPath` 指向 `synthesis/final.draft.md`，`missingSections` 列出缺失的二级章节。draft 只是失败产物，不是正式裁决。
