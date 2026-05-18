---
name: ai-ready
description: 'Make any repo AI-ready — analyzes your codebase and generates AGENTS.md, copilot-instructions.md, CI workflows, issue templates, and more. Mines your PR review patterns and creates files customized to your stack. USE THIS SKILL when the user asks to "make this repo ai-ready", "set up AI config", or "prepare this repo for AI contributions".'
---

# AI Ready

This skill helps the user install the latest [ai-ready](https://github.com/johnpapa/ai-ready) skill by [John Papa](https://github.com/johnpapa).

*Why?*: The full ai-ready skill is a 12-step procedure with progressive disclosure via reference files. This wrapper keeps it discoverable here while the source of truth stays in [johnpapa/ai-ready](https://github.com/johnpapa/ai-ready) — always up to date.

## Steps

1. Tell the user to install the skill by running this command inside Copilot CLI:

   ```
   copilot plugin install johnpapa/ai-ready
   ```

   This installs the latest version of the skill. To update later, run `copilot plugin update ai-ready`.

2. After the user confirms they've installed it, tell them to say `make this repo ai-ready`.
3. Do **not** run the analysis on the user's behalf. The user must invoke the skill themselves.
