# CLI Reference — Complete Command Reference

The Aspire CLI (`aspire`) is the primary interface for creating, running, and publishing distributed applications. It is cross-platform and installed standalone (not coupled to the .NET CLI, though `dotnet` commands also work).

**Tested against:** Aspire CLI 13.1.0

---

## Installation

```bash
# Linux / macOS
curl -sSL https://aspire.dev/install.sh | bash

# Windows PowerShell
irm https://aspire.dev/install.ps1 | iex

# Verify
aspire --version

# Update the CLI itself
aspire update --self
```

---

## Global Options

All commands support these options:

| Option                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `-d, --debug`         | Enable debug logging to the console            |
| `--non-interactive`   | Disable all interactive prompts and spinners   |
| `--wait-for-debugger` | Wait for a debugger to attach before executing |
| `-?, -h, --help`      | Show help and usage information                |
| `--version`           | Show version information                       |

---

## Command Reference

### `aspire new`

Create a new project from a template.

```bash
aspire new [<template>] [options]

# Options:
#   -n, --name <name>        Project name
#   -o, --output <dir>       Output directory
#   -s, --source <source>    NuGet source for templates
#   -v, --version <version>  Version of templates to use
#   --channel <channel>      Channel (stable, daily)

# Examples:
aspire new aspire-starter
aspire new aspire-starter -n MyApp -o ./my-app
aspire new aspire-ts-cs-starter
aspire new aspire-py-starter
aspire new aspire-apphost-singlefile
```

Available templates:

- `aspire-starter` — ASP.NET Core/Blazor starter + AppHost + tests
- `aspire-ts-cs-starter` — ASP.NET Core/React + AppHost
- `aspire-py-starter` — FastAPI/React + AppHost
- `aspire-apphost-singlefile` — Empty single-file AppHost

### `aspire init`

Initialize Aspire in an existing project or solution.

```bash
aspire init [options]

# Options:
#   -s, --source <source>    NuGet source for templates
#   -v, --version <version>  Version of templates to use
#   --channel <channel>      Channel (stable, daily)

# Example:
cd my-existing-solution
aspire init
```

Adds AppHost and ServiceDefaults projects to an existing solution. Interactive prompts guide you through selecting which projects to orchestrate.

### `aspire run`

Start all resources locally using the DCP (Developer Control Plane).

```bash
aspire run [options] [-- <additional arguments>]

# Options:
#   --project <path>       Path to AppHost project file

# Examples:
aspire run
aspire run --project ./src/MyApp.AppHost
```

Behavior:

1. Builds the AppHost project
2. Starts the DCP engine
3. Creates resources in dependency order (DAG)
4. Waits for health checks on gated resources
5. Opens the dashboard in the default browser
6. Streams logs to the terminal

Press `Ctrl+C` to gracefully stop all resources.

### `aspire add`

Add a hosting integration to the AppHost.

```bash
aspire add [<integration>] [options]

# Options:
#   --project <path>         Target project file
#   -v, --version <version>  Version of integration to add
#   -s, --source <source>    NuGet source for integration

# Examples:
aspire add redis
aspire add postgresql
aspire add mongodb
```

### `aspire publish` (Preview)

Generate deployment manifests from the AppHost resource model.

```bash
aspire publish [options] [-- <additional arguments>]

# Options:
#   --project <path>                   Path to AppHost project file
#   -o, --output-path <path>           Output directory (default: ./aspire-output)
#   --log-level <level>                Log level (trace, debug, information, warning, error, critical)
#   -e, --environment <env>            Environment (default: Production)
#   --include-exception-details        Include stack traces in pipeline logs

# Examples:
aspire publish
aspire publish --output-path ./deploy
aspire publish -e Staging
```

### `aspire config`

Manage Aspire configuration settings.

