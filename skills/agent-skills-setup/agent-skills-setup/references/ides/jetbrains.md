# jetbrains (Junie in JetBrains IDEs; not JetBrains AI Assistant)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.junie/skills` |
| Project skills | `.junie/skills` |
| Rules | `.junie/AGENTS.md` |
| MCP | `~/.junie/mcp/mcp.json` |
| Project MCP | `.junie/mcp/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Junie project Skills override same-named user Skills. `.junie/AGENTS.md` is preferred; root `AGENTS.md` is a fallback. Legacy guidelines and custom project settings are manual inputs.
- MCP JSON uses `mcpServers`. Only local command/args/env conversion is automatic; remote, header, transport, and unknown fields are manual. Do not copy the mixed `.junie/` namespace.
- Junie CLI `/import`, extensions, config, and trust files are separate surfaces. Extension bundles may include skills, MCP, subagents, commands, and guidelines; keep the package intact and manual. IDE-level Project Settings, MCP Settings, and Action Allowlist are UI-managed. Use the separate `jetbrains-ai` ID for AI Assistant.

Sources: [Junie Skills](https://junie.jetbrains.com/docs/agent-skills.html), [IDE plugin](https://junie.jetbrains.com/docs/junie-ide-plugin.html), [MCP settings](https://junie.jetbrains.com/docs/junie-plugin-mcp-settings.html), [CLI config](https://junie.jetbrains.com/docs/junie-cli-configuration.html).
