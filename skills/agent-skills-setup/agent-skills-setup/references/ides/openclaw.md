# openclaw (OpenClaw)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.openclaw/skills` |
| Project skills | `skills` |
| Rules | `AGENTS.md` |
| MCP | `~/.openclaw/openclaw.json` |
| Project MCP | Not mapped |
| Project config | Not mapped |
| Config | `~/.openclaw/openclaw.json` |

<!-- END GENERATED: ide-paths.json summary -->

**Registry status:** `unverified/manual-reference`. The workspace/bootstrap and
MCP contract is not approved for automatic conversion; the paths below are
read-only discovery guidance, not write authorization.

- MCP JSON uses `mcp.servers`; local entries use command/args, remote entries require `transport: "streamable-http"`. Do not relabel legacy SSE or add protocol/session headers.
- `AGENTS.md` belongs to the active workspace, selected by `agents.defaults.workspace`; there is no fixed repository project-config root.
- Copy only named Skills and preview rule merges. MCP/config are opt-in; never copy `.openclaw`, runtime/UI state, or `.env*` wholesale.

Sources: [Skills](https://docs.openclaw.ai/tools/skills), [workspace](https://docs.openclaw.ai/concepts/agent-workspace), [MCP](https://docs.openclaw.ai/cli/mcp), [configuration](https://docs.openclaw.ai/gateway/configuration).
