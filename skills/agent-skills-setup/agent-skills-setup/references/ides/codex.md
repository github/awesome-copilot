# codex

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.agents/skills` |
| Project skills | `.agents/skills` |
| Rules | `AGENTS.md` |
| MCP | `~/.codex/config.toml` |
| Project MCP | `.codex/config.toml` |
| Project config | `.codex/config.toml` |
| Config | `~/.codex/config.toml` |

<!-- END GENERATED: ide-paths.json summary -->
- MCP/config is TOML `mcp_servers`; project config requires trust. JSON `mcpServers` is never converted automatically—rebuild and validate `[mcp_servers.<name>]` manually.
- Codex supports stdio and Streamable HTTP; do not map legacy SSE or add protocol/session headers. Recheck authorization with `codex mcp list`.
- Instructions are a hierarchy, not one `rules` file. User scope chooses `~/.codex/AGENTS.override.md` before `~/.codex/AGENTS.md`; project discovery walks from repository root toward the working directory and chooses `AGENTS.override.md` before `AGENTS.md` at each level. Automatic targets use the ordinary `AGENTS.md` location. If both files already exist at one selected scope, planning stops because composing precedence content requires review.
- `.codex/rules/*.rules`, `.codex/agents/*.toml`, hooks, generated memories, layered config, and trust/managed policy are different objects. Rules/agents need native templates, hooks may only be emitted disabled, generated memory must be regenerated, and trust is never migrated.
- `AGENTS.md` and documented `.agents/skills` paths are portable after validation; admin skills may also live under `/etc/codex/skills`. `[[skills.config]]`, plugin bundles, and `agents/openai.yaml` remain separate policy/UI surfaces.

Sources: [config](https://learn.chatgpt.com/docs/config-file/config-basic.md), [AGENTS hierarchy](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md), [Skills](https://developers.openai.com/codex/skills).
