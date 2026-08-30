# zcode (Zhipu AI)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.zcode/skills` |
| Project skills | Not mapped |
| Rules | `AGENTS.md` |
| MCP | `~/.zcode/cli/config.json` |
| Project MCP | `.zcode/config.json` |
| Project config | `.zcode/config.json` |
| Config | `~/.zcode/cli/config.json` |

<!-- END GENERATED: ide-paths.json summary -->
**Registry status:** `unverified/manual-reference`; the generated paths are
read-only discovery hints and ZCode is not an automatic source or target.

- MCP JSON uses `mcp.servers` (also accepts `mcpServers`). Retain explicit transport; do not silently relabel legacy SSE or copy authorization state.
- Rules use `AGENTS.md`, not `CLAUDE.md`; onboarding import does not change that contract.
- Only global Skills are documented. Commands, agents, hooks, memory, and GUI API-key state are manual; ZCode is not CodeGeeX.

Sources: [Skills](https://zcode.z.ai/en/docs/skill), [MCP](https://zcode.z.ai/cn/docs/mcp-services), [agents](https://zcode.z.ai/en/docs/agents), [plugins](https://zcode.z.ai/en/docs/plugin).
