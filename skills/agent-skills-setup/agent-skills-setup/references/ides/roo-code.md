# roo-code (archived 2026-05)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.roo/skills` |
| Project skills | `.roo/skills` |
| Rules | `.roorules` |
| MCP | Not mapped |
| Project MCP | `.roo/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Project MCP is `.roo/mcp.json` with JSON `mcpServers`; use explicit project scope. Global MCP is extension-managed and manual—never infer a VS Code/Cline `globalStorage` path.
- The mapper uses Roo-specific Skills paths. `.roorules` is its one-file rules target; scoped/global rule collections, commands, modes, and memory require manual review.
- `.roo/` mixes those surfaces, so whole-project migration is unsupported.
- Roo Code was archived on 2026-05-15. Treat Cline as the verified replacement; do not infer a ZooCode or Kilo Code migration path.

Sources: [announcement](https://roocodeinc.github.io/Roo-Code/), [Skills](https://roocodeinc.github.io/Roo-Code/features/skills/), [MCP](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/), [archive](https://github.com/RooCodeInc/Roo-Code).
