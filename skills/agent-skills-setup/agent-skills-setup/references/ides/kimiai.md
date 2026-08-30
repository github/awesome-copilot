# kimi-code (Moonshot AI)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.kimi-code/skills` |
| Project skills | `.kimi-code/skills` |
| Rules | `AGENTS.md` |
| MCP | `~/.kimi-code/mcp.json` |
| Project MCP | `.kimi-code/mcp.json` |
| Project config | Not mapped |
| Config | `~/.kimi-code/config.toml` |

<!-- END GENERATED: ide-paths.json summary -->
- `KIMI_CODE_HOME` can override the generated home. `~/.kimi-code/` is current; legacy `~/.kimi/` is not.
- MCP JSON uses `mcpServers` across user/project scope. Retain documented remote transport, never equate legacy SSE with Streamable HTTP, and do not copy `mcp-oauth` state.
- `AGENTS.md` and Skills have documented aliases; commands are built-in/plugin based, not a standalone directory.
- Agents, hooks, sessions, plans, credentials, and TOML config are manual. Never copy credentials or runtime state.
