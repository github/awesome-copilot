---
name: agentskill-learn
description: "Discover, install, and manage AI agent skills from agentskill.sh marketplace. Search 44,000+ community skills by keyword, install mid-session with security scanning, and rate skills after use. Use when asked to find skills, extend capabilities, or learn new tools."
---

# AgentSkill Learn — Community Skills Marketplace

This skill connects GitHub Copilot to [agentskill.sh](https://agentskill.sh), a community marketplace for AI agent skills. Search, install, and manage skills with built-in security scanning.

## Installation

This is a pointer to the canonical skill. Install the full version:

```bash
gh copilot skill install https://github.com/agentskill-sh/learn
```

## What It Does

- **Search**: Find skills by keyword from the agentskill.sh catalog (44,000+ skills indexed)
- **Install**: Download skills with security scanning (blocks dangerous patterns)
- **Rate**: Auto-rate skills after use; user ratings override
- **Update**: SHA-based version tracking for updates
- **Multi-platform**: Works with Copilot, Claude Code, Codex, Cursor, Windsurf, Cline

## Quick Commands

| Command | Description |
|---------|-------------|
| `/learn <query>` | Search for skills |
| `/learn @owner/slug` | Install specific skill |
| `/learn trending` | Show trending skills |
| `/learn list` | Show installed skills |
| `/learn update` | Check for updates |
| `/learn scan <path>` | Security scan a skill |

## Security

**Two-layer security model:**

1. **Registry-side**: All skills pre-scanned at publish time with pattern detection (command injection, data exfiltration, prompt injection, credential harvesting, obfuscation)
2. **Client-side**: Score displayed before install; skills below 70 blocked, 70-89 require acknowledgment

| Score | Action |
|-------|--------|
| 90-100 | SAFE — install proceeds |
| 70-89 | REVIEW — requires acknowledgment |
| <70 | BLOCKED — installation refused |

## Links

- **Marketplace**: https://agentskill.sh
- **Source**: https://github.com/agentskill-sh/learn
- **Report Issues**: https://github.com/agentskill-sh/learn/issues
