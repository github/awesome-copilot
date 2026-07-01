# MCP Client Setup

Connect your AI assistant to Aident via the Model Context Protocol.

## Server URL

Use the Aident Loadout MCP URL:

```text
https://loadout.aident.ai/mcp
```

For non-production deployments, replace the full server URL with that deployment's MCP URL.

## Client Configuration

### Claude Code

Run in your terminal:

```bash
claude mcp add --transport http aident https://loadout.aident.ai/mcp
```

Or add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "aident": {
      "type": "http",
      "url": "https://loadout.aident.ai/mcp"
    }
  }
}
```

### Claude Desktop

Add to your config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "aident": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://loadout.aident.ai/mcp"]
    }
  }
}
```

Or on **Pro/Max/Team/Enterprise** plans: **Settings → Connectors → Add** and enter `https://loadout.aident.ai/mcp`.

### Cursor IDE

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "aident": {
      "url": "https://loadout.aident.ai/mcp"
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "aident": {
      "type": "http",
      "url": "https://loadout.aident.ai/mcp"
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "aident": {
      "serverUrl": "https://loadout.aident.ai/mcp"
    }
  }
}
```

### ChatGPT Desktop

Go to Settings → MCP Servers → Add Server, then enter:

```
https://loadout.aident.ai/mcp
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "aident": {
      "httpUrl": "https://loadout.aident.ai/mcp"
    }
  }
}
```

### Other MCP Clients

Any MCP-compatible client (Codex, Goose, Kiro, OpenCode, Antigravity, Factory, etc.) can connect using the server URL `https://loadout.aident.ai/mcp`. Refer to your client's documentation for where to add MCP server configurations.

## Authentication

On first connection, your MCP client opens a browser window for OAuth sign-in. After authorizing, you're connected automatically. No manual token management needed.

After MCP setup, ask your AI assistant to guide you to https://loadout.aident.ai/integrations to connect the services it should use.

To log out or switch accounts, use the `auth` tool with `{ "action": "logout" }`, then reconnect to sign in with a different account.

## Verify Connection

Ask your AI assistant to use an Aident tool. You should see the focused Aident Loadout tools available. Try:

```
Use Aident to list my available capabilities
```

See [SKILL.md](../SKILL.md) for the full tool list.
