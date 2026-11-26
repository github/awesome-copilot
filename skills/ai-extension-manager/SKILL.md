---
name: ai-extension-manager
description: 'Use this skill when the user wants to download, install, manage, or synchronize AI agent skills, plugins, MCP configs, or rules across multiple AI coding tools (Claude Code, Codex, Gemini CLI, Cursor, VS Code Copilot, DSH). Trigger for prompts like sync my skills across agents, import this GitHub skill, install this skill everywhere, check for config conflicts, or back up my agent setup. Provides a local-first central library with SHA-256 three-way sync, per-target backups, and conflict detection that never overwrites changes without consent.'
license: MIT
compatibility: 'Cross-platform (Windows, macOS, Linux). Requires Python 3.9+; git optional. Install the CLI with pip install ai-extension-manager.'
metadata:
  version: "1.0.19"
  source: "https://github.com/Jack91124/ai-extension-manager"
---

# AI Extension Manager

One central library for your AI agent skills, plugins, MCP configs, and rules — with hash-based two-way sync across six coding agents. It never silently overwrites your changes.

## When to use

- The user asks to download a skill or plugin from GitHub and install it into one or more AI tools.
- The user wants to sync skills, rules, or MCP configs across Claude Code, Codex, Gemini CLI, Cursor, VS Code Copilot, and DSH.
- The user wants to scan installed resources, import them into a central library, and report version conflicts.
- The user wants backups, restores, or version history for their agent configuration.

## Prerequisites

Install the CLI (Python 3.9+):

```bash
pip install ai-extension-manager
aem --version
```

If the user prefers not to install anything, clone https://github.com/Jack91124/ai-extension-manager and run the scripts in `scripts/` directly with Python.

## Core workflow

1. **Initialize a central library** (one-time): `aem init` — creates `~/.ai-extension-manager` with `library/`, `metadata/`, `backups/`, `conflicts/`, and `logs/`. Use `--home <dir>` to place it elsewhere.
2. **Detect a resource**: `aem detect --url <github-url>` or `aem detect --path <dir>` — classifies the source as skill, plugin, MCP, or rules. A URL alone cannot determine type; clone and inspect before deciding.
3. **Import**: `aem import --source <dir> --type skill` — copies into the central library with a SHA-256 manifest and version snapshot. Add `--allow-risk` / `--allow-secrets` only after user approval.
4. **Scan agents**: `aem scan` — detects which of the six tools are installed and where their skills/plugins live.
5. **Distribute**: `aem sync --direction distribute --agent claude --resource <name>` (or `--all` for every compatible tool). Default mode is copy; use `--mode link` only when platform compatibility is verified.
6. **Reverse import**: `aem sync --direction import --agent codex --all` — brings locally edited skills back into the library as a new version.
7. **Verify**: `aem verify --all` — confirms each target still matches the library hash.

## Two-way sync states

Sync uses SHA-256 hashes, version records, last-sync status, mtime, and diffs — never last-modified-time alone:

- **A**: only the library changed → safe to distribute.
- **B**: only the target changed → safe to import as a new version.
- **C**: both changed → conflict; exit code 2. Default action is **do nothing**.
- **D**: target file deleted → conflict; require explicit choice.
- **E**: target directory missing → report, do not guess.

Conflict resolution: `aem compare --resource <name> --diff`, then `aem sync --direction distribute --on-conflict library|target|overwrite|new-version`. Default never overwrites. See `aem doctor` for environment and mirror-rewrite warnings.

## Safety rules

- Never overwrite an existing file without an explicit conflict decision.
- Never write API keys or secrets into the shared library; secrets are redacted to environment-variable placeholders.
- Back up before every modify; restore with `aem backup restore --backup-id <id>`.
- High-risk install scripts and git `url.<base>.insteadOf` mirror rewrites require user confirmation.
- Operations that fail conflict checks exit 2 so automation never mistakes them for success.

## Reference

- Full docs: https://jack91124.github.io/ai-extension-manager/
- Source & releases: https://github.com/Jack91124/ai-extension-manager
- JSON result contract: `aem.result/v1` (stable schema field on every `--json` output).
