# Verification and evidence

Before apply, record the saved plan path and `plan_sha256`; confirm that Registry, adapter, source/target, and Git provenance validation succeeded. After apply, use `--json` and report scope/status, manifest checksum, canonical paths, source SHA-256 before/after, `source_unchanged`, target existence/hash/parse result, backup, and manual follow-up. Run `verify --manifest ...` against the checksummed manifest. Rollback refuses to overwrite a target changed after apply.

Parse success does not prove transport, protocol compatibility, credentials, OAuth, permissions, or connectivity. Check the target's native discovery surface (for example `claude mcp list`, `codex mcp list`, `opencode mcp list`, `copilot mcp list`, or its MCP panel) and consult [ide-registry.md](ide-registry.md). Apply [mcp-transport.md](mcp-transport.md) rather than adding protocol headers manually.
