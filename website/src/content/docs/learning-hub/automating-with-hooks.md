---
title: 'Automating with Hooks'
description: 'Learn how to use hooks to automate lifecycle events like formatting, linting, and governance checks during Copilot agent sessions.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-28
estimatedReadingTime: '8 minutes'
tags:
  - hooks
  - automation
  - fundamentals
relatedArticles:
  - ./building-custom-agents.md
  - ./what-are-agents-skills-instructions.md
prerequisites:
  - Basic understanding of GitHub Copilot agents
---

Hooks let you run automated scripts at key moments during a Copilot agent session — when a session starts or ends, when the user submits a prompt, or before and after the agent uses a tool. They're the glue between Copilot's AI capabilities and your team's existing tooling: linters, formatters, governance scanners, and notification systems.

This article explains how hooks work, how to configure them, and practical patterns for common automation needs.

## What Are Hooks?

Hooks are shell commands or scripts that run automatically in response to lifecycle events during a Copilot agent session. They execute outside the AI model, they're deterministic, repeatable, and under your full control.

**Key characteristics**:
- Hooks run as shell commands on the user's machine
- They execute synchronously—the agent waits for them to complete
- They can block actions (e.g., prevent commits that fail linting)
- They're defined in JSON files stored at `.github/hooks/*.json` in your repository
- They receive detailed context via JSON input, enabling context-aware automation
- They can include bundled scripts for complex logic

### When to Use Hooks vs Other Customizations

| Use Case | Best Tool |
|----------|-----------|
| Run a linter after every code change | **Hook** |
| Teach Copilot your coding standards | **Instruction** |
| Automate a multi-step workflow | **Skill** or **Agent** |
| Scan prompts for sensitive data | **Hook** |
| Format code before committing | **Hook** |
| Generate tests for new code | **Skill** |

Hooks are ideal for **deterministic automation** that must happen reliably—things you don't want to depend on the AI remembering to do.

## Anatomy of a Hook

Each hook in this repository is a folder containing:

```
hooks/
└── my-hook/
    ├── README.md          # Documentation with frontmatter
    ├── hooks.json         # Hook configuration
    └── scripts/           # Optional bundled scripts
        └── check.sh
```

> Note: Not all of these files are required for a generalised hook implementation. In your own repository, hooks are stored as JSON files in `.github/hooks/` (e.g., `.github/hooks/my-hook.json`). The folder structure above with README.md is specific to the Awesome Copilot repository for documentation purposes.


### hooks.json

The configuration defines which events trigger which commands:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "npx prettier --write .",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

## Hook Events

Hooks can trigger on several lifecycle events:

| Event | When It Fires | Common Use Cases |
|-------|---------------|------------------|
| `sessionStart` | Agent session begins or resumes | Initialize environments, log session starts, validate project state |
| `sessionEnd` | Agent session completes or is terminated | Clean up temp files, generate reports, send notifications |
| `userPromptSubmitted` | User submits a prompt | Log requests for auditing and compliance |
| `preToolUse` | Before the agent uses any tool (e.g., `bash`, `edit`) | **Approve or deny** tool executions, block dangerous commands, enforce security policies |
| `postToolUse` | After a tool completes execution | Log results, track usage, format code after edits, send failure alerts |
| `agentStop` | Main agent finishes responding to a prompt | Run final linters/formatters, validate complete changes |
| `preCompact` | Before the agent compacts its context window | Save a snapshot, log compaction event, run summary scripts |
| `subagentStart` | A subagent is spawned by the main agent | Inject additional context into the subagent's prompt, log subagent launches |
| `subagentStop` | A subagent completes before returning results | Audit subagent outputs, log subagent activity |
| `errorOccurred` | An error occurs during agent execution | Log errors for debugging, send notifications, track error patterns |

> **Key insight**: The `preToolUse` hook is the most powerful — it can **approve or deny** individual tool executions. This enables fine-grained security policies like blocking specific shell commands or requiring approval for sensitive file operations.

### sessionStart additionalContext

The `sessionStart` hook supports an `additionalContext` field in its output. When your hook script writes JSON to stdout containing an `additionalContext` key, that text is **injected directly into the conversation** at the start of the session. This lets hooks dynamically provide environment-specific context—such as the current git branch, deployment environment, or team onboarding notes—without requiring the user to paste it manually.

Example hook script that surfaces context:

```bash
#!/usr/bin/env bash
# Output JSON with additionalContext to inject into the session
cat <<EOF
{
  "additionalContext": "Current branch: $(git rev-parse --abbrev-ref HEAD). Open tickets: $(gh issue list --limit 3 --json number,title | jq -r '.[] | \"#\(.number) \(.title)\"' | tr '\n' '; ')"
}
EOF
```

### Extension Hooks Merging

