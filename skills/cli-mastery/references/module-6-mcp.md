# Module 6: MCP Integration

## What is MCP?

- Model Context Protocol — a standard for connecting AI to external tools
- Think of it as "USB ports for AI" — plug in any compatible tool
- The GitHub MCP server is **built-in** (search repos, issues, PRs, actions)

## Key commands

| Command | What it does |
|---------|-------------|
| `/mcp` | List connected MCP servers |
| `/mcp add <name> <command>` | Add a new MCP server |

## Popular MCP servers

- `@modelcontextprotocol/server-postgres` — Query PostgreSQL databases
- `@modelcontextprotocol/server-sqlite` — Query SQLite databases
- `@modelcontextprotocol/server-filesystem` — Access local files with permissions
- `@modelcontextprotocol/server-memory` — Persistent knowledge graph
- `@modelcontextprotocol/server-puppeteer` — Browser automation

## Configuration

| Level | File |
|-------|------|
| User | `~/.copilot/mcp-config.json` |
| Project | `.github/mcp-config.json` |

## Config file format

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres", "{{env.DATABASE_URL}}"],
      "env": { "NODE_ENV": "development" }
    }
  }
}
```

## Security best practices

- Never put credentials directly in config files
- Use environment variable references: `{{env.SECRET}}`
- Review MCP server source before using
- Only connect servers you actually need
