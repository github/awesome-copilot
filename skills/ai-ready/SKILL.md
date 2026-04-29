---
name: ai-ready
description: Make any repo AI-ready — analyzes your codebase and generates AGENTS.md, copilot-instructions.md, CI workflows, issue templates, and more. Mines your PR review patterns and creates files customized to your stack. USE THIS SKILL when the user asks to "make this repo ai-ready", "set up AI config", or "prepare this repo for AI contributions".
---

# AI Ready — Install & Run

This skill installs the full [ai-ready](https://github.com/johnpapa/ai-ready) skill by [John Papa](https://github.com/johnpapa) and runs it on the current repository.

*Why?*: The full ai-ready skill is ~600 lines of detailed instructions that evolve frequently. This wrapper keeps it discoverable here while the source of truth stays in [johnpapa/ai-ready](https://github.com/johnpapa/ai-ready) — always up to date.

## Steps

1. Download the skill to the user's personal skills directory:
   ```bash
   mkdir -p ~/.copilot/skills/ai-ready
   curl -fsSL https://raw.githubusercontent.com/johnpapa/ai-ready/main/skills/ai-ready/SKILL.md \
     -o ~/.copilot/skills/ai-ready/SKILL.md
   ```
2. Tell the user: _"I've installed the ai-ready skill. Reloading skills now."_
3. Reload skills so the newly installed skill is available: `/skills reload`
4. Run the ai-ready skill on the current repository. It will analyze the codebase, score AI-readiness, and propose changes.
