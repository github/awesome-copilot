---
description: 'Portable guidance for authoring safe, fast, and clear hooks and reusable hook examples'
applyTo: '.github/hooks/**, hooks/**'
---

# Hook Authoring Guidelines

Hooks are **small, deterministic commands or scripts** that run at specific lifecycle events.
An awesome hook does one clear job, runs quickly, and makes its side effects explicit.

## Folder Structure

A GitHub Copilot hook lives in `.github/hooks/` inside your repository:

```text
.github/
└── hooks/
    ├── block-dangerous-commands.json   ← hook config (which event, which script, options)
    └── scripts/
        ├── block-dangerous-commands.sh  ← Bash implementation
        └── block-dangerous-commands.ps1 ← PowerShell implementation (optional if Bash-only)
```

You can have multiple `.json` files — each one registers hooks for one or more events. The host loads all of them.

## The Config File

Each `.json` file maps events to an array of hook entries.

- **Command hooks** (`type: "command"`): run a local script. The host passes event JSON on stdin, your script responds through exit code and stdout.

### Config example

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "matcher": "bash",
        "type": "command",
        "bash": "./.github/hooks/scripts/block-dangerous-commands.sh",
        "powershell": "./.github/hooks/scripts/block-dangerous-commands.ps1",
        "cwd": ".",
        "timeoutSec": 5,
        "env": {
          "BLOCK_MODE": "deny"
        }
      }
    ]
  }
}
```

### Config fields

| Field | Required | What it does |
| ---- | ---- | ---- |
| `type` | yes | `"command"` for scripts |
| `matcher` | no | Host-level filter — hook only fires when the tool name matches this value (e.g. `"bash"`, `"powershell"`, `"edit"`, `"create"`). Locally verified working in Copilot CLI v1.0.36; not yet used in repo hook samples. |
| `bash` | one or both | Command line invoked on Unix / Bash-capable hosts |
| `powershell` | one or both | Command line invoked on Windows / PowerShell-capable hosts |
| `cwd` | no | Working directory, relative to repo root |
| `timeoutSec` | no | Max seconds before the host kills the process (default 30) |
| `env` | no | Extra process environment variables passed to the script |

### Why matchers matter

Without a matcher, every `preToolUse` hook fires on **every** tool call. Your script starts with boilerplate like:

```bash
tool_name="$(printf '%s' "$payload" | jq -r '.toolName')"
[[ "$tool_name" != "bash" ]] && exit 0
```

With a matcher, the host does this filtering for you — no boilerplate, no process spawn for irrelevant tools. This will likely become the standard pattern once the feature stabilizes.

If your hooks must work on both the CLI and the cloud agent (or on older CLI versions), keep the in-script filtering as a fallback even when using matchers.

### `env` — static configuration for your script

`env` is a **standard host field**. The keys inside it are **author-defined variables** — you choose the names and values.

They arrive as **process environment variables**, not inside the stdin JSON payload. Use them for static configuration that should not be hardcoded:

| Pattern | Example |
| ---- | ---- |
| Mode flag | `"BLOCK_MODE": "deny"` — same script logs in one repo, blocks in another |
| Threshold | `"MAX_CHANGED_FILES": "20"` |
| Path | `"AUDIT_LOG_PATH": ".github/logs/hooks.log"` |
| Feature toggle | `"ENABLE_NOTIFICATIONS": "false"` |

### `bash` and `powershell` — when to provide one or both

The host picks whichever entry matches the current environment. It does not run both, and does not fall back from one to the other.

| Situation | Provide |
| ---- | ---- |
| Private hook, one known platform | Only that platform's entry |
| Published hook claiming cross-platform support | Both entries |
| Single cross-platform runtime (Python, Node, pwsh) | Expose the same script through both entries |
| Bash-only dependency | `bash` only |
| Windows-only dependency | `powershell` only |

Cross-platform example using Python through both entries:

```json
{
  "type": "command",
  "bash": "python3 ./.github/hooks/scripts/check.py",
  "powershell": "python .\\.github\\hooks\\scripts\\check.py"
}
```

## The Script Contract

Every hook script follows the same basic contract: read JSON from stdin, do work, and respond through exit code, stdout, and stderr.

**Important**: `toolArgs` is a **JSON string**, not a nested object. You must parse it a second time to access its fields.

### Reading stdin and responding — Bash and PowerShell

**Bash**:

```bash
#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
tool_name="$(printf '%s' "$payload" | jq -r '.toolName')"
tool_args="$(printf '%s' "$payload" | jq -r '.toolArgs')"
command="$(printf '%s' "$tool_args" | jq -r '.command // ""')"
```

**PowerShell**:

```powershell
Set-StrictMode -Version Latest
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$toolArgs = $payload.toolArgs | ConvertFrom-Json
$command = $toolArgs.command
```

To deny in `preToolUse` (PowerShell):

```powershell
@{ permissionDecision = 'deny'; permissionDecisionReason = 'Blocked by policy' } |
    ConvertTo-Json -Compress
