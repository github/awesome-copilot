# Penpot MCP Server Setup & Troubleshooting

Complete guide for installing, configuring, and troubleshooting the Penpot MCP Server.

## Architecture Overview

The Penpot MCP integration requires **three components** working together:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│   MCP Server    │◀───▶│  Penpot Plugin  │
│ (VS Code/Claude)│     │  (port 4401)    │     │ (in browser)    │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 │    WebSocket          │
                                 │    (port 4402)        │
                                 └───────────────────────┘
```

1. **MCP Server** - Exposes tools to your AI client (HTTP on port 4401)
2. **Plugin Server** - Serves the Penpot plugin files (HTTP on port 4400)
3. **Penpot MCP Plugin** - Runs inside Penpot browser, executes design commands

## Prerequisites

- **Node.js v22+** - [Download](https://nodejs.org/)
- **Git** - For cloning the repository
- **Modern browser** - Chrome, Firefox, or Chromium-based browser

Verify Node.js installation:
```bash
node --version  # Should be v22.x or higher
npm --version
npx --version
```

## Installation

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/penpot/penpot-mcp.git
cd penpot-mcp

# Install dependencies
npm install
```

### Step 2: Build and Start Servers

```bash
# Build all components and start servers
npm run bootstrap
```

This command:

- Installs dependencies for all components
- Builds the MCP server and plugin
- Starts both servers (MCP on 4401, Plugin on 4400)

**Expected output:**

```txt
MCP Server listening on http://localhost:4401
Plugin server listening on http://localhost:4400
WebSocket server listening on port 4402
```

### Step 3: Load Plugin in Penpot

