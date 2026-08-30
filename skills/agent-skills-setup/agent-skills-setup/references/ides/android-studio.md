# android-studio (Gemini in Android Studio)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.agents/skills` |
| Project skills | `.agents/skills` |
| Rules | `AGENTS.md` |
| MCP | Not mapped |
| Project MCP | Not mapped |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Agent Skills require Android Studio Quail 1+. Project and personal skills support `.agents/skills/` and `.android-studio/skills/`; the mapper chooses portable `.agents/skills/`. Legacy `.skills/` and `agent/skills/` are deprecated migration sources and remain manual.
- Agent files use hierarchical `AGENTS.md`; `GEMINI.md` takes precedence in the same directory. IDE-native rules in `.idea/project.prompts.xml` are not portable and remain manual.
- MCP is configured through **Settings → Tools → AI → MCP Servers** and stored in a product/version-managed `mcp.json` with `mcpServers`. Do not guess its path or copy UI trust state. Current support excludes stdio, MCP resources, and MCP prompt templates.

Sources: [Skills](https://developer.android.com/studio/gemini/skills), [agent files](https://developer.android.com/studio/gemini/agent-files), [MCP](https://developer.android.com/studio/gemini/add-mcp-server).
