# antigravity (Antigravity IDE / shared 2.0 surface)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.gemini/config/skills` |
| Project skills | `.agents/skills` |
| Rules | `.agents/rules` |
| MCP | `~/.gemini/config/mcp_config.json` |
| Project MCP | `.agents/mcp_config.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->

**Registry status:** `unverified/manual-reference`. These paths are discovery
evidence only; Antigravity is not an automatic source or target until its
IDE/CLI and version-specific schemas have independent adapters and fixtures.

- MCP uses JSON `mcpServers`; remote endpoints use `serverUrl`, not `url`. The global file is shared by Antigravity surfaces; workspace MCP remains manual.
- Global Skills default to the generated path. `ANTIGRAVITY_SKILLS_DIR` overrides it; otherwise preserve a legacy-only tree and never merge legacy/current trees implicitly. `.agent/` remains legacy compatibility.
- Workspace rules use `.agents/rules/`; do not invent `.agents/AGENTS.md`. No official installation-detection or stable workflow path exists.
- Hooks use `.agents/hooks.json` and `~/.gemini/config/hooks.json`; plugins use `.agents/plugins/<name>` and `~/.gemini/config/plugins/<name>`. They are supported but schema/trust-sensitive, so reconstruct manually. Workflows remain UI-managed. Antigravity CLI is separate.

Sources: [IDE Skills](https://antigravity.google/docs/ide/skills), [shared Skills](https://antigravity.google/docs/skills?app=antigravity-ide), [MCP](https://antigravity.google/docs/mcp), [plugins](https://antigravity.google/docs/ide/plugins), [hooks](https://antigravity.google/docs/hooks).
