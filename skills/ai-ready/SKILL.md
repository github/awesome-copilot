---
name: ai-ready
description: 'Make any repo AI-ready — analyzes your codebase and generates AGENTS.md, copilot-instructions.md, CI workflows, issue templates, and more. Mines your PR review patterns and creates files customized to your stack. USE THIS SKILL when the user asks to "make this repo ai-ready", "set up AI config", or "prepare this repo for AI contributions".'
---

# AI Ready

This skill helps the user install the latest [ai-ready](https://github.com/johnpapa/ai-ready) `SKILL.md` by [John Papa](https://github.com/johnpapa) into their personal skills directory.

*Why?*: The full ai-ready skill is ~600 lines of detailed instructions that evolve frequently. This wrapper keeps it discoverable here while the source of truth stays in [johnpapa/ai-ready](https://github.com/johnpapa/ai-ready) — always up to date.

## Steps

1. Tell the user to download the latest `SKILL.md` to their personal skills directory by running one of these commands in their terminal. This will overwrite any existing local copy.

   **bash / zsh**
   ```bash
   mkdir -p ~/.copilot/skills/ai-ready
   curl -fsSL https://raw.githubusercontent.com/johnpapa/ai-ready/main/skills/ai-ready/SKILL.md \
     -o ~/.copilot/skills/ai-ready/SKILL.md
   ```

   **PowerShell**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$HOME/.copilot/skills/ai-ready" | Out-Null
   Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/johnpapa/ai-ready/main/skills/ai-ready/SKILL.md" -OutFile "$HOME/.copilot/skills/ai-ready/SKILL.md"
   ```

   For reproducible behavior, the user can replace `main` in the URL with a specific tag or commit SHA.
2. Suggest the user review the downloaded skill before loading it to confirm it contains expected instructions:
   ```bash
   head -20 ~/.copilot/skills/ai-ready/SKILL.md
   ```
3. After the user confirms they've installed it, tell them to reload skills with `/skills reload` and then say `make this repo ai-ready`.
4. Do **not** run the install command on the user's behalf. The user must run it themselves.
