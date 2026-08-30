# forge (ForgeCode)

This ID is ForgeCode, not an unrelated product named Forge.

- Project config is `.forge.toml`; user config is `~/.forge/.forge.toml`.
- MCP uses `.mcp.json` with `mcpServers` and a native `forge mcp import` flow.
- Skills resolve in precedence order from `.forge/skills/`, `~/.agents/skills/`, `~/forge/skills/`, then built-ins.
- `AGENTS.md`, commands, agents, and permissions are distinct surfaces. Skills can be copied after validation; instructions use IR; agents and permissions require manual templates.

Sources: [Skills](https://forgecode.dev/docs/skills/), [MCP](https://forgecode.dev/docs/mcp-integration/), [configuration](https://forgecode.dev/docs/forgecode-config/).
