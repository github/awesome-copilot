# kiro

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.kiro/skills` |
| Project skills | `.kiro/skills` |
| Rules | `.kiro/steering` |
| MCP | `~/.kiro/settings/mcp.json` |
| Project MCP | `.kiro/settings/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- MCP JSON uses `mcpServers`; migrate only reviewed endpoint metadata and re-authorize OAuth in Kiro.
- Project steering uses `.kiro/steering/`; global steering uses `~/.kiro/steering/`, and root `AGENTS.md` is also recognized. Preserve inclusion frontmatter instead of flattening files. Skills use documented directories.
- IDE custom agents use project/user `.kiro/agents/*.md` and may embed MCP. CLI agents use a different JSON schema; reconstruct manually and never convert between them automatically.

Sources: [Skills](https://kiro.dev/docs/skills/), [MCP](https://kiro.dev/docs/mcp/configuration/), [steering](https://kiro.dev/docs/steering/), [custom agents](https://kiro.dev/docs/custom-agents/), [hooks](https://kiro.dev/docs/hooks/).
