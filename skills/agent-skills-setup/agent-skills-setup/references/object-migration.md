# File-backed object migration

Read with [migration-safety.md](migration-safety.md) for non-MCP objects.

| Object | Handling |
| --- | --- |
| Skills | Preflight all source text, then copy credential-free named directories as units. |
| Rules / Instructions | Parse and emit the selected product's native frontmatter; never flatten conditional activation into an unconditional file. |
| Prompts / Commands | Use the target's documented format; review Gemini TOML and UI/enterprise libraries. |
| Workflows | Translate deterministic pipeline steps; review complex orchestrations for target engine support. |
| Config / project | Manual-only; never copy whole config or opaque trees. |
| Agents / Droids | Recreate reviewed content against target permission, event, and command schemas (generated with `draft-disabled` for safety). |
| Hooks | Map lifecycle event triggers; shell execution scripts are generated in `draft-disabled` state. |
| Plugins / Extensions | Non-executable; binaries and package installations are flagged `manual-rebuild` or `draft-disabled`. |
| Sessions / Chat logs | Strictly non-transferable; runtime conversation logs and state are excluded from migration (handoff uses strict whitelist serialization). |
| Memory / Context | Do not copy private/generated state (e.g. `~/.cline/data` generated memory); rewrite selected context as rules. |
| Bundles (ACB) | Package reviewed objects into self-contained, secret-redacted, offline portable archives (`.acb`) under strict allowlists, sub-object field isolation, and replayable dual-side plan binding (`--plan-in`). |

Treat living or generated files, including Replit `replit.md`, as manual conversation state rather than overwrite targets. When no compatible target format is documented, describe reconstruction instead of an unvalidated copy. There is no generic embedded-config exception: a sub-object is automatic only when Registry v2 names a reviewed source and target adapter for the exact profile/version.

The reviewed instruction adapters use native fields for Augment (`type`), Cline/Claude (`paths`), Cursor and Continue (`alwaysApply`/`globs`), Kiro (`inclusion`/`fileMatchPattern`), Copilot (`applyTo`), Trae/Qoder (`alwaysApply`), and Windsurf (`trigger`). Unknown frontmatter is reported as loss. A conversion becomes manual when the target cannot preserve `always`, glob, model-decided, or manual activation semantics.