When multiple IDE extensions (or a mix of extensions and a `hooks.json` file) each define hooks, all hook definitions are **merged** rather than the last one overwriting the others. This means you can layer hooks from different sources—a project's `.github/hooks/` file, an extension you have installed, and a personal settings file—and all of them will fire for the relevant events.

### Cross-Platform Event Name Compatibility

Hook event names can be written in **camelCase** (e.g., `preToolUse`) or **PascalCase** (e.g., `PreToolUse`). Both are accepted, making hook configuration files compatible across GitHub Copilot CLI, VS Code, and Claude Code without modification. Hooks also support Claude Code's nested `matcher`/`hooks` structure alongside the standard flat format.

### Plugin Hooks Environment Variables

When hooks are defined inside a **plugin**, the hook scripts receive two additional environment variables automatically:

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | The path to the current project (working) directory |
| `CLAUDE_PLUGIN_DATA` | The path to a persistent data directory scoped to the plugin |

You can also use these as **template variables** directly in the `bash` or `powershell` fields of your `hooks.json` configuration:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": "{{plugin_data_dir}}/scripts/init.sh --project {{project_dir}}",
        "timeoutSec": 10
      }
    ]
  }
}
```

This makes it straightforward to write plugin hooks that are portable across machines and projects without hardcoding paths.

### Event Configuration

Each hook entry supports these fields:

```json
{
  "type": "command",
  "bash": "./scripts/my-check.sh",
  "powershell": "./scripts/my-check.ps1",
  "cwd": ".",
  "timeoutSec": 10,
  "env": {
    "CUSTOM_VAR": "value"
  }
}
```

**type**: Always `"command"` for shell-based hooks.

**bash**: The command or script to execute on Unix systems. Can be inline or reference a script file.

**powershell**: The command or script to execute on Windows systems. Either `bash` or `powershell` (or both) must be provided.

**cwd**: Working directory for the command (relative to repository root).

**timeoutSec**: Maximum execution time in seconds (default: 30). The hook is killed if it exceeds this limit.

**env**: Additional environment variables merged with the existing environment.

### README.md

The README provides metadata and documentation for the Awesome Copilot repository. While not required in your own implementation, it serves as a useful way to document them for your team.

```markdown
---
name: 'Auto Format'
description: 'Automatically formats code using project formatters before commits'
tags: ['formatting', 'code-quality']
---

# Auto Format

Runs your project's configured formatter (Prettier, Black, gofmt, etc.)
automatically before the agent commits changes.

## Setup

1. Ensure your formatter is installed and configured
2. Copy the hooks.json to your `.github/hooks/` directory
3. Adjust the formatter command for your project
```

## Practical Examples

### Auto-Format After Edits

Ensure all code is formatted after the agent edits files:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "npx prettier --write . && git add -A",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

### Lint Check When Agent Completes

Run ESLint after the agent finishes responding and block if there are errors:

```json
{
  "version": 1,
  "hooks": {
    "agentStop": [
      {
        "type": "command",
        "bash": "npx eslint . --max-warnings 0",
        "cwd": ".",
        "timeoutSec": 60
      }
    ]
  }
}
```

If the lint command exits with a non-zero status, the action is blocked.

### Security Gating with preToolUse

Block dangerous commands before they execute:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "./scripts/security-check.sh",
        "cwd": ".",
        "timeoutSec": 15
      }
    ]
  }
}
```

The `preToolUse` hook receives JSON input with details about the tool being called. Your script can inspect this input and exit with a non-zero code to **deny** the tool execution, or exit with zero to **approve** it.

### Governance Audit

