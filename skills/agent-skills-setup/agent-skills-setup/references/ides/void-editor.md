# void-editor

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | Not mapped |
| Rules | `.voidrules` |
| MCP | `~/.void-editor/mcp.json` |
| Project MCP | `.vscode/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Void's repository was archived on 2026-06-02; treat its store as legacy and never copy the whole directory.
- Void MCP JSON uses `mcpServers`; authenticated/header-bearing remote entries are manual because the archived runtime does not reliably pass headers.
- Inherited VS Code project MCP uses `.vscode/mcp.json` with `servers` and is a separate manual surface. `.voidrules` is root plain-text context; global instructions are UI-managed.
- No portable Skills, whole-config, command, agent, hook, or memory path is documented.

Sources: [repository](https://github.com/voideditor/void), [releases](https://github.com/voideditor/void/releases), [MCP service](https://github.com/voideditor/void/blob/main/src/vs/workbench/contrib/void/common/mcpService.ts).
