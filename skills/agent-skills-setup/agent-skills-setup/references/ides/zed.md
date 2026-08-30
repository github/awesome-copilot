# zed

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.agents/skills` |
| Project skills | `.agents/skills` |
| Rules | `AGENTS.md` |
| MCP | `~/.config/zed/settings.json` |
| Project MCP | `.zed/settings.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- MCP JSON uses `context_servers`; project settings are manual. Local and remote entries have distinct fields; no generic whole-settings conversion exists.
- Project instructions use first-match compatibility discovery across files including `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and tool-specific rules; personal instructions use `~/.config/zed/AGENTS.md`. The mapper chooses portable `AGENTS.md` and does not merge competing files.
- Agent Skills use documented paths. Legacy Rules were replaced by Skills plus Instructions; prompts are server-provided, not a prompt-template directory.
- Agent servers, config, and GUI PATH are product-specific; use absolute executable paths when necessary.

Sources: [instructions](https://zed.dev/docs/ai/instructions), [Skills](https://zed.dev/docs/ai/skills), [MCP](https://zed.dev/docs/ai/mcp).
