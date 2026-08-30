# cline

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.cline/skills` |
| Project skills | `.cline/skills` |
| Rules | `.cline/rules` |
| MCP | `~/.cline/data/settings/cline_mcp_settings.json` |
| Project MCP | `.cline/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Cline now uses one application data root for IDE, CLI, and SDK profiles. User MCP is `~/.cline/data/settings/cline_mcp_settings.json`; `CLINE_DATA_DIR` replaces `~/.cline/data`, so resolve `settings/cline_mcp_settings.json` beneath it. Do not infer a VS Code `globalStorage` path.
- User rules, hooks, Skills, agents, plugins, and cron live directly under `~/.cline/`; user workflows live under `~/.cline/data/workflows/`. Project counterparts live under `.cline/`. Treat each as a separate semantic surface.
- Skills use `.cline/skills/` and `~/.cline/skills/`. Project instructions use `.cline/rules/`, with legacy `.clinerules` as an alternative; user rules use `~/.cline/rules/`, with `~/Documents/Cline/Rules/` as a compatibility location. If both alternatives exist, require explicit source selection instead of merging them.
- Provider settings, teams, sessions, databases, and generated runtime state are private. Never copy the whole data root or credentials.

Sources: [unified configuration and `CLINE_DATA_DIR`](https://docs.cline.bot/getting-started/config), [rules](https://docs.cline.bot/customization/cline-rules).
