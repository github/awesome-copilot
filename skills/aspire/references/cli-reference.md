# CLI Reference — Complete Command Reference

The Aspire CLI (`aspire`) is the primary interface for creating, running, and publishing distributed applications. It is cross-platform and installed standalone (not coupled to the .NET CLI, though `dotnet` commands also work).

---

## Installation

```bash
# Linux / macOS
curl -sSL https://aspire.dev/install.sh | bash

# Windows PowerShell
irm https://aspire.dev/install.ps1 | iex

# Verify
aspire --version

# Update to latest
aspire update
```

---

## Command Reference

### `aspire new`

Create a new project from a template.

```bash
aspire new <template-name> [options]

# Options:
#   -o, --output <dir>     Output directory
#   -n, --name <name>      Project name
#   --force                Overwrite existing files

# Examples:
aspire new aspire-starter
aspire new aspire-starter -n MyApp -o ./my-app
aspire new aspire-ts-cs-starter
aspire new aspire-py-starter
aspire new aspire   # empty AppHost only
```

Available templates:
- `aspire-starter` — .NET API + web frontend + AppHost + ServiceDefaults + test project
- `aspire-ts-cs-starter` — TypeScript (Vite) frontend + C# API + AppHost
- `aspire-py-starter` — Python (FastAPI) backend + AppHost
- `aspire` — empty AppHost only

### `aspire init`

Initialize Aspire in an existing project or solution.

```bash
aspire init [options]

# Options:
#   --apphost-project <path>   Existing project to use as AppHost
#   --enlist <projects>        Projects to add to the AppHost

# Example:
cd my-existing-solution
aspire init
```

Adds AppHost and ServiceDefaults projects to an existing solution. Interactive prompts guide you through selecting which projects to orchestrate.

### `aspire run`

Start all resources locally using the DCP (Developer Control Plane).

```bash
aspire run [options]

# Options:
#   --project <path>       Path to AppHost project (default: current dir)
#   --no-dashboard         Skip launching the dashboard
#   --dashboard-port <n>   Override dashboard port (default: auto-assigned)
#   --watch                Enable hot reload / file watching

# Examples:
aspire run
aspire run --project ./src/MyApp.AppHost
aspire run --no-dashboard
aspire run --watch
```

Behavior:
1. Builds the AppHost project
2. Starts the DCP engine
3. Creates resources in dependency order (DAG)
4. Waits for health checks on gated resources
5. Opens the dashboard in the default browser
6. Streams logs to the terminal

Press `Ctrl+C` to gracefully stop all resources.

### `aspire publish`

Generate deployment manifests from the AppHost resource model.

```bash
aspire publish [options]

# Options:
#   -p, --publisher <name>   Target publisher (docker, kubernetes, azure, appservice)
#   --project <path>         Path to AppHost project
#   -o, --output <dir>       Output directory for manifests

# Examples:
aspire publish -p docker
aspire publish -p kubernetes -o ./k8s-manifests
aspire publish -p azure
aspire publish -p appservice
```

Publishers:
- `docker` — Generates `docker-compose.yml` and Dockerfiles
- `kubernetes` — Generates Helm charts / K8s YAML manifests
- `azure` — Generates Bicep templates for Azure Container Apps
- `appservice` — Generates Bicep templates for Azure App Service

### `aspire add`

Add an integration to the AppHost or a service project.

```bash
aspire add <integration> [options]

# Options:
#   --project <path>       Target project (default: current dir)
#   --hosting              Add hosting package only (AppHost side)
#   --client               Add client package only (service side)

# Examples:
aspire add redis
aspire add postgresql --hosting
aspire add mongodb --client
```

### `aspire build`

Build the AppHost project.

```bash
aspire build [options]

# Options:
#   --project <path>       Path to AppHost project
#   -c, --configuration <config>  Build configuration (Debug/Release)
```

### `aspire test`

Run integration tests.

```bash
aspire test [options]

# Options:
#   --project <path>       Path to test project
#   --filter <filter>      Test filter expression

# Examples:
aspire test
aspire test --project ./tests/MyApp.Tests
aspire test --filter "Category=Integration"
```

### `aspire dev`

Start in dev mode with file watching and hot reload.

```bash
aspire dev [options]

# Options:
#   --project <path>       Path to AppHost project
```

### `aspire mcp init`

Configure the MCP (Model Context Protocol) server for AI assistants.

```bash
aspire mcp init [options]

# Interactive — prompts you to select your AI assistant:
# - Claude Code
# - OpenAI Codex CLI
# - GitHub Copilot (VS Code)
# - Cursor
# - VS Code Chat
```

Generates the appropriate configuration file for your selected AI tool (e.g., `.mcp.json`, `claude_desktop_config.json`). See [MCP Server](mcp-server.md) for details.

### `aspire config`

Manage Aspire configuration.

```bash
aspire config [options]

# Subcommands:
#   set <key> <value>      Set a configuration value
#   get <key>              Get a configuration value
#   list                   List all configuration
```

### `aspire list`

List available resources.

```bash
aspire list [options]

# Subcommands:
#   templates              List available project templates
#   integrations           List available integrations
```

### `aspire update`

Update the Aspire CLI to the latest version.

```bash
aspire update
```

### `aspire --version`

Display the installed CLI version.

```bash
aspire --version
```

---

## .NET CLI equivalents

The `dotnet` CLI can also manage Aspire projects:

| Aspire CLI | .NET CLI Equivalent |
|---|---|
| `aspire new aspire-starter` | `dotnet new aspire-starter` |
| `aspire run` | `dotnet run --project ./AppHost` |
| `aspire build` | `dotnet build ./AppHost` |
| `aspire test` | `dotnet test ./Tests` |

The Aspire CLI adds value with `publish`, `add`, `mcp init`, and `config` — commands that have no direct `dotnet` equivalent.
