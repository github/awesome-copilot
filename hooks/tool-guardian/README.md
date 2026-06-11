---
name: 'Tool Guardian'
description: 'Blocks dangerous tool operations (destructive file ops, force pushes, DB drops) before the Copilot coding agent executes them'
tags: ['security', 'safety', 'preToolUse', 'guardrails']
---

# Tool Guardian Hook

Blocks dangerous tool operations before a GitHub Copilot coding agent executes them, acting as a safety net against destructive commands, force pushes, database drops, and other high-risk actions.

## Overview

AI coding agents can autonomously execute shell commands, file operations, and database queries. Without guardrails, a misinterpreted instruction could lead to irreversible damage. This hook intercepts every tool invocation at the `preToolUse` event and scans it against ~20 threat patterns across 6 categories:

- **Destructive file ops**: `rm -rf /`, deleting `.env` or `.git`
- **Destructive git ops**: `git push --force` to main/master, `git reset --hard`
- **Database destruction**: `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `DELETE FROM` without `WHERE`
- **Permission abuse**: `chmod 777`, recursive world-writable permissions
- **Network exfiltration**: `curl | bash`, `wget | sh`, uploading files via `curl --data @`
- **System danger**: `sudo`, `npm publish`

## Features

- **Two guard modes**: `block` (exit non-zero to prevent execution) or `warn` (log only)
- **Safer alternatives**: Every blocked pattern includes a suggestion for a safer command
- **Allowlist support**: Skip specific patterns via `TOOL_GUARD_ALLOWLIST`
- **Structured logging**: JSON Lines output for integration with monitoring tools
- **Fast execution**: 10-second timeout; no external network calls
- **Zero dependencies**: Uses only standard Unix tools (`grep`, `sed`); optional `jq` for input parsing

## Installation

1. Copy the hook folder to your repository:

   ```bash
   cp -r hooks/tool-guardian your-repo/hooks/
   ```

2. Ensure the script is executable:

   ```bash
   chmod +x hooks/tool-guardian/guard-tool.sh
   ```

3. Create the logs directory and add it to `.gitignore`:

   ```bash
   mkdir -p .github/logs/copilot/tool-guardian
   echo ".github/logs/" >> .gitignore
   ```

4. Commit the hook configuration to your repository's default branch.

## Configuration

The hook is configured in `hooks.json` to run on the `preToolUse` event:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "hooks/tool-guardian/guard-tool.sh",
        "cwd": ".",
        "env": {
          "GUARD_MODE": "block"
        },
        "timeoutSec": 10
      }
    ]
  }
}
```

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `GUARD_MODE` | `warn`, `block` | `block` | `warn` logs threats only; `block` exits non-zero to prevent tool execution |
| `SKIP_TOOL_GUARD` | `true` | unset | Disable the guardian entirely |
| `TOOL_GUARD_LOG_DIR` | path | `.github/logs/copilot/tool-guardian` | Directory where guard logs are written |
| `TOOL_GUARD_ALLOWLIST` | comma-separated | unset | Patterns to skip (e.g., `git push --force,npm publish`) |

## How It Works

1. Before the Copilot coding agent executes a tool, the hook receives the tool invocation as JSON on stdin
2. Extracts `toolName` and `toolInput` fields (via `jq` if available, regex fallback otherwise)
3. Checks the combined text against the allowlist — if matched, skips all scanning
4. Scans combined text against ~20 regex threat patterns across 6 severity categories
5. Reports findings with category, severity, matched text, and a safer alternative
6. Writes a structured JSON log entry for audit purposes
7. In `block` mode, exits non-zero to prevent the tool from executing
8. In `warn` mode, logs the threat and allows execution to proceed

## Threat Categories

| Category | Severity | Key Patterns | Suggestion |
|----------|----------|-------------|------------|
| `destructive_file_ops` | critical | `rm -rf /`, `rm -rf ~`, `rm -rf .`, delete `.env`/`.git` | Use targeted paths or `mv` to back up |
| `destructive_git_ops` | critical/high | `git push --force` to main/master, `git reset --hard`, `git clean -fd` | Use `--force-with-lease`, `git stash`, dry-run |
| `database_destruction` | critical/high | `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `DELETE FROM` without WHERE | Use migrations, backups, add WHERE clause |
| `permission_abuse` | high | `chmod 777`, `chmod -R 777` | Use `755` for dirs, `644` for files |
| `network_exfiltration` | critical/high | `curl \| bash`, `wget \| sh`, `curl --data @file` | Download first, review, then execute |
| `system_danger` | high | `sudo`, `npm publish` | Use least privilege; `--dry-run` first |

## Examples

### Safe command (exit 0)

```bash
echo '{"toolName":"bash","toolInput":"git status"}' | bash hooks/tool-guardian/guard-tool.sh
```

### Blocked command (exit 1)

```bash
echo '{"toolName":"bash","toolInput":"git push --force origin main"}' | \
  GUARD_MODE=block bash hooks/tool-guardian/guard-tool.sh
```

```
🛡️  Tool Guardian: 1 threat(s) detected in 'bash' invocation

  CATEGORY                 SEVERITY   MATCH                                    SUGGESTION
  --------                 --------   -----                                    ----------
  destructive_git_ops      critical   git push --force origin main             Use 'git push --force-with-lease' or push to a feature branch

🚫 Operation blocked: resolve the threats above or adjust TOOL_GUARD_ALLOWLIST.
   Set GUARD_MODE=warn to log without blocking.
```

### Warn mode (exit 0, threat logged)

```bash
echo '{"toolName":"bash","toolInput":"rm -rf /"}' | \
  GUARD_MODE=warn bash hooks/tool-guardian/guard-tool.sh
```

### Allowlisted command (exit 0)

```bash
echo '{"toolName":"bash","toolInput":"git push --force origin main"}' | \
  TOOL_GUARD_ALLOWLIST="git push --force" bash hooks/tool-guardian/guard-tool.sh
```

## Log Format

Guard events are written to `.github/logs/copilot/tool-guardian/guard.log` in JSON Lines format:

```json
{"timestamp":"2026-03-16T10:30:00Z","event":"threats_detected","mode":"block","tool":"bash","threat_count":1,"threats":[{"category":"destructive_git_ops","severity":"critical","match":"git push --force origin main","suggestion":"Use 'git push --force-with-lease' or push to a feature branch"}]}
```

```json
{"timestamp":"2026-03-16T10:30:00Z","event":"guard_passed","mode":"block","tool":"bash"}
```

```json
{"timestamp":"2026-03-16T10:30:00Z","event":"guard_skipped","reason":"allowlisted","tool":"bash"}
```

## Customization

- **Add custom patterns**: Edit the `PATTERNS` array in `guard-tool.sh` to add project-specific threat patterns
- **Adjust severity**: Change severity levels for patterns that need different treatment
- **Allowlist known commands**: Use `TOOL_GUARD_ALLOWLIST` for commands that are safe in your context
- **Change log location**: Set `TOOL_GUARD_LOG_DIR` to route logs to your preferred directory

## Disabling

To temporarily disable the guardian:

- Set `SKIP_TOOL_GUARD=true` in the hook environment
- Or remove the `preToolUse` entry from `hooks.json`

## Limitations

- Pattern-based detection; does not perform semantic analysis of command intent
- May produce false positives for commands that match patterns in safe contexts (use the allowlist to suppress these)
- Scans the text representation of tool input; cannot detect obfuscated or encoded commands
- Requires tool invocations to be passed as JSON on stdin with `toolName` and `toolInput` fields
