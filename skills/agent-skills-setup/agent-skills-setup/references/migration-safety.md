# Migration safety and conflicts

Use before a migration can write. A generic request to migrate or transfer authorizes planning only. Inspect only the explicitly named source, target, objects, scope, and workspace; if any is missing, stop before filesystem inspection. Save the profile-aware plan and show its exact file list/diff or cloud rebuild actions and target paths. Obtain separate explicit user approval before `apply` or `rollback`; `--yes` records that approval but does not replace it. Apply only the reviewed plan: its checksum binds the Registry digest, adapter versions, resolved surfaces, source/target hashes, and Git provenance. Any drift requires a new review. Inventory canonical and compatibility paths; if more than one alternative exists, stop for explicit selection, and if multiple precedence files exist, do not pretend they are one document. Before copying a Skill directory or converting instructions, scan the source and reject likely literal credentials. Reject links outside a Skill root, exclude `.env` and `.env.*`, and preserve the source.

Apply stages and validates every output before the first target mutation, snapshots every destination, then commits the saved plan as one operation. A failure in any later write or in manifest creation restores every earlier target in reverse order; no partial success is reported. Plan and manifest artifact paths must not overlap the Registry or any selected source/target surface. The manifest is written only after all target hashes are recorded.

## Device handoff and Agent Context Bundle (ACB) safety

- **Strict Allowlist Snapshotting (P0-2)**: `snapshot` captures only requested scopes and valid portable objects (skills, instructions, mcp). Policies like `forbidden-regenerate`, `never-migrate`, `source-only`, and objects like `generated_memory`, `session`, `chat`, `runtime`, `database`, `trust`, `approval`, `oauth_state` are strictly blocked before disk read.
- **Sub-Object Field-Level Whitelist**: For `config-subobject` surfaces (e.g. `settings.json` storing `mcpServers` in Augment, Gemini, VS Code, Qoder), snapshot extracts, validates, and serializes ONLY the targeted sub-object slice. Host configuration sibling keys (API keys, provider tokens, telemetry, UI preferences, proxy configs, organizational policies) are never copied into the bundle.
- **Dual-Side Plan Architecture (P0-1)**: `restore` builds a dual-side plan with the verified bundle as `source_registry` and the local host as `target_registry`. Real destination paths, pre-apply states (`exists` -> `replace` vs `create`), semantic diffs, and workspace are evaluated on the destination device and locked into `plan_sha256` before apply.
- **Replayable Restore Plans & TOCTOU State Locks**: Plans saved with `restore --plan-out <plan.json>` can be replayed and applied via `restore --plan-in <plan.json> --yes` (or `apply <plan.json> --bundle <bundle.acb> --yes`). Replay verifies bundle integrity, plan checksum, registry checksum, and enforces strict state locks (`expected_source_state` and `expected_target_state`) against destination surfaces.
- **Authoritative Bundle Precedence (P0-3)**: The bundle is always the single source of truth during `restore`. The presence of a local source IDE on the destination device cannot override or bypass bundle content.
- **Strict Handoff Whitelist (P0-4)**: Handoff data serializes only explicitly whitelisted fields (`reviewed_summary`, `git_branch`, `selected_files`, `patch`). Raw logs, conversation histories, tokens, and machine paths are dropped.
- **Closed-World Integrity Verification**: Bundles must pass `bundle-verify` against `checksums.json` and deep secret/binary scans before restore.
- **Plan-Only Review & Execution Safety**: `restore <bundle.acb>` (or `--plan-only`) builds and reviews the plan with zero disk writes. Applying requires explicit `--yes`. Extraction into a review tree (`--restore-root <dir>`) is opt-in.

## Surface and runtime boundaries

- **Plugins & Extensions**: Binary packages and executable plugins are not auto-installed or executed; they are recorded as `draft-disabled` or `manual-rebuild`.
- **Sessions & Runtime State**: Interactive chat logs, runtime tokens, OAuth tokens, and approval grants are strictly non-migratable and excluded.
- **Probes & Diagnostics**: `detect` and `doctor` run local filesystem and binary checks only; network access is forbidden.

Use [mcp-transport.md](mcp-transport.md) for remote transport, OAuth, or protocol state. The script blanks literal credentials and may translate an exact documented environment reference; mixed or complex expressions need manual reconstruction. MCP target symlinks fail before conversion. Redaction cleanup accepts only the exact target artifacts, while copied-skill cleanup is contained within the canonical target copy root.

| Strategy | Existing selected object |
| --- | --- |
| `skip` | Leave unchanged. |
| `backup` (default) | Save `.bak.<timestamp>`, then merge. |
| `overwrite` | Replace only the selected object, without backup. |

For shared MCP configuration, preserve unrelated settings; `overwrite` replaces only the selected server map. Do not invent renamed fallback entries.

The explicit `legacy` subcommand supports lookup and zero-write dry-runs only. Calls beginning with an implicit legacy flag are rejected. Any `legacy --yes` write fails before the compatibility engine runs; create and apply a saved profile-aware plan instead.

Restate source, target, objects, scope, workspace, and boundaries. After review, use `apply <plan.json> --yes --json`; report checksums, paths, parse result, source integrity, target evidence, backup, and manual follow-ups.
