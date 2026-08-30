# augment-code

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.augment/skills` |
| Project skills | `.augment/skills` |
| Rules | `.augment/rules` |
| MCP | `~/.augment/settings.json` |
| Project MCP | `.augment/settings.json` |
| Project config | `.augment/settings.json` |
| Config | `~/.augment/settings.json` |

<!-- END GENERATED: ide-paths.json summary -->
- MCP JSON uses `mcpServers`; retain explicit `http`/legacy `sse`, never infer transport from URL.
- Rules are `~/.augment/rules/` and `.augment/rules/`; user guidelines also use `~/.augment/user-guidelines.md`. Preserve activation frontmatter through the instruction IR.
- Commands and plugins are separate state. Project `.augment/settings.json` and local `.augment/settings.local.json` are independent surfaces; `--scope project` never selects the local override, and `--scope local` never rewrites the shareable project file. Merge only the selected MCP subobject.

Sources: [Skills](https://docs.augmentcode.com/jetbrains/using-augment/skills), [Rules](https://docs.augmentcode.com/cli/rules), [MCP/settings](https://docs.augmentcode.com/cli/config).
