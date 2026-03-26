---
name: capacitor-mcp
description: Model Context Protocol (MCP) tools for Capacitor mobile development. Covers Ionic/Capacitor component APIs, plugin documentation, CLI commands, and AI-assisted development via MCP. Use this skill when users want to integrate AI agents with Ionic/Capacitor tooling.
---

# Capacitor MCP Tools

Guide to using Model Context Protocol (MCP) for Ionic and Capacitor mobile development automation.

## When to Use This Skill

- User wants to automate Ionic/Capacitor development
- User asks about MCP integration
- User wants AI-assisted component/plugin discovery
- User needs programmatic CLI command execution
- User wants access to Ionic components and Capacitor plugins within AI chat

## What is MCP?

MCP (Model Context Protocol) is an open standard for connecting AI models to external tools and data sources. For Capacitor development, MCP enables:

- Access to Ionic component definitions and APIs
- Capacitor plugin documentation lookup
- Automated CLI command execution (build, sync, run, etc.)
- Project configuration management
- Real-time component demos and examples

## Setting Up MCP for Capacitor

### 1. Install Awesome Ionic MCP Server

The **awesome-ionic-mcp** server is a comprehensive tool that provides access to:
- Ionic Framework component APIs
- Official Capacitor plugins
- Capawesome plugins (free and insider)
- Capacitor Community plugins
- CapGo plugins
- 28 Ionic/Capacitor CLI commands

#### Claude Desktop

Add to `claude_desktop_config.json` (accessible via Claude > Settings > Developer):

```json
{
  "mcpServers": {
    "awesome-ionic-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-ionic-mcp@latest"]
    }
  }
}
```

#### Cline