exit 0
```

### What the script receives

| Input | What it carries |
| ---- | ---- |
| `stdin` | One JSON payload describing the current event |
| process environment | Normal env vars plus any you defined under `env` in the config |
| working directory | `cwd` from the config, or the host default |

### How the script responds

| Channel | Purpose |
| ---- | ---- |
| exit `0` | Script succeeded — host continues unless stdout carried a structured deny |
| non-zero exit | **Blocks the triggering action** and signals hook failure |
| `stdout` | Structured machine-readable output — only for events that document a stdout schema (like `preToolUse`) |
| `stderr` | Human-readable diagnostics for logs |

### Exit codes and deny: the full picture

The deny mechanism **depends on the event**:

| Event type | How to allow | How to deny / block |
| ---- | ---- | ---- |
| `preToolUse` | exit `0`, empty or `{"permissionDecision":"allow"}` on stdout | **Preferred**: exit `0` + `{"permissionDecision":"deny","permissionDecisionReason":"..."}` on stdout — gives the host a reason to show. **Also works**: non-zero exit blocks the tool call, but without a structured reason. |
| `userPromptSubmitted` | exit `0` | Non-zero exit blocks the prompt (stdout is ignored for this event) |
| `agentStop` | exit `0` | Non-zero exit blocks the action |
| Other events (`sessionStart`, `sessionEnd`, `postToolUse`, `errorOccurred`) | exit `0` | Non-zero exit signals failure; the host may skip subsequent hooks for that event |

**Rule of thumb**: if the event has a structured stdout schema (like `preToolUse`), use it — it gives a clean reason and is the officially documented deny path. For events without structured stdout, non-zero exit is the practical block mechanism — this is confirmed by repo samples and learning hub docs, though the official GitHub reference does not explicitly document "non-zero = block" as a contract guarantee.

### Example 1: Commit gate — block commits until lint, types, and tests pass

**Why this pattern matters**: the deny reason includes the actual errors, so the agent sees what's broken and fixes it before trying again. This creates a self-correcting feedback loop — the most powerful thing hooks can do.

**Event**: `preToolUse` — fires before the agent runs `git commit`

**Config** — `.github/hooks/commit-gate.json`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "./.github/hooks/scripts/commit-gate.sh",
        "cwd": ".",
        "timeoutSec": 120
      }
    ]
  }
}
```

**Script** — `.github/hooks/scripts/commit-gate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
tool_name="$(printf '%s' "$payload" | jq -r '.toolName')"

# Only gate bash commands that are git commits
if [[ "$tool_name" != "bash" ]]; then exit 0; fi
command="$(printf '%s' "$payload" | jq -r '.toolArgs' | jq -r '.command // ""')"
if ! printf '%s' "$command" | grep -q "git commit"; then exit 0; fi

CWD="$(printf '%s' "$payload" | jq -r '.cwd')"
ERRORS=""

# 1. TypeScript type check
if [[ -f "$CWD/tsconfig.json" ]]; then
  TSC_OUT=$(cd "$CWD" && npx tsc --noEmit 2>&1) || ERRORS="${ERRORS}
=== TypeScript Errors ===
$(echo "$TSC_OUT" | head -30)"
fi

# 2. Lint
if [[ -f "$CWD/package.json" ]]; then
  HAS_LINT=$(jq -r '.scripts.lint // empty' "$CWD/package.json" 2>/dev/null)
  if [[ -n "$HAS_LINT" ]]; then
    LINT_OUT=$(cd "$CWD" && npm run lint --silent 2>&1) || ERRORS="${ERRORS}
=== Lint Errors ===
$(echo "$LINT_OUT" | tail -30)"
  fi

  # 3. Tests
  HAS_TEST=$(jq -r '.scripts.test // empty' "$CWD/package.json" 2>/dev/null)
  if [[ -n "$HAS_TEST" ]]; then
    TEST_OUT=$(cd "$CWD" && CI=true npm test -- --watchAll=false 2>&1) || ERRORS="${ERRORS}
=== Test Failures ===
$(echo "$TEST_OUT" | tail -30)"
  fi
fi

if [[ -n "$ERRORS" ]]; then
  jq -nc --arg reason "Cannot commit — fix these issues first:
$ERRORS" \
    '{permissionDecision:"deny",permissionDecisionReason:$reason}'
fi
exit 0
```

