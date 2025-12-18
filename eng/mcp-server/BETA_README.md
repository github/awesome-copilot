# Awesome Copilot MCP Server - Beta Release

## Installation

Install the beta version of the MCP server:

```bash
npm install @github/awesome-copilot-mcp@beta
```

## VS Code Configuration

Add the following to your VS Code MCP settings:

```json
{
  "mcp": {
    "servers": {
      "awesome-copilot": {
        "command": "npx",
        "args": ["awesome-copilot-mcp"],
        "env": {
          "NODE_ENV": "production"
        }
      }
    }
  }
}
```

## Features

This beta version includes:

- **Search Tools**: Find agents, prompts, and instructions
- **Load Tools**: Load specific resources by path
- **GitHub Integration**: Direct access to awesome-copilot repository content
- **Collection Support**: Browse curated collections of resources

## Available Tools

### Search Tools
- `search_agents` - Search for GitHub Copilot agents
- `search_prompts` - Search for task-specific prompts
- `search_instructions` - Search for coding instructions
- `search_collections` - Search for curated collections

### Load Tools
- `load_resource` - Load a specific resource by path
- `list_collection` - List all resources in a collection

## Testing

To test the beta version:

1. Install the package
2. Configure VS Code MCP settings
3. Restart VS Code
4. Use GitHub Copilot Chat to access awesome-copilot resources

## Feedback

Please report any issues or feedback to:
https://github.com/github/awesome-copilot/issues

## Version
Current beta: `1.0.0-beta.1`