Scan user prompts for potential security threats and log session activity:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": ".github/hooks/governance-audit/audit-session-start.sh",
        "cwd": ".",
        "timeoutSec": 5
      }
    ],
    "userPromptSubmitted": [
      {
        "type": "command",
        "bash": ".github/hooks/governance-audit/audit-prompt.sh",
        "cwd": ".",
        "env": {
          "GOVERNANCE_LEVEL": "standard",
          "BLOCK_ON_THREAT": "false"
        },
        "timeoutSec": 10
      }
    ],
    "sessionEnd": [
      {
        "type": "command",
        "bash": ".github/hooks/governance-audit/audit-session-end.sh",
        "cwd": ".",
        "timeoutSec": 5
      }
    ]
  }
}
```

This pattern is useful for enterprise environments that need to audit AI interactions for compliance.

### Notification on Session End

Send a Slack or Teams notification when an agent session completes:

```json
{
  "version": 1,
  "hooks": {
    "sessionEnd": [
      {
        "type": "command",
        "bash": "curl -X POST \"$SLACK_WEBHOOK_URL\" -H 'Content-Type: application/json' -d '{\"text\": \"Copilot agent session completed\"}'",
        "cwd": ".",
        "env": {
          "SLACK_WEBHOOK_URL": "${input:slackWebhook}"
        },
        "timeoutSec": 5
      }
    ]
  }
}
```

### Injecting Context into Subagents

The `subagentStart` hook fires when the main agent spawns a subagent (e.g., via the `task` tool). Use it to inject additional context—such as project conventions or security guidelines—directly into the subagent's prompt:

```json
{
  "version": 1,
  "hooks": {
    "subagentStart": [
      {
        "type": "command",
        "bash": "echo 'Follow the team coding standards in .github/instructions/ for all code changes.'",
        "cwd": ".",
        "timeoutSec": 5
      }
    ]
  }
}
```

This is especially useful in multi-agent workflows where subagents may not automatically inherit context from the parent session.

### Plugin Hook Environment Variables

When hooks are defined inside a **plugin**, Copilot CLI automatically injects two extra environment variables so scripts can locate project-specific and plugin-specific directories:

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to the working project directory |
| `CLAUDE_PLUGIN_DATA` | Absolute path to the plugin's persistent data directory |

You can also reference these paths as template variables in your hook configuration:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "{{plugin_data_dir}}/scripts/format.sh {{project_dir}}",
        "timeoutSec": 30
      }
    ]
  }
}
```

This is useful for plugins that bundle scripts or data files alongside their hooks, since `{{plugin_data_dir}}` always points to the correct installed location regardless of where the plugin is installed.

## Writing Hook Scripts

For complex logic, use bundled scripts instead of inline bash commands:

```bash
#!/usr/bin/env bash
# scripts/pre-commit-check.sh
set -euo pipefail

echo "Running pre-commit checks..."

# Format code
npx prettier --write .

# Run linter
npx eslint . --fix

# Run type checker
npx tsc --noEmit

# Stage any formatting changes
git add -A

echo "Pre-commit checks passed ✅"
```

**Tips for hook scripts**:
- Use `set -euo pipefail` to fail fast on errors
- Keep scripts focused—one responsibility per script
- Make scripts executable: `chmod +x scripts/pre-commit-check.sh`
- Test scripts manually before adding them to hooks.json
- Use reasonable timeouts—formatting a large codebase may need 30+ seconds

## Best Practices

- **Keep hooks fast**: Hooks run synchronously, so slow hooks delay the agent. Set tight timeouts and optimize scripts.
- **Use non-zero exit codes to block**: If a hook exits with a non-zero code, the triggering action is blocked. Use this for must-pass checks.
- **Bundle scripts in the hook folder**: Keep related scripts alongside the hooks.json for portability.
- **Document setup requirements**: If hooks depend on tools being installed (Prettier, ESLint), document this in the README.
- **Test locally first**: Run hook scripts manually before relying on them in agent sessions.
- **Layer hooks, don't overload**: Use multiple hook entries for independent checks rather than one monolithic script.

## Common Questions

**Q: Where do I put hooks configuration files?**

A: There are several supported locations, loaded in order of precedence:

- **Repository-level** (shared with team): `.github/hooks/*.json` in your repository — all JSON files in this folder are loaded automatically
- **Claude/Copilot project settings**: `.claude/settings.json` and `.claude/settings.local.json` — hooks defined here are applied to the current repository without committing them to `.github/`
- **Global settings**: `settings.json` or `settings.local.json` (user-level CLI config)
- **Legacy config**: `config.json` (also supported)

For team-wide hooks that everyone should use, `.github/hooks/` is the recommended location as it is version-controlled and shared automatically.

**Q: Can hooks access the user's prompt text?**

A: Yes, for `userPromptSubmitted` events the prompt content is available via JSON input to the hook script. Other hooks like `preToolUse` and `postToolUse` receive context about the tool being called. See the [GitHub Copilot hooks documentation](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-hooks) for details.

**Q: What happens if a hook times out?**

A: The hook is terminated and the agent continues. Set `timeoutSec` appropriately for your scripts.

**Q: Can I have multiple hooks for the same event?**

A: Yes. Hooks for the same event run in the order they appear in the array. If any hook fails (non-zero exit), subsequent hooks for that event may be skipped.

**Q: Do hooks work with the Copilot coding agent?**

A: Yes. Hooks are especially valuable with the coding agent because they provide deterministic guardrails for autonomous operations. See [Using the Copilot Coding Agent](../using-copilot-coding-agent/) for details.

## Next Steps

- **Explore Examples**: Browse the [Hooks Directory](../../hooks/) for ready-to-use hook configurations
- **Build Agents**: [Building Custom Agents](../building-custom-agents/) — Create agents that complement hooks
- **Automate Further**: [Using the Copilot Coding Agent](../using-copilot-coding-agent/) — Run hooks in autonomous agent sessions

---