**What happens at runtime:**

| Scenario | stdout | exit | Host action |
| ---- | ---- | ---- | ---- |
| All checks pass | empty | `0` | Commit proceeds |
| Lint fails | `{"permissionDecision":"deny","permissionDecisionReason":"Cannot commit — fix these issues first:\n=== Lint Errors ===\n..."}` | `0` | Blocks commit; agent sees the errors and fixes them |
| jq missing | empty | non-zero | Hook failure |

### Example 2: Auto-format after file edits

**Why this pattern matters**: the agent writes code, and your formatter runs immediately after — no manual step needed. The agent's next read of that file sees the formatted version.

**Event**: `postToolUse` — fires after `edit` or `create` tool calls

**Config** — `.github/hooks/format-on-save.json`:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "./.github/hooks/scripts/format-on-save.sh",
        "cwd": ".",
        "timeoutSec": 15
      }
    ]
  }
}
```

**Script** — `.github/hooks/scripts/format-on-save.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
tool_name="$(printf '%s' "$payload" | jq -r '.toolName')"
result_type="$(printf '%s' "$payload" | jq -r '.toolResult.resultType // ""')"

# Only format after successful file writes
case "$tool_name" in
  edit|create) ;;
  *) exit 0 ;;
esac
[[ "$result_type" != "success" ]] && exit 0

file_path="$(printf '%s' "$payload" | jq -r '.toolArgs' | jq -r '.path // ""')"
[[ -z "$file_path" || ! -f "$file_path" ]] && exit 0

# Run the project's formatter — adapt to your stack
if command -v npx >/dev/null 2>&1 && [[ -f "package.json" ]]; then
  npx prettier --write "$file_path" 2>/dev/null || true
elif command -v dotnet >/dev/null 2>&1 && [[ "$file_path" == *.cs ]]; then
  dotnet format --include "$file_path" 2>/dev/null || true
fi
exit 0
```

**What happens at runtime:**

| Scenario | What the hook does | exit |
| ---- | ---- | ---- |
| Agent edits `src/app.ts` successfully | Runs `prettier --write src/app.ts` | `0` |
| Agent runs `bash ls` | Skips (not a file-writing tool) | `0` |
| Prettier not installed | Silently skips formatting | `0` |

### Example 3: Block dangerous commands with structured deny

**Why this pattern matters**: the simplest guardrail — prevent destructive shell commands before they execute, with a clear reason the agent can read.

**Event**: `preToolUse` — fires before any tool call

**Config** — `.github/hooks/block-dangerous.json`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "./.github/hooks/scripts/block-dangerous.sh",
        "cwd": ".",
        "timeoutSec": 5,
        "env": {
          "BLOCK_MODE": "deny"
        }
      }
    ]
  }
}
```

**Script** — `.github/hooks/scripts/block-dangerous.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
block_mode="${BLOCK_MODE:-log}"
tool_name="$(printf '%s' "$payload" | jq -r '.toolName')"

[[ "$tool_name" != "bash" ]] && exit 0

command="$(printf '%s' "$payload" | jq -r '.toolArgs' | jq -r '.command // ""')"

if printf '%s' "$command" | grep -qE 'rm -rf /|git reset --hard|git clean -fd|git push.*--force'; then
  # Truncate command to avoid leaking secrets in deny reason or logs
  short_cmd="$(printf '%.80s' "$command")"
  if [[ "$block_mode" == "deny" ]]; then
    jq -cn --arg reason "Destructive command blocked: ${short_cmd}..." \
      '{permissionDecision:"deny",permissionDecisionReason:$reason}'
  else
    echo "Would block: ${short_cmd}..." >&2
  fi
fi
exit 0
```

