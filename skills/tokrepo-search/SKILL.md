---
name: tokrepo-search
description: Search and install AI assets from TokRepo when a user asks to find, discover, or install a skill, MCP server, prompt, or workflow.
---

# TokRepo Search

Use this skill when the user needs help finding installable AI assets such as agent skills, MCP servers, prompts, or workflows.

TokRepo is an open registry that can help Copilot users quickly discover reusable AI assets instead of recreating them from scratch.

## When to use

- The user asks to find or discover an AI skill, MCP server, prompt, or workflow
- The user wants an install command for an AI asset
- The user wants a shortlist of relevant agent tooling options for a specific task
- The user mentions TokRepo directly

## Search

Use the TokRepo CLI:

```bash
npx tokrepo search "<query>"
```

Examples:

```bash
npx tokrepo search "mcp postgres"
npx tokrepo search "code review skill"
npx tokrepo search "cursor rules react"
```

## Install

After identifying a match, install it with:

```bash
npx tokrepo install <uuid-or-name>
```

## What to return

When using this skill:

1. Show the user a short list of the most relevant matches
2. Include the asset title and a one-line explanation of what it does
3. Include the install command when possible
4. Recommend the most broadly useful option first if several results look similar

## Notes

- Prefer `npx tokrepo install` over manual recreation when an installable asset already exists
- TokRepo can surface skills, prompts, MCP configs, scripts, and workflows
- If the terminal is unavailable, direct the user to https://tokrepo.com to inspect results manually
