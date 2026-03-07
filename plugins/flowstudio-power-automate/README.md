# FlowStudio Power Automate Plugin

Complete toolkit for managing Power Automate cloud flows via the FlowStudio MCP server. Connect, debug, and build/deploy flows using AI agents.

Requires a FlowStudio MCP subscription — see https://flowstudio.app

## Installation

```bash
# Using Copilot CLI
copilot plugin install flowstudio-power-automate@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `flowstudio-power-automate-mcp` | Core connection setup, tool discovery, and CRUD operations for Power Automate cloud flows via the FlowStudio MCP server. |
| `flowstudio-power-automate-debug` | Step-by-step diagnostic workflow for investigating and fixing failing Power Automate cloud flow runs. |
| `flowstudio-power-automate-build` | Build, scaffold, and deploy Power Automate cloud flows from natural language descriptions with bundled action pattern templates. |

## Getting Started

1. Install the plugin
2. Subscribe to FlowStudio MCP at https://flowstudio.app
3. Configure your MCP connection with the JWT from your workspace
4. Ask Copilot to list your flows, debug a failure, or build a new flow

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
