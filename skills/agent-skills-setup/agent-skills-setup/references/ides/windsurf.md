# windsurf

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.codeium/windsurf/skills` |
| Project skills | `.windsurf/skills` |
| Rules | `.windsurf/rules` |
| MCP | `~/.codeium/windsurf/mcp_config.json` |
| Project MCP | Not mapped |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- MCP JSON uses `mcpServers`; remote entries use exactly one documented `serverUrl` or `url`, never a guessed VS Code `type`/transport.
- Current project Rules use `.windsurf/rules/*.md`; `AGENTS.md` is hierarchy-aware plain Markdown. `.devin/rules/` belongs to a different Devin surface and must not be used as Windsurf's canonical target.
- Global Rules use `~/.codeium/windsurf/memories/global_rules.md`. Generated memories share the surrounding runtime namespace but are not portable; never copy them as rules without review.
- Workflows and mixed `.windsurf/` state remain separate. No project MCP or whole-project mapping is claimed.

Sources: [Skills](https://docs.windsurf.com/windsurf/cascade/skills), [MCP](https://docs.windsurf.com/windsurf/cascade/mcp), [Rules and memories](https://docs.windsurf.com/windsurf/cascade/memories), [AGENTS.md](https://docs.windsurf.com/windsurf/cascade/agents-md).
