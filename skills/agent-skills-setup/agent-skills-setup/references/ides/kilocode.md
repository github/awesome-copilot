# kilocode

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.kilo/skills` |
| Project skills | `.kilo/skills` |
| Rules | `AGENTS.md` |
| MCP | `~/.config/kilo/kilo.jsonc` |
| Project MCP | `.kilo/kilo.jsonc` |
| Project config | `.kilo/kilo.jsonc` |
| Config | `~/.config/kilo/kilo.jsonc` |

<!-- END GENERATED: ide-paths.json summary -->
- MCP is JSONC `mcp` with distinct local/remote shapes; do not flatten it into another client schema.
- Skills use documented locations, with compatibility directories kept separate.
- Portable `AGENTS.md` remains the mapper default. Native custom instructions are configured as arrays that can reference `.kilo/rules/*.md`; preserve those scopes manually.
- Workflows/commands use `.kilo/commands/` and `~/.config/kilo/commands/`. Remote skill paths, agents, and config fields remain manual.

Sources: [Skills](https://kilo.ai/docs/customize/skills), [MCP](https://kilo.ai/docs/automate/mcp/using-in-kilo-code), [rules](https://kilo.ai/docs/customize/custom-rules), [instructions](https://kilo.ai/docs/customize/custom-instructions), [workflows](https://kilo.ai/docs/customize/workflows).