**What happens at runtime:**

| Scenario | BLOCK_MODE | stdout | exit | Host action |
| ---- | ---- | ---- | ---- | ---- |
| Safe command | any | empty | `0` | Proceeds |
| `git push --force` | `deny` | `{"permissionDecision":"deny",...}` | `0` | Blocks with reason |
| `git push --force` | `log` | empty | `0` | Proceeds (log only) |

## Event Types

The full hooks reference is authoritative. **Always check it for the latest payload shapes** before writing a hook:

- [Hooks configuration reference](https://docs.github.com/en/copilot/reference/hooks-configuration)
- [About hooks](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks)

| Event | stdout | Typical use |
| ---- | ---- | ---- |
| `sessionStart` | **parsed** — `additionalContext` in stdout is injected into the session | Setup, validation, context injection, logging |
| `sessionEnd` | ignored | Cleanup, summaries |
| `userPromptSubmitted` | ignored | Auditing, prompt blocking |
| `preToolUse` | **parsed** — `permissionDecision`, `modifiedArgs`/`updatedInput`, `additionalContext` | Guardrails, deny/block, argument modification |
| `postToolUse` | ignored | Logging, formatting |
| `postToolUseFailure` | — | Recovery after a failed tool run |
| `agentStop` | — | Final validation |
| `subagentStart` | — | Subagent audit |
| `subagentStop` | — | Subagent output validation |
| `errorOccurred` | ignored | Diagnostics, alerts |
| `preCompact` | — | Pre-compaction work |
| `permissionRequest` | — | Approval workflow |

### Payload schemas for common events

These are the payload shapes from the hooks reference. Always verify against the [official reference](https://docs.github.com/en/copilot/reference/hooks-configuration) for the latest fields.

**`sessionStart`**

```json
{
  "timestamp": 1704614400000,
  "cwd": "/path/to/project",
  "source": "new",
  "initialPrompt": "Create a new feature"
}
```

`source` is `"new"`, `"resume"`, or `"startup"`. `initialPrompt` is the user's first prompt if provided.

**`sessionStart` stdout output** — the host parses stdout for:

```json
{
  "additionalContext": "Current branch: main. Deploy target: staging."
}
```

`additionalContext` is injected directly into the session conversation, letting hooks provide environment-specific context dynamically.

**`sessionEnd`**

```json
{
  "timestamp": 1704618000000,
  "cwd": "/path/to/project",
  "reason": "complete"
}
```

`reason` is `"complete"`, `"error"`, `"abort"`, `"timeout"`, or `"user_exit"`.

**`userPromptSubmitted`**

```json
{
  "timestamp": 1704614500000,
  "cwd": "/path/to/project",
  "prompt": "Fix the authentication bug"
}
```

The field is `prompt` — the exact text the user submitted.

**`preToolUse`**

```json
{
  "timestamp": 1704614600000,
  "cwd": "/path/to/project",
  "toolName": "bash",
  "toolArgs": "{\"command\":\"rm -rf dist\",\"description\":\"Clean build directory\"}"
}
```

`toolArgs` is a **JSON string** — parse it a second time to access its fields.

**`preToolUse` stdout output** — the host parses stdout for:

| Field | What it does |
| ---- | ---- |
| `permissionDecision` | `"deny"` blocks the tool call. `"allow"` and `"ask"` also accepted; only `"deny"` is currently processed. |
| `permissionDecisionReason` | Human-readable reason shown to the user |
| `modifiedArgs` or `updatedInput` | Replacement tool arguments — used instead of the originals |
| `additionalContext` | Text injected into the agent's context for this turn |

**`postToolUse`**

```json
{
  "timestamp": 1704614700000,
  "cwd": "/path/to/project",
  "toolName": "bash",
  "toolArgs": "{\"command\":\"npm test\"}",
  "toolResult": {
    "resultType": "success",
    "textResultForLlm": "All tests passed (15/15)"
  }
}
```

`resultType` is `"success"`, `"failure"`, or `"denied"`.

**`errorOccurred`**

```json
{
  "timestamp": 1704614800000,
  "cwd": "/path/to/project",
  "error": {
    "message": "Network timeout",
    "name": "TimeoutError",
    "stack": "TimeoutError: Network timeout\n    at ..."
  }
}
```

**`agentStop`**

```json
{
  "timestamp": 1704618000000,
  "cwd": "/path/to/project"
}
```

Minimal payload — use it to trigger end-of-session actions like running `git diff --stat` or final validation.

## When Hooks Are the Wrong Tool

| Avoid hooks for | Better fit |
| ---- | ---- |
| Open-ended reasoning or style guidance | Instructions, prompts, or agents |
| Long multi-step workflows with memory, retries, or branching | Agents, scripts, or workflow engines |
| Background daemons, watchers, debounce loops, or async jobs | Dedicated automation, services, or CI |
| Heavy repository-wide validation | CI, scheduled jobs, or dedicated automation |

## Universal Design Rules

| Rule | Why it matters |
| ---- | ---- |
| One hook, one responsibility | Small hooks are easier to trust and debug |
| Default to **observe first** | Blocking or mutation should be an explicit choice |
| Keep hooks synchronous, bounded, and non-interactive | Hooks run in the critical path |
| Make hooks deterministic and idempotent | Re-runs should not create drift |
| Do not mutate branch, index, or worktree state by default | Git-destructive behavior is high risk |
| Treat prompts, tool arguments, and tool output as untrusted and sensitive | Input may be hostile or private |
| Redact secrets, credentials, tokens, and private content from logs | Logs often outlive the hook run |

## Script Authoring Rules

- Validate the JSON fields you actually use
- Quote shell variables and never build commands from raw input
- Keep stdout clean unless the host requires structured output
- Use strict modes: Bash `set -euo pipefail`, PowerShell `Set-StrictMode -Version Latest`
- Check dependencies early and fail clearly if they are missing
- Avoid prompts, hidden installs, or environment mutation during execution
- Test scripts by piping representative JSON payloads into them manually

## Choose the Smallest Viable Implementation

1. **PowerShell 7**, **Node.js**, or **Python** for broadly portable hooks
2. **Bash** where Bash is an explicit requirement or safe assumption
3. **An existing project CLI** when the repository already depends on it

Do **not** introduce a new compiled runtime just to implement an ordinary hook.

## Packaging a Reusable Hook

- Package config, scripts, and docs together
- Document the trigger event, purpose, side effects, dependencies, and disable path
- Explain what the hook reads, what it writes, and what it blocks

## Anti-Patterns

- Long-running hooks, watchers, background daemons, or fire-and-forget async work
- Heavy scans on every event when a narrower trigger would do
- Hidden network calls or uploads in the critical path
- Silent mutation of Git state (checkout, reset, clean, stash, stage, commit, push, or history rewriting) by default
- Interactive prompts or implicit approval steps
- Noisy stdout, ad-hoc output formats, or mixed machine/human output
- Logging raw prompts, secrets, credentials, or large tool outputs
- Monolithic hooks that mix unrelated responsibilities

## Portability

### GitHub Copilot: CLI, VS Code, and Cloud Agent

The same `.github/hooks/*.json` config, the same payload schema, and the same script contract work across CLI, VS Code, and the cloud agent. Event names accept both camelCase (`preToolUse`) and PascalCase (`PreToolUse`). The documented payload field for tool arguments is `toolArgs` (a JSON string).

One thing to know: the cloud agent only loads hooks from the repository's **default branch**. If your hooks.json is only on a feature branch, the cloud agent won't see it.

### Claude Code

Claude Code uses a different hook system:

- Settings in `~/.claude/settings.json` and `.claude/settings.json`
- Different event names and matcher syntax (regex, `if` conditions)
- Exit 2 = block, exit 1 = non-blocking error (not the same as GitHub Copilot)
- 5 hook types (command, http, mcp_tool, prompt, agent)
- 29+ events including `FileChanged`, `CwdChanged`, `ConfigChange`

The shared best practice is the same: keep hooks small, deterministic, explicit about I/O, and strict about side effects.
