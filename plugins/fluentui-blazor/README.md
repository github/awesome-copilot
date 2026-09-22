# Fluent UI Blazor Plugin

Everything you need to build Blazor applications with the [Microsoft Fluent UI Blazor](https://www.fluentui-blazor.net) component library, in one install: the `fluentui-blazor` skill for correct usage patterns, and the official Fluent UI Blazor MCP server for live, version-accurate lookup of components, enums, icons, and documentation.

## Installation

```bash
copilot plugin install fluentui-blazor@awesome-copilot
```

## Prerequisites

- The [.NET 10 SDK](https://dotnet.microsoft.com/download) or later must be installed and `dnx` available on your `PATH`.
- The plugin starts its bundled MCP server by running `dnx Microsoft.FluentUI.AspNetCore.McpServer`. The first launch downloads the package from nuget.org.
- The MCP server and the component library are published with the same version number, and the server documents the version it was built against. If your project references a different version, ask the agent to run `check_project_version` — mismatched versions produce documentation that does not match your code.

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `fluentui-blazor` | Guide for using the `Microsoft.FluentUI.AspNetCore.Components` package: mandatory providers, service registration and lifetimes, strongly-typed icons, the `Items`/`OptionText`/`OptionValue` list binding model, the `IDialogService` pattern, toasts, design tokens and theming, and form components. Includes reference files on setup, layout and navigation, data grid, and theming. |

### MCP server

This plugin includes the `fluent-ui-blazor` MCP server configured in [`./mcp.json`](./mcp.json), published on NuGet as [`Microsoft.FluentUI.AspNetCore.McpServer`](https://www.nuget.org/packages/Microsoft.FluentUI.AspNetCore.McpServer). If the .NET SDK is unavailable, MCP startup will fail.

It gives the agent authoritative, version-aware answers instead of guesses:

| Capability | Tools |
|------------|-------|
| Components | `list_components`, `search_components`, `get_component_details`, `list_categories` |
| Enums | `list_enums`, `get_enum_values`, `get_component_enums` |
| Icons | `search_icons`, `list_all_icon_names`, `get_icon_details`, `get_icon_usage` |
| Documentation | `list_documentation`, `search_documentation`, `get_documentation_topic` |
| Versions | `get_version_info`, `check_project_version` |
| v4 → v5 migration | `get_migration_overview`, `get_migration_guide`, `list_component_migrations`, `get_component_migration` |

### Why the skill and the MCP server together

They cover different failure modes, and each is weaker alone:

- The **skill** encodes the patterns that models get wrong from training data — the provider components that fail silently when missing, `ServiceLifetime.Transient` throwing, `FluentSelect` not behaving like `InputSelect`, design tokens needing `OnAfterRenderAsync`. This is judgement, not lookup.
- The **MCP server** supplies the facts that go stale — exact parameter names, enum values, the 142+ component surface, and the icon catalog — looked up in documentation generated at package build time rather than recalled from training data. It serves the library version it was built against, which is why matching versions matters (see Prerequisites).

Installing them as one plugin means a single `copilot plugin install` gets a working Fluent UI Blazor setup, instead of a skill that names components the agent then has to invent parameters for.

## Example prompts

```text
Add a FluentDataGrid of orders with sorting and pagination to my Blazor app.
```

```text
Which Fluent icon should I use for a "save draft" button, and how do I reference it?
```

```text
Check what my project is on today, then walk me through migrating this page from Fluent UI Blazor v4 to v5.
```

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

The bundled MCP server is maintained in [microsoft/fluentui-blazor](https://github.com/microsoft/fluentui-blazor).

## License

MIT