```bash
aspire config <subcommand>

# Subcommands:
#   get <key>              Get a configuration value
#   set <key> <value>      Set a configuration value
#   list                   List all configuration values
#   delete <key>           Delete a configuration value

# Examples:
aspire config list
aspire config set telemetry.enabled false
aspire config get telemetry.enabled
aspire config delete telemetry.enabled
```

### `aspire cache`

Manage disk cache for CLI operations.

```bash
aspire cache <subcommand>

# Subcommands:
#   clear                  Clear all cache entries

# Example:
aspire cache clear
```

### `aspire deploy` (Preview)

Deploy the contents of an Aspire apphost to its defined deployment targets.

```bash
aspire deploy [options] [-- <additional arguments>]

# Options:
#   --project <path>                   Path to AppHost project file
#   -o, --output-path <path>           Output path for deployment artifacts
#   --log-level <level>                Log level (trace, debug, information, warning, error, critical)
#   -e, --environment <env>            Environment (default: Production)
#   --include-exception-details        Include stack traces in pipeline logs
#   --clear-cache                      Clear deployment cache for current environment

# Example:
aspire deploy --project ./src/MyApp.AppHost
```

### `aspire do` (Preview)

Execute a specific pipeline step and its dependencies.

```bash
aspire do <step> [options] [-- <additional arguments>]

# Options:
#   --project <path>                   Path to AppHost project file
#   -o, --output-path <path>           Output path for artifacts
#   --log-level <level>                Log level (trace, debug, information, warning, error, critical)
#   -e, --environment <env>            Environment (default: Production)
#   --include-exception-details        Include stack traces in pipeline logs

# Example:
aspire do build-images --project ./src/MyApp.AppHost
```

### `aspire update` (Preview)

Update integrations in the Aspire project, or update the CLI itself.

```bash
aspire update [options]

# Options:
#   --project <path>       Path to AppHost project file
#   --self                 Update the Aspire CLI itself to the latest version
#   --channel <channel>    Channel to update to (stable, daily)

# Examples:
aspire update                          # Update project integrations
aspire update --self                   # Update the CLI itself
aspire update --self --channel daily   # Update CLI to daily build
```

### `aspire mcp`

Manage the MCP (Model Context Protocol) server.

```bash
aspire mcp <subcommand>

# Subcommands:
#   init    Initialize MCP server configuration for detected agent environments
#   start   Start the MCP server
```

#### `aspire mcp init`

```bash
aspire mcp init

# Interactive — detects your AI environment and creates config files.
# Supported environments:
# - VS Code (GitHub Copilot)
# - Copilot CLI
# - Claude Code
# - OpenCode
```

Generates the appropriate configuration file for your detected AI tool.
See [MCP Server](mcp-server.md) for details.

#### `aspire mcp start`

```bash
aspire mcp start

# Starts the MCP server using STDIO transport.
# This is typically invoked by your AI tool, not run manually.
```

---

## Commands That Do NOT Exist

The following commands are **not valid** in Aspire CLI 13.1. Use alternatives:

| Invalid Command | Alternative                                                          |
| --------------- | -------------------------------------------------------------------- |
| `aspire build`  | Use `dotnet build ./AppHost`                                         |
| `aspire test`   | Use `dotnet test ./Tests`                                            |
| `aspire dev`    | Use `aspire run` (includes file watching)                            |
| `aspire list`   | Use `aspire new --help` for templates, `aspire add` for integrations |

---

## .NET CLI equivalents

The `dotnet` CLI can perform some Aspire tasks:

| Aspire CLI                  | .NET CLI Equivalent              |
| --------------------------- | -------------------------------- |
| `aspire new aspire-starter` | `dotnet new aspire-starter`      |
| `aspire run`                | `dotnet run --project ./AppHost` |
| N/A                         | `dotnet build ./AppHost`         |
| N/A                         | `dotnet test ./Tests`            |

The Aspire CLI adds value with `publish`, `deploy`, `add`, `mcp`, `config`, `cache`, `do`, and `update` — commands that have no direct `dotnet` equivalent.