Add to `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "awesome-ionic-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-ionic-mcp@latest"],
      "disabled": false
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json` (project-specific) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "awesome-ionic-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-ionic-mcp@latest"]
    }
  }
}
```

### 2. Optional: GitHub Token for Rate Limiting

The server makes ~160+ GitHub API calls during initialization to fetch plugin data. Without authentication, GitHub limits you to 60 requests/hour. With a token, this increases to 5,000 requests/hour.

Add `GITHUB_TOKEN` to your MCP configuration:

```json
{
  "mcpServers": {
    "awesome-ionic-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-ionic-mcp@latest"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

Get a token from GitHub Settings → Developer settings → Personal access tokens. No special permissions needed for public repos.

## Available MCP Tools

### Ionic Component Tools

```typescript
// Get Ionic component definition
get_ionic_component_definition({ tag: "ion-button" })
// Returns TypeScript definition from @ionic/core

// List all Ionic components
get_all_ionic_components()
// Returns: ["ion-button", "ion-card", "ion-input", ...]

// Get component API documentation
get_component_api({ tag: "ion-button" })
// Returns API docs from ionicframework.com

// Get component demo code
get_component_demo({ tag: "ion-modal" })
// Returns demo code from docs-demo.ionic.io
```

### Capacitor Plugin Tools

```typescript
// Get official Capacitor plugin API
get_official_plugin_api({ plugin: "Camera" })
// Returns documentation from capacitorjs.com

// List all official plugins
get_all_official_plugins()
// Returns: ["Camera", "Filesystem", "Geolocation", ...]

// Search all available Capacitor plugins
get_all_capacitor_plugins()
// Returns superlist from all plugin publishers

// Get Capawesome plugin documentation
get_plugin_api({ plugin: "capacitor-firebase" })

// List Capawesome plugins
get_all_free_plugins() // Free plugins
get_all_insider_plugins() // Insider/paid plugins

// Get CapGo plugin documentation
get_capgo_plugin_api({ plugin: "native-biometric" })
get_all_capgo_plugins()

// Get Capacitor Community plugin docs
get_capacitor_community_plugin_api({ plugin: "http" })
get_all_capacitor_community_plugins()
```

### Ionic CLI Commands

All commands accept a `project_directory` parameter (defaults to current directory).

#### Project Information

```typescript
// Get comprehensive project info
ionic_info({ format: "json" })

// Get configuration value
ionic_config_get({ key: "name" })

// Set configuration value
ionic_config_set({ key: "name", value: "MyApp" })

// Unset configuration value
ionic_config_unset({ key: "telemetry" })
```

#### Project Setup

```typescript
// Create new Ionic project
ionic_start({
  name: "MyApp",
  template: "tabs", // blank, list, sidemenu, tabs
  type: "react", // angular, react, vue
  capacitor: true
})

// List available templates
ionic_start_list()

// Initialize existing project
ionic_init({ name: "MyApp", type: "react" })

// Repair project dependencies
ionic_repair()
```

#### Build & Serve

```typescript
// Build web assets
ionic_build({
  project_directory: "./my-app",
  prod: true,
  engine: "browser" // or "cordova"
})

// Start development server (manual launch recommended)
// Note: Server runs in foreground, manual launch preferred
ionic_serve({
  project_directory: "./my-app",
  port: 8100,
  lab: false
})
```

#### Code Generation

```typescript
// Generate page
ionic_generate({
  type: "page",
  name: "home",
  project_directory: "./my-app"
})

// Generate component
ionic_generate({
  type: "component",
  name: "user-card"
})

// Generate service
ionic_generate({
  type: "service",
  name: "auth"
})

// Other types: directive, guard, pipe, class, interface, module
```

#### Integrations

```typescript
// List available integrations
integrations_list()

// Enable integration (e.g., Capacitor)
integrations_enable({ integration: "capacitor" })

// Disable integration
integrations_disable({ integration: "cordova" })
```

### Capacitor CLI Commands

#### Project Management

```typescript
// Check Capacitor setup
capacitor_doctor({ platform: "ios" })

// List installed plugins
capacitor_list_plugins()

// Initialize Capacitor
capacitor_init({
  name: "MyApp",
  id: "com.example.app",
  web_dir: "dist"
})

// Add platform
capacitor_add({ platform: "ios" })
capacitor_add({ platform: "android" })

// Migrate to latest version
capacitor_migrate()
```

#### Build & Sync

```typescript
// Sync web assets and dependencies
capacitor_sync({ platform: "ios" })

// Copy web assets only
capacitor_copy({ platform: "android" })

// Update native dependencies
capacitor_update({ platform: "ios" })

// Build native release
capacitor_build({
  platform: "ios",
  scheme: "App",
  configuration: "Release"
})
```

#### Run & Deploy

```typescript
// Run on device/emulator
capacitor_run({
  platform: "ios",
  target: "iPhone 15 Pro"
})

// Open native IDE
capacitor_open({ platform: "ios" }) // Opens Xcode
capacitor_open({ platform: "android" }) // Opens Android Studio
```

## Common Workflows

### Create New Project

```typescript
// 1. Create Ionic project
ionic_start({
  name: "MyApp",
  template: "tabs",
  type: "react",
  capacitor: true
})

// 2. Add iOS platform
capacitor_add({
  project_directory: "./MyApp",
  platform: "ios"
})

// 3. Build and sync
ionic_build({
  project_directory: "./MyApp",
  prod: true
})
capacitor_sync({
  project_directory: "./MyApp",
  platform: "ios"
})
```

### Check Project Health

```typescript
// Get system info
ionic_info({ format: "json" })

// Check Capacitor setup
capacitor_doctor({ platform: "ios" })

// List installed plugins
capacitor_list_plugins()
```

### Generate Code

```typescript
// Generate page with routing
ionic_generate({ type: "page", name: "profile" })

// Generate reusable component
ionic_generate({ type: "component", name: "user-avatar" })

// Generate service
ionic_generate({ type: "service", name: "data" })
```

## AI-Assisted Development Benefits

With awesome-ionic-mcp, AI assistants can:

1. **Discover Components**: Ask "What Ionic components can I use for forms?" and get accurate API docs
2. **Find Plugins**: Ask "Is there a Capacitor plugin for biometric authentication?" and get relevant results
3. **Execute Commands**: Request "Build the iOS app" and the CLI command runs automatically
4. **Generate Code**: Get component examples with proper TypeScript definitions
5. **Troubleshoot**: Look up plugin APIs and configuration without leaving the chat

## Example Queries

With the MCP server installed, you can ask your AI assistant:

- "Show me the API for ion-modal component"
- "List all available Capacitor Camera plugin methods"
- "Generate a new page called settings"
- "What Capawesome plugins are available for Firebase?"
- "Build my app for iOS"
- "Sync my Capacitor project"
- "What are all the free CapGo plugins?"

## Technical Details

### Data Sources

The awesome-ionic-mcp server aggregates data from:
- `@ionic/core` package (TypeScript definitions)
- ionicframework.com (component API docs)
- docs-demo.ionic.io (component demos)
- capacitorjs.com (official plugins)
- capawesome.io (Capawesome plugins)
- capacitor-community (community plugins)
- capgo.app (CapGo plugins)

### Requirements

- Node.js (for npx command)
- Optional: GitHub token for avoiding API rate limits
- Ionic/Capacitor project (for CLI commands)

### Browser Automation

The server uses Puppeteer to fetch some documentation. You may see a browser window spawn and close during initialization - this is normal.

## Resources

- awesome-ionic-mcp: https://github.com/Tommertom/awesome-ionic-mcp
- MCP Specification: https://modelcontextprotocol.io
- MCP SDK: https://github.com/modelcontextprotocol/sdk
- Ionic Framework: https://ionicframework.com
- Capacitor: https://capacitorjs.com
- Capawesome Plugins: https://capawesome.io
- CapGo Plugins: https://capgo.app
