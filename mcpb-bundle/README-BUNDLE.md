# Awesome Copilot MCPB Bundle

This is a portable MCP (Model Context Protocol) bundle that packages the entire awesome-copilot repository content into a single installable file for use with Claude Desktop, Claude Code, or any MCP-compatible client.

## What's Included

The bundle contains:
- **129 Instructions** - Coding guidelines and best practices across multiple languages and frameworks
- **115 Prompts** - Reusable prompt templates for common development tasks
- **117 Chat Modes** - Specialized agent configurations for different development scenarios
- **26 Agents** - Pre-configured AI agents for specific workflows
- **Documentation** - Full README files for all content types

**Built:** November 24, 2025  
**Source Branch:** [main](https://github.com/microsoft/awesome-github-copilot)

## Installation

### VS Code / VS Code Insiders (One-Click)

**VS Code:**
```
vscode://ms-vscode-remote.remote-containers/installExtension?extensionId=file:///github.com/microsoft/awesome-github-copilot/mcpb-bundle/awesome-copilot-1.0.0.mcpb
```

**VS Code Insiders:**
```
vscode-insiders://ms-vscode-remote.remote-containers/installExtension?extensionId=file:///github.com/microsoft/awesome-github-copilot/mcpb-bundle/awesome-copilot-1.0.0.mcpb
```

Or manually add to your VS Code settings (`.vscode/settings.json` or User Settings):

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": "path/to/mcpb-bundle/instructions/**/*.instructions.md"
    }
  ],
  "mcp.servers": {
    "awesome-copilot": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcpb-bundle/build/server/index.js"
      ]
    }
  }
}
```

### Claude Desktop

1. **Download** the `awesome-copilot-1.0.0.mcpb` file
2. **Copy** to your Claude Desktop MCP directory:
   ```powershell
   # Windows
   Copy-Item "awesome-copilot-1.0.0.mcpb" -Destination "$env:APPDATA\Claude\mcpb\"
   ```
   ```bash
   # macOS/Linux
   cp awesome-copilot-1.0.0.mcpb ~/Library/Application\ Support/Claude/mcpb/
   ```
3. **Restart** Claude Desktop
4. The server should auto-install and be available immediately

### Manual MCP Configuration

If auto-installation doesn't work, add to your MCP config file:

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "awesome-copilot": {
      "command": "node",
      "args": [
        "/path/to/extracted/bundle/server/index.js"
      ]
    }
  }
}
```

## Available Tools

Once installed, you'll have access to these MCP tools:

### 1. `search_instructions`
Search across all instructions, prompts, chatmodes, and agents by keywords.

**Example usage:**
```
Search for PCF instructions
```

### 2. `load_instruction`
Load the full content of a specific file.

**Example usage:**
```
Load the PCF overview instruction
```

### 3. `list_files`
List all available files for a specific content type.

**Example usage:**
```
List all available instructions
```

## Available Prompt Template

### `search_prompt`
Template for searching content with keyword arguments.

## Testing the Bundle

After installation, try these commands in Claude:

1. **Test search:** "Search for PCF instructions"
2. **Test load:** "Show me the PCF best practices instruction"
3. **Test list:** "List all available prompts"

## Bundle Structure

```
mcpb-bundle/
├── awesome-copilot-1.0.0.mcpb    # The distributable bundle (6.2MB)
├── build/                         # Build artifacts (for rebuilding)
│   ├── server/                    # MCP server implementation
│   ├── node_modules/              # Dependencies
│   ├── manifest.json              # MCPB manifest
│   ├── package.json               # Node.js project config
│   └── package-lock.json          # Dependency lock file
├── instructions/                  # All instruction files
├── prompts/                       # All prompt templates
├── chatmodes/                     # All chat mode configs
├── agents/                        # All agent definitions
├── docs/                          # Documentation and READMEs
└── README-BUNDLE.md               # This file
```

## Rebuilding the Bundle

If you need to rebuild the bundle (after updates):

```powershell
cd build
npm install
mcpb pack
```

This will regenerate `awesome-copilot-1.0.0.mcpb` from the current content.

## Version

- **Version:** 1.0.0
- **Package Size:** 6.2MB (compressed)
- **Unpacked Size:** 20.9MB
- **Total Files:** 3,727
- **Node.js Requirement:** >=18.0.0

## Source Repository

This bundle is built from the [awesome-github-copilot](https://github.com/microsoft/awesome-github-copilot) repository.

## MCP Protocol

This bundle implements the Model Context Protocol (MCP) specification:
- **Protocol:** stdio transport
- **Communication:** JSON-RPC 2.0
- **SDK:** @modelcontextprotocol/sdk v1.0.0

## Troubleshooting

### Bundle not appearing after restart
- Check that the file is in the correct `mcpb` directory
- Verify Claude Desktop version supports MCPB format
- Try manual configuration in `claude_desktop_config.json`

### Server not responding
- Check Node.js is installed (v18 or higher)
- Verify the server path in configuration is correct
- Check Claude Desktop logs for error messages

### Search returns no results
- Ensure content directories (instructions, prompts, etc.) are included in bundle
- Try more specific keywords
- Use `list_files` to see available content

## Support

For issues or questions:
- Open an issue on the [GitHub repository](https://github.com/microsoft/awesome-github-copilot/issues)
- Check the main awesome-copilot README for contribution guidelines

## License

See the LICENSE file in the main repository.
