---
name: ai-ready
description: 'Make any repo AI-ready — analyzes your codebase and generates AGENTS.md, copilot-instructions.md, CI workflows, issue templates, and more. Mines your PR review patterns and creates files customized to your stack. USE THIS SKILL when the user asks to "make this repo ai-ready", "set up AI config", or "prepare this repo for AI contributions".'
---

# AI Ready

This skill helps the user install the latest [ai-ready](https://github.com/johnpapa/ai-ready) skill by [John Papa](https://github.com/johnpapa).

*Why?*: The full ai-ready skill is ~600 lines of detailed instructions that evolve frequently. This wrapper keeps it discoverable here while the source of truth stays in [johnpapa/ai-ready](https://github.com/johnpapa/ai-ready) — always up to date.

## Steps

1. Tell the user to add the skill by running this command inside Copilot CLI:

   ```
   /skills add johnpapa/ai-ready
   ```

   This downloads the latest version of the skill to their personal skills directory. Re-running the command updates to the latest version.

2. Remind the user to review the skill before loading it. They can inspect it with:
   ```bash
   head -20 ~/.copilot/skills/ai-ready/SKILL.md
   ```
3. After the user confirms they've reviewed and installed it, tell them to reload skills with `/skills reload` and then say `make this repo ai-ready`.
4. Do **not** run the command on the user's behalf. The user must run it themselves.
