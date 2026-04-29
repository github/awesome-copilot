---
name: ai-ready
description: Make any repo AI-ready — analyzes your codebase and generates AGENTS.md, copilot-instructions.md, CI workflows, issue templates, and more. Mines your PR review patterns and creates files customized to your stack. USE THIS SKILL when the user asks to "make this repo ai-ready", "set up AI config", or "prepare this repo for AI contributions".
---

# AI Ready

The full ai-ready skill by [John Papa](https://github.com/johnpapa) analyzes any repo and generates the configuration files AI agents need to contribute correctly — AGENTS.md, copilot-instructions.md, CI workflows, issue templates, and more.

The skill is maintained at [johnpapa/ai-ready](https://github.com/johnpapa/ai-ready) and must be installed by the user before use.

## Steps

1. Tell the user to install the skill by running this command in their terminal:
   ```bash
   mkdir -p ~/.copilot/skills/ai-ready && curl -fsSL https://raw.githubusercontent.com/johnpapa/ai-ready/main/skills/ai-ready/SKILL.md -o ~/.copilot/skills/ai-ready/SKILL.md
   ```
2. After the user confirms they've installed it, tell them to reload skills with `/skills reload` and then say `make this repo ai-ready`.
3. Do **not** run the install command on the user's behalf. The user must run it themselves.
