# continue

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | Not mapped |
| Rules | `.continue/rules` |
| MCP | `~/.continue/config.yaml` |
| Project MCP | `.continue/mcpServers` |
| Project config | Not mapped |
| Config | `~/.continue/config.yaml` |

<!-- END GENERATED: ide-paths.json summary -->
- Continue uses YAML: `config.yaml` and project block directories are not generic JSON config. `mcpServers` is an array, not a server object map.
- Project rules and prompts use Markdown/YAML frontmatter; no `CONTINUE.md` or Agent Skills directory is documented.
- Config, MCP, rules, and the mixed `.continue/` namespace are diagnostic/manual. Do not convert JSON into YAML or copy the tree.

Sources: [configuration](https://docs.continue.dev/customize/deep-dives/configuration), [MCP](https://docs.continue.dev/customize/deep-dives/mcp), [rules](https://docs.continue.dev/customize/deep-dives/rules), [prompts](https://docs.continue.dev/customize/prompts).
