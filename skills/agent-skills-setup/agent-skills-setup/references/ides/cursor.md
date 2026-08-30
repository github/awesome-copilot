# cursor

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.cursor/skills` |
| Project skills | `.cursor/skills` |
| Rules | `.cursor/rules` |
| MCP | `~/.cursor/mcp.json` |
| Project MCP | `.cursor/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- MCP JSON uses `mcpServers`; retain an explicit documented stdio, legacy-SSE, or Streamable HTTP transport. A bare URL is not enough, and `${env:NAME}` is Cursor-specific.
- `.cursor/rules/*.mdc` uses frontmatter; root `.cursorrules` is legacy and `AGENTS.md` is also recognized. `.agents/skills/` is a supported compatibility path, not the mapper's canonical target.
- `.cursor/commands/*.md`, `.cursor/hooks.json`, user hooks, and plugins are supported product surfaces but remain manual because their schemas and trust state are not generic migration objects. Memories and `.cursorignore` are also manual.
- No stable installation-detection path is used by this mapper.

Sources: [Skills](https://cursor.com/docs/context/skills), [rules](https://cursor.com/docs/rules), [hooks](https://cursor.com/docs/hooks), [plugins](https://cursor.com/docs/reference/plugins), [MCP](https://cursor.com/docs/context/mcp).
