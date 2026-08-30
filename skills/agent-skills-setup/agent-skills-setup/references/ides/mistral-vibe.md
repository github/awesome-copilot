# mistral-vibe

Mistral Vibe loads Skills from custom paths, `.agents/skills/`, `.vibe/skills/`, `~/.vibe/skills/`, and `~/.agents/skills/` in documented precedence. Project `.vibe/config.toml` and user `~/.vibe/config.toml` are separate surfaces; MCP uses the `mcp_servers` TOML subobject.

`AGENTS.md`, custom prompts, Skills, agents, and MCP are separate surfaces. TOML MCP, agents, and executable behavior require native adapters/templates; `.env`, logs, sessions, and credentials are forbidden migration inputs.

Source: [Mistral Vibe](https://github.com/mistralai/mistral-vibe).
