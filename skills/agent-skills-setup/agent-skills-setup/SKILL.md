---
name: agent-skills-setup
license: MIT
compatibility: Requires local Bash, Python 3, environment lookup, and filesystem reads. Writes only approved migration targets; no network access.
metadata:
  version: "0.9.2"
  permissions.shell: "bundled offline Bash/Python scripts plus local read-only detection commands"
  permissions.env: "read environment variables to resolve product paths"
  permissions.file_read: "named source products, workspace tree, bundled references"
  permissions.file_write: "reviewed plan targets after explicit --yes consent"
  permissions.network: "denied"
description: >-
  Use when a user wants to migrate, back up, restore, compare, or move
  AI-coding-agent context across Cursor, Claude Code, Codex, Cline,
  Copilot, Windsurf, Gemini CLI, or another supported profile, including
  switching computers. Handles reviewed Skills, instructions/rules, and
  MCP with secret redaction, preview, verification, and rollback.
---

# AI IDE Context Migration

## Permissions

- `shell`: bundled offline scripts plus local read-only detection commands (git, version, mdfind). No downloads or binary installations.
- `env`: path resolution only; credential-looking values are redacted, never copied or printed.
- `file_read`: named source products, workspace tree, bundled `references/`; no probing of unlisted products.
- `file_write`: reviewed plan targets after `--yes` consent; state under `<workspace>/.agent-context-migration/`.
- `network`: denied. Every subcommand is offline; no downloads, telemetry, or remote calls.

## Capabilities and authorization

- `detect`, `doctor`, `inventory`, `plan`, `snapshot`, and `bundle-verify` read only named products and workspace; network access is forbidden.
- A generic migration request authorizes planning only; separate explicit user approval (`--yes`) or explicit action verbs (apply, restore, 迁到) under `--apply-safe` authorize write.
- Save the plan, review its diff/rebuild manifest, and apply that exact file. ACB `restore` constructs a dual-side plan binding bundle sources to destination targets, supporting replayable plans (`--plan-in`) with strict TOCTOU state guards.

## Route

1. Resolve both product profiles through [ide-registry.md](references/ide-registry.md) / [registry-v2.json](references/registry-v2.json).
2. Read only [references/ides/<source>.md](references/ides/) and [references/ides/<target>.md](references/ides/).
3. Load reference by need:
   - Before preview or apply: [references/migration-safety.md](references/migration-safety.md)
   - MCP objects: [references/mcp-migration.md](references/mcp-migration.md)
   - Other file objects: [references/object-migration.md](references/object-migration.md)
   - Approved apply / proof: [references/verification.md](references/verification.md)

## Execution & Scope

- High-level: `bash scripts/smart-ide-migration.sh migrate --source <src> --target <dst> --workspace . --objects all-portable --yes`
- Step-by-step: `plan --output <plan.json>` -> `apply <plan.json> --manifest <manifest.json> --yes` -> `verify --manifest <manifest.json>` -> `rollback --manifest <manifest.json> --yes`.
- Device handoff (ACB): `snapshot` captures portable skills/instructions/MCP with atomic staging and 1:1 manifest bindings; `bundle-verify` re-checks checksums, bindings, secrets, and signatures; `restore [--plan-only | --plan-in <plan> --yes]` reviews then executes the dual-side plan. `--all-installed` bulk mode requires review and `--yes`.
- Cross-platform: `%APPDATA%` / `%USERPROFILE%` / `$APPDATA` resolution, platform detection, per-surface path isolation (remote hosts experimental). `detect` / `doctor` inspect installation state offline.
- The explicit `legacy` subcommand is read-only lookup compatibility (`--print-path`, `--dry-run`); legacy writes are disabled and enforced by the Python wrapper.
- Object-type scope (exhaustive — apply writes nothing outside it):
  - Auto-migratable (`ready`): `skills`, `instructions`, `mcp`; opaque plugin package copy where both profiles declare it.
  - Draft-only, never auto-written: `prompts`, `commands`, `agents`, `hooks`, `workflows`. Executable surfaces have no staging writer; replayed plans marking them eligible fail closed.
  - Opt-in session transfer: `handoff` needs `--objects handoff` AND `--include-session`; only reviewed summary, git branch, relative selected files, and an explicit patch travel. Raw conversation, tokens, session state, machine paths, logs discarded.
  - Never migrated: trust state, generated memory, cloud knowledge, approvals, chat history.
- Sensitive shared settings files are read only for the named migration's authorized MCP subobject; trust sections (`never-migrate`) and sibling settings never enter plans or bundles; strict secret redaction before output. See [references/mcp-migration.md](references/mcp-migration.md).
- Claude Desktop app MCP in **Settings → Extensions** and **Settings → Connectors** is UI-managed; do not infer or rewrite it from legacy JSON.
