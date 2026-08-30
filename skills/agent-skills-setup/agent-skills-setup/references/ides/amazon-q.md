# amazon-q

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | Not mapped |
| Rules | `.amazonq/rules` |
| MCP | `~/.aws/amazonq/default.json` |
| Project MCP | `.amazonq/default.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Resolve a profile before acting. Q in the IDE documents user `~/.aws/amazonq/default.json`, project `.amazonq/default.json`, and legacy `mcp.json` compatibility. `~/.aws/amazonq/agents/` belongs to custom-agent definitions and is not an alternative IDE MCP destination.
- Q CLI and custom agents have their own agent/profile directories. Their prompts, tools, permissions, hooks, and MCP state are not interchangeable with the narrow IDE `mcpServers` subobject.
- `.amazonq/` and `~/.aws/amazonq/` are mixed namespaces. Only the selected profile's explicit surface may be read or written; never flatten the whole tree.
- The v2 profiles are `amazon-q/ide`, `amazon-q/cli`, and `amazon-q/custom-agent`.

Sources: [IDE MCP](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/mcp-ide.html), [project rules](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html), [MCP scopes](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/qdev-mcp.html).
