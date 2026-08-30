# opencode

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.config/opencode/skills` |
| Project skills | `.opencode/skills` |
| Rules | `AGENTS.md` |
| MCP | `~/.config/opencode/opencode.json` |
| Project MCP | `opencode.json` |
| Project config | `opencode.json` |
| Config | `~/.config/opencode/opencode.json` |

<!-- END GENERATED: ide-paths.json summary -->
- MCP config is JSON/JSONC. V1 stores servers under `mcp`; V2 under `mcp.servers` and requires `--opencode-version v2`. Do not mix layouts.
- Local servers require target-native command arrays and environment syntax. Preserve only documented remote connection fields, re-authorize OAuth, and never add protocol state.
- Version changes replace only the selected MCP container; unrelated settings and requested backup strategy remain intact.
- `AGENTS.md` is the rules surface. OpenCode also discovers `.agents/skills/` and `.claude/skills/` aliases; keep duplicate-name precedence manual. Skill access can be limited by `permission.skill`.
- Commands use `.opencode/commands/*.md`; agents, hooks, and memory use their own formats/plugins and require manual review.

Sources: [Skills](https://opencode.ai/docs/skills/), [V1 MCP](https://opencode.ai/docs/mcp/), [V2 MCP](https://opencode.ai/v2/docs/mcp-servers), [V1→V2](https://opencode.ai/v2/docs/migrate-v1).
