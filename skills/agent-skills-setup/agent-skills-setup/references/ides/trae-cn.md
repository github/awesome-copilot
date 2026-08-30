# trae-cn

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.trae-cn/skills` |
| Project skills | `.trae/skills` |
| Rules | `.trae/rules` |
| MCP | Not mapped |
| Project MCP | `.trae/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Trae CN is separate from the international build. `.agents/skills/` is optional; `.trae/skills/` wins duplicates, and `.trae/skill-config.json` remains manual.
- Project rules use documented Markdown frontmatter. Project Commands, agents, hooks, and memory have product-specific schemas or scope and remain manual; never copy/run hooks.
- Project MCP is `.trae/mcp.json` with `mcpServers` when enabled. Global MCP is **Settings → MCP Servers**/raw JSON, not a documented portable path.
- **config/argv**: empty/unsupported. Do not infer `~/.trae-cn/argv.json` or settings. `bytedance/trae-agent` is a separate repo-local CLI, not a Trae CN target.
- Do not merge TRAE CLI, Plugin, or Work/Desktop paths into this entry.

Sources: [Skills](https://docs.trae.cn/ide/skills), [Rules](https://docs.trae.cn/ide/rules), [MCP](https://docs.trae.cn/ide/add-mcp-servers), [Commands](https://docs.trae.cn/ide/slash-commands), [Hooks](https://docs.trae.cn/ide_hook-configuration-reference), [Subagents](https://docs.trae.cn/ide_subagents).
