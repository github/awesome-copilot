---
name: 'Session Logger'
description: 'Logs all Copilot coding agent session activity for audit and analysis'
tags: ['logging', 'audit', 'analytics']
---

# Session Logger Hook

Comprehensive logging for GitHub Copilot coding agent sessions, tracking session starts, ends, and user prompts for audit trails and usage analytics.

## Overview

This hook provides detailed logging of Copilot coding agent activity:
- Session start/end times with working directory context
- User prompt submission events
- Configurable log levels

## Features

- **Session Tracking**: Log session start and end events
- **Prompt Logging**: Record when user prompts are submitted
- **Structured Logging**: JSON format for easy parsing
- **Privacy Aware**: Configurable to disable logging entirely

## Installation

1. Copy this hook folder to your repository's `.github/hooks/` directory:
   ```bash
   cp -r hooks/session-logger .github/hooks/
   ```

2. Create the logs directory:
   ```bash
   mkdir -p logs/copilot
   ```

3. Ensure scripts are executable:
   ```bash
   chmod +x .github/hooks/session-logger/*.sh
   ```

4. Commit the hook configuration to your repository's default branch

## Log Format

Session events are written to `logs/copilot/session.log` and prompt events to `logs/copilot/prompts.log` in JSON format:

```json
{"timestamp":"2024-01-15T10:30:00Z","event":"sessionStart","cwd":"/workspace/project"}
{"timestamp":"2024-01-15T10:35:00Z","event":"sessionEnd"}
```

## Privacy & Security

- Add `logs/` to `.gitignore` to avoid committing session data
- Use `LOG_LEVEL=ERROR` to only log errors
- Set `SKIP_LOGGING=true` environment variable to disable
- Logs are stored locally only
