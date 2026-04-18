---
name: 'Governance Audit'
description: 'Scans Copilot agent prompts for threat signals and logs governance events'
tags: ['security', 'governance', 'audit', 'safety']
---

# Governance Audit Hook

Real-time threat detection and audit logging for GitHub Copilot coding agent sessions. Scans user prompts for dangerous patterns before the agent processes them.

## Overview

This hook provides governance controls for Copilot coding agent sessions:
- **Threat detection**: Scans prompts for data exfiltration, privilege escalation, system destruction, prompt injection, and credential exposure
- **Governance levels**: Open, standard, strict, locked — from audit-only to full blocking
- **Audit trail**: Append-only JSON log of all governance events
- **Session summary**: Reports threat counts at session end

## Threat Categories

| Category | Examples | Severity |
|----------|----------|----------|
| `data_exfiltration` | "send all records to external API" | 0.7 - 0.95 |
| `privilege_escalation` | "sudo", "chmod 777", "add to sudoers" | 0.8 - 0.95 |
| `system_destruction` | "rm -rf /", "drop database" | 0.9 - 0.95 |
| `prompt_injection` | "ignore previous instructions" | 0.6 - 0.9 |
| `credential_exposure` | Hardcoded API keys, AWS access keys | 0.9 - 0.95 |

## Governance Levels

| Level | Behavior |
|-------|----------|
| `open` | Log threats only, never block |
| `standard` | Log threats, block only if `BLOCK_ON_THREAT=true` |
| `strict` | Log and block all detected threats |
| `locked` | Log and block all detected threats |

## Installation

1. Copy the hook folder to your repository:
   ```bash
   cp -r hooks/governance-audit .github/hooks/
   ```

2. Ensure scripts are executable:
   ```bash
   chmod +x .github/hooks/governance-audit/*.sh
   ```

3. Create the logs directory and add to `.gitignore`:
   ```bash
   mkdir -p logs/copilot/governance
   echo "logs/" >> .gitignore
   ```

4. Commit to your repository's default branch.

## Configuration

Set environment variables in `hooks.json`:

```json
{
  "env": {
    "GOVERNANCE_LEVEL": "strict",
    "BLOCK_ON_THREAT": "true"
  }
}
```

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `GOVERNANCE_LEVEL` | `open`, `standard`, `strict`, `locked` | `standard` | Controls blocking behavior |
| `BLOCK_ON_THREAT` | `true`, `false` | `false` | Block prompts with threats (standard level) |
| `SKIP_GOVERNANCE_AUDIT` | `true` | unset | Disable governance audit entirely |

## Log Format

Events are written to `logs/copilot/governance/audit.log` in JSON Lines format:

```json
{"timestamp":"2026-01-15T10:30:00Z","event":"session_start","governance_level":"standard","cwd":"/workspace/project"}
{"timestamp":"2026-01-15T10:31:00Z","event":"prompt_scanned","governance_level":"standard","status":"clean"}
{"timestamp":"2026-01-15T10:32:00Z","event":"threat_detected","governance_level":"standard","threat_count":1,"threats":[{"category":"privilege_escalation","severity":0.8,"description":"Elevated privileges","evidence":"sudo"}]}
{"timestamp":"2026-01-15T10:45:00Z","event":"session_end","total_events":12,"threats_detected":1}
```

## Requirements

- `jq` for JSON processing (pre-installed on most CI environments and macOS)
- `grep` with `-E` (extended regex) support
- `bc` for floating-point comparison (optional, gracefully degrades)

## Privacy & Security

- Full prompts are **never** logged — only matched threat patterns (minimal evidence snippets) and metadata are recorded
- Add `logs/` to `.gitignore` to keep audit data local
- Set `SKIP_GOVERNANCE_AUDIT=true` to disable entirely
- All data stays local — no external network calls