1. Open [Penpot](https://design.penpot.app/) in your browser
2. Open or create a design file
3. Go to **Plugins** menu (or press the plugins icon)
4. Click **Load plugin from URL**
5. Enter: `http://localhost:4400/manifest.json`
6. The plugin UI will appear - click **"Connect to MCP server"**
7. Status should change to **"Connected to MCP server"**

> **Important**: Keep the plugin UI open while using MCP tools. Closing it disconnects the server.

### Step 4: Configure Your MCP Client

#### VS Code with GitHub Copilot

Add to your VS Code `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "penpot": {
        "url": "http://localhost:4401/sse"
      }
    }
  }
}
```

Or use the HTTP endpoint:

```json
{
  "mcp": {
    "servers": {
      "penpot": {
        "url": "http://localhost:4401/mcp"
      }
    }
  }
}
```

#### Claude Desktop

Claude Desktop requires the `mcp-remote` proxy (stdio-only transport):

1. Install the proxy:

   ```bash
   npm install -g mcp-remote
   ```

2. Edit Claude Desktop config:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

3. Add the Penpot server:

   ```json
   {
     "mcpServers": {
       "penpot": {
         "command": "npx",
         "args": ["-y", "mcp-remote", "http://localhost:4401/sse", "--allow-http"]
       }
     }
   }
   ```

4. **Fully quit** Claude Desktop (File → Quit, not just close window) and restart

#### Claude Code (CLI)

```bash
claude mcp add penpot -t http http://localhost:4401/mcp
```

## Troubleshooting

### Connection Issues

#### "Plugin cannot connect to MCP server"

**Symptoms**: Plugin shows "Not connected" even after clicking Connect

**Solutions**:

1. Verify servers are running:
   ```bash
   # Check if ports are in use
   lsof -i :4401  # MCP server
   lsof -i :4402  # WebSocket
   lsof -i :4400  # Plugin server
   ```

2. Restart the servers:

   ```bash
   # In the penpot-mcp directory
   npm run start:all
   ```

3. Check browser console (F12) for WebSocket errors

#### Browser Blocks Local Connection

**Symptoms**: Browser refuses to connect to localhost from Penpot

**Cause**: Chromium 142+ enforces Private Network Access (PNA) restrictions

**Solutions**:

1. **Chrome/Chromium**: When prompted, allow access to local network
2. **Brave**: Disable Shield for the Penpot website:
   - Click the Brave Shield icon in address bar
   - Toggle Shield off for this site
3. **Try Firefox**: Firefox doesn't enforce these restrictions as strictly

#### "WebSocket connection failed"

**Solutions**:

1. Check firewall settings - allow ports 4400, 4401, 4402
2. Disable VPN if active
3. Check for conflicting applications using the same ports

### MCP Client Issues

#### Tools Not Appearing in VS Code/Claude

1. **Verify endpoint**:

   ```bash
   # Test the SSE endpoint
   curl http://localhost:4401/sse
   
   # Test the MCP endpoint
   curl http://localhost:4401/mcp
   ```

2. **Check configuration syntax** - JSON must be valid
3. **Restart the MCP client** completely
4. **Check MCP server logs**:

   ```bash
   # Logs are in mcp-server/logs/
   tail -f mcp-server/logs/mcp-server.log
   ```

#### "Tool execution timed out"

**Cause**: Plugin disconnected or operation took too long

**Solutions**:

1. Ensure plugin UI is still open in Penpot
2. Verify plugin shows "Connected" status
3. Try reconnecting: click Disconnect then Connect in plugin

### Plugin Issues

#### "Plugin failed to load"

1. Verify plugin server is running on port 4400
2. Try accessing `http://localhost:4400/manifest.json` directly in browser
3. Clear browser cache and reload Penpot
4. Remove and re-add the plugin

#### "Cannot find penpot object"

**Cause**: Plugin not properly initialized or design file not open

**Solutions**:

1. Make sure you have a design file open (not just the dashboard)
2. Wait a few seconds after opening file before connecting
3. Refresh Penpot and reload the plugin

### Server Issues

#### Port Already in Use

```bash
# Find process using the port
lsof -i :4401

# Kill the process if needed
kill -9 <PID>
```

Or configure different ports via environment variables:
```bash
PENPOT_MCP_SERVER_PORT=4501 npm run start:all
```

#### Server Crashes on Startup

1. Check Node.js version (must be v22+)
2. Delete `node_modules` and reinstall:

   ```bash
   rm -rf node_modules
   npm install
   npm run bootstrap
   ```

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PENPOT_MCP_SERVER_PORT` | 4401 | HTTP/SSE server port |
| `PENPOT_MCP_WEBSOCKET_PORT` | 4402 | WebSocket server port |
| `PENPOT_MCP_SERVER_LISTEN_ADDRESS` | localhost | Server bind address |
| `PENPOT_MCP_LOG_LEVEL` | info | Log level (trace/debug/info/warn/error) |
| `PENPOT_MCP_LOG_DIR` | logs | Log file directory |
| `PENPOT_MCP_REMOTE_MODE` | false | Enable remote mode (disables file system access) |

### Example: Custom Configuration

```bash
# Run on different ports with debug logging
PENPOT_MCP_SERVER_PORT=5000 \
PENPOT_MCP_WEBSOCKET_PORT=5001 \
PENPOT_MCP_LOG_LEVEL=debug \
npm run start:all
```

## Verifying the Setup

Run this checklist to confirm everything works:

1. **Servers Running**:
   ```bash
   curl -s http://localhost:4401/sse | head -1
   # Should return SSE stream headers
   ```

2. **Plugin Connected**: Plugin UI shows "Connected to MCP server"

3. **Tools Available**: In your MCP client, verify these tools appear:
   - `mcp__penpot__execute_code`
   - `mcp__penpot__export_shape`
   - `mcp__penpot__import_image`
   - `mcp__penpot__penpot_api_info`

4. **Test Execution**: Ask your AI assistant to run a simple command:
   > "Use Penpot to get the current page name"

## Getting Help

- **GitHub Issues**: [penpot/penpot-mcp/issues](https://github.com/penpot/penpot-mcp/issues)
- **GitHub Discussions**: [penpot/penpot-mcp/discussions](https://github.com/penpot/penpot-mcp/discussions)
- **Penpot Community**: [community.penpot.app](https://community.penpot.app/)
