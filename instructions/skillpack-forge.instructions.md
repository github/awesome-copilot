---
description: 'Use Skillpack Forge to create, compile, verify, and package portable AI coding-agent context from skillpack.yaml across AGENTS.md, CLAUDE.md, GitHub Copilot instructions, Cursor rules, Claude/Codex Skills, MCP servers, and MCPB bundles.'
applyTo: '**'
---

# Skillpack Forge Agent Context Workflow

Use these instructions when a repository needs consistent AI coding-agent context across GitHub Copilot, AGENTS.md-aware agents, Claude, Codex, Cursor, and MCP clients.

## When to Use

- The user asks to create or maintain `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, Cursor rules, or agent skill files.
- A repo has several hand-maintained agent instruction files that may drift.
- The user wants a portable `skillpack.yaml` manifest as one source of truth.
- The user wants a local read-only MCP server or `.mcpb` bundle for repo context.

## Core Workflow

1. Inspect the current repo first:
   - Check for existing `skillpack.yaml` or `skillpack.json`.
   - Check for existing `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc`, `.claude/skills/*/SKILL.md`, `.codex/skills/*/SKILL.md`, and `.mcp/manifest.json`.
   - Preserve existing user-authored files unless the user explicitly approves overwriting them.

2. Choose the right entry point:
   - New repo context: `npx skillpack-forge@latest init .`
   - Existing agent files: `npx skillpack-forge@latest import .`
   - Automation starter: `npx skillpack-forge@latest new <template> .`
   - Available templates: `automation`, `browser-automation`, `playwright-browser`, `docs-automation`, `release-automation`, `ops-automation`, `data-automation`, `data-pipeline`.

3. Preview before writing generated files:
   - Run `npx skillpack-forge@latest compile . --dry-run`.
   - Review the planned outputs with the user when existing files would be overwritten.

4. Compile and verify:
   - Run `npx skillpack-forge@latest compile .`.
   - Run `npx skillpack-forge@latest doctor .`.
   - Run `npx skillpack-forge@latest diff .`.
   - Run `npx skillpack-forge@latest check . --strict` for CI-ready validation.

5. Package MCP context when needed:
   - If the manifest includes the `mcp` target, compile creates `.mcp/manifest.json`, `.mcp/skillpack-server.mjs`, and `.mcp/README.md`.
   - Pack the local MCP server with `npx skillpack-forge@latest mcpb .`.
   - Use `npx -y @anthropic-ai/mcpb validate .mcp` for an additional official schema check.

## Manifest Guidance

- Keep `skillpack.yaml` concise and repo-specific.
- Include only commands that actually exist in the repository.
- Prefer `check` or `test` commands that can run in CI.
- Use `targets` to express where generated context should go:
  - `agents` for `AGENTS.md`
  - `claude-md` for `CLAUDE.md`
  - `claude` for `.claude/skills/<skill>/SKILL.md`
  - `codex` for `.codex/skills/<skill>/SKILL.md`
  - `cursor` for `.cursor/rules/<project>.mdc`
  - `copilot` for `.github/copilot-instructions.md`
  - `mcp` for a local read-only MCP server and MCPB packaging

## Safety Rules

- Do not use `--force` until you have checked whether a manifest already exists and the user wants it replaced.
- Do not edit generated files by hand when `skillpack.yaml` should be updated instead.
- Do not claim generated files are fresh until `diff` or `check --strict` passes.
- Do not include secrets, private URLs, credentials, or local-only paths in `skillpack.yaml`.
- Keep generated MCP servers read-only unless the user explicitly asks for a different design.

## CI Pattern

Use the GitHub Action after committing generated files:

```yaml
- uses: guorunjie/skillpack-forge@v1
  with:
    path: .
```

This keeps generated agent instructions synchronized with `skillpack.yaml` in pull requests.
