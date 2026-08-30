# jetbrains-ai (JetBrains AI Assistant; not Junie)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | `.agents/skills` |
| Rules | Not mapped |
| MCP | Not mapped |
| Project MCP | Not mapped |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Agent Skills require JetBrains AI Assistant 2026.2+. Project skills use `.agents/skills/`; IDE-level agent storage is version/product-managed and remains manual.
- Project rules use `.aiassistant/rules/*.md`; the directory contains scoped rule files and is not flattened by the single-file rules mapper. User rules are configured in the UI.
- MCP is managed through **Settings → Tools → AI Assistant → Model Context Protocol (MCP)**. Do not infer Junie `.junie/mcp/mcp.json` or copy UI trust/approval state.
- Claude Agent and Codex integration can discover their own native skills/configuration. Preserve the selected agent's ownership instead of merging caches or settings across agents.

Sources: [Skills](https://www.jetbrains.com/help/ai-assistant/agent-skills.html), [project rules](https://www.jetbrains.com/help/ai-assistant/configure-project-rules.html), [MCP](https://www.jetbrains.com/help/ai-assistant/mcp.html).
