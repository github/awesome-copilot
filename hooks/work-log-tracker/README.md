---
name: 'Work Log Tracker'
description: 'Lightweight session logging — tracks what you worked on across repos'
tags: ['logging', 'productivity', 'work-tracking']
---

# Work Log Tracker Hook

Lightweight session logging for GitHub Copilot coding agent. Automatically records when sessions start and end, along with git repo context, so you always know what you worked on.

## Overview

This hook appends a JSON Lines record to `~/.copilot-work-log/sessions.jsonl` for every coding agent session:

- **Session start**: timestamp, working directory, git repo name, branch
- **Session end**: timestamp

No prompts or code are logged — only metadata.

## Installation

1. Copy this hook folder to your repository's `.github/hooks/` directory:
   ```bash
   cp -r hooks/work-log-tracker .github/hooks/
   ```

2. Ensure scripts are executable:
   ```bash
   chmod +x .github/hooks/work-log-tracker/*.sh
   ```

3. Commit the hook configuration to your repository's default branch.

## Log Format

Records are appended to `~/.copilot-work-log/sessions.jsonl` in JSON Lines format:

```json
{"timestamp":"2026-01-15T10:30:00Z","event":"session_start","cwd":"/home/user/project","repo":"my-app","branch":"feature/auth","pid":12345}
{"timestamp":"2026-01-15T11:00:00Z","event":"session_end","pid":12345}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WORK_LOG_DIR` | `~/.copilot-work-log` | Directory for log files |
| `SKIP_WORK_LOG` | unset | Set to `true` to disable logging |

## Privacy & Security

- **No code or prompts are logged** — only session metadata (timestamps, repo name, branch)
- Logs are stored locally in your home directory
- Set `SKIP_WORK_LOG=true` to disable entirely
- No external network calls

## Want More?

This hook provides basic session tracking. For full-featured work logging with:

- ✍️ Manual brag-sheet entries with impact tracking
- 📊 Categorized work logs (PR, bugfix, infrastructure, oncall, etc.)
- 📝 Auto-generated markdown reports for performance reviews
- 🔄 Git backup to keep your work log synced
- 📁 File and PR tracking within sessions

Check out **[copilot-brag-sheet](https://github.com/vidhartbhatia/copilot-brag-sheet)** — a zero-dependency Copilot CLI extension that builds on the same idea.

Also see **[What-I-Did-Copilot](https://github.com/microsoft/What-I-Did-Copilot)** for another approach to AI-assisted work tracking.
