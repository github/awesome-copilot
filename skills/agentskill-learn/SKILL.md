---
name: agentskill-learn
description: "Discover, install, and manage AI agent skills from agentskill.sh marketplace. Search 44,000+ community skills by keyword, install mid-session with security scanning, and rate skills after use. Use when asked to find skills, extend capabilities, or learn new tools."
---

# AgentSkill Learn — Community Skills Marketplace

This skill transforms your agent into a self-improving system capable of discovering and installing new capabilities during active sessions. It connects to [agentskill.sh](https://agentskill.sh), a community marketplace with 44,000+ AI agent skills.

> Maintained at [github.com/agentskill-sh/learn](https://github.com/agentskill-sh/learn) — check there for the latest version.

## Core Commands

- **`/learn <query>`** — Search for skills matching a query
- **`/learn @<owner>/<slug>`** — Install a specific skill directly
- **`/learn <url>`** — Install from agentskill.sh URL
- **`/learn`** — Context-aware recommendations based on current project
- **`/learn trending`** — Display trending skills
- **`/learn feedback <slug> <score> [comment]`** — Rate installed skills
- **`/learn list`** — Show all installed skills
- **`/learn update`** — Check and apply skill updates
- **`/learn remove <slug>`** — Uninstall a skill
- **`/learn scan <path>`** — Audit skill security
- **`/learn config autorating <on|off>`** — Toggle automatic ratings

## Installation Flow

When a user requests a skill install:

1. Fetch skill content from the API
2. Run multi-phase security scanning
3. Display security results and request confirmation
4. Write skill file with metadata header
5. Track install event
6. Show post-install summary

## Security Scanning (Two-Layer Model)

**Registry-side (agentskill.sh):** All skills pre-scanned using automated pattern detection before publication.

**Client-side:** Pre-computed security scores displayed before install. Scores below 70 block installation; scores 70-89 require acknowledgment.

### Scanning Phases

1. **Automated Tools** — Run mcp-scan, trufflehog, gitleaks if available
2. **Metadata & Structure** — Validate SKILL.md and folder contents
3. **Static Text Analysis** — Detect prompt injection, RCE, obfuscation, secrets, persistence mechanisms
4. **Secret & Dependency Scan** — Check for hardcoded credentials and suspicious packages
5. **Script Analysis** — Examine Python/shell scripts for dangerous functions
6. **Dynamic Analysis** — Optional sandbox execution for high-value targets

### Scoring

```
Score = 100 - (CRITICAL x 20) - (HIGH x 10) - (MEDIUM x 3) - (LOW x 1)
Minimum = 0
```

| Score | Rating | Action |
|-------|--------|-------------------------------------|
| 90-100 | SAFE | Allow installation |
| 70-89 | REVIEW | Show issues, require acknowledgment |
| <70 | DANGER | Block installation |

Critical patterns include: prompt injection ("ignore previous"), remote code execution (curl|bash), credential exfiltration, reverse shells, destructive commands (rm -rf).

## Platform Detection

Detect where to install based on directory presence:

- `.github/copilot/` — GitHub Copilot
- `.claude/` — Claude Code / Claude Desktop
- `.cursor/` — Cursor
- `.windsurf/` — Windsurf
- `.cline/` — Cline
- `.codex/` — Codex
- `.opencode/` — OpenCode
- `.aider/` — Aider
- `.gemini/` — Gemini CLI
- `.amp/` — Amp
- `.goose/` — Goose
- `.roo-code/` — Roo Code
- `.trae/` — Trae

Install path format: `<platform-dir>/skills/<slug>.md`

## Automatic Skill Rating (Opt-Out)

After using an installed skill, auto-rate it using a 1-5 scoring rubric:

- **5** — Task completed perfectly; clear, accurate instructions
- **4** — Successful completion with minor improvements possible
- **3** — Completed with friction; instruction gaps requiring interpretation
- **2** — Partial completion; significant issues or outdated information
- **1** — Failed or misleading; instructions incorrect or harmful

Users receive a notification before submission and can disable auto-rating with `/learn config autorating off`.

## Output Formatting

- Use markdown tables for skill listings
- Use `AskUserQuestion` tool for interactive selections
- Format headers with `##` for scannability
- Bold skill names and important values
- Truncate descriptions to ~80 characters in tables
- Show full descriptions in detail views

## Error Handling

- **API unreachable:** Direct users to browse at agentskill.sh
- **No results:** Suggest alternate keywords
- **Install failures:** Note permission issues or write errors
- **Self-update failures:** Continue silently with current version
- **Security blocks:** Display full report without proceeding

## API Endpoints

All calls to `https://agentskill.sh`:

- `GET /api/agent/search?q=<query>&limit=5` — Search
- `GET /api/agent/skills/<slug>/install` — Fetch content
- `GET /api/agent/skills/<slug>/version` — Check version
- `POST /api/skills/<slug>/install` — Track install
- `POST /api/skills/<slug>/agent-feedback` — Submit rating

## Self-Update Protocol

Before executing commands, check if `/learn` itself is current by comparing local `contentSha` with remote version. Fetch and scan new versions before updating; proceed silently if API is unreachable.
