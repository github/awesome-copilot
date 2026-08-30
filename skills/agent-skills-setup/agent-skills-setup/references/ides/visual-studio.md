# visual-studio (Visual Studio + GitHub Copilot; Windows only)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.copilot/skills` |
| Project skills | `.github/skills` |
| Rules | `.github/copilot-instructions.md` |
| MCP | windows: `%USERPROFILE%\.mcp.json` |
| Project MCP | `.mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Agent Skills require Visual Studio 2026 18.5+. The documented project locations are `.github/skills/`, `.claude/skills/`, and `.agents/skills/`; the mapper uses `.github/skills/`. Personal equivalents are also discovered, with `~/.copilot/skills/` used here.
- MCP uses `servers`. User MCP is `%USERPROFILE%\.mcp.json`; repository MCP is `.mcp.json`. Visual Studio also discovers `.vs/mcp.json`, `.vscode/mcp.json`, and `.cursor/mcp.json`, but these compatibility inputs are manual to avoid duplicate or user-local state.
- Rules use `.github/copilot-instructions.md`; custom agents use `.github/agents/*.agent.md`. Agents, alternate skill paths, scoped instructions, tool approvals, and IDE-managed trust remain manual.
- Visual Studio is Windows-only. Do not confuse this ID with `vscode` or the `copilot` CLI target.

Sources: [Skills](https://learn.microsoft.com/en-us/visualstudio/ide/copilot-agent-skills?view=visualstudio), [MCP](https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers?view=visualstudio), [agents](https://learn.microsoft.com/en-us/visualstudio/ide/copilot-specialized-agents?view=visualstudio), [instructions](https://learn.microsoft.com/en-us/visualstudio/ide/copilot-chat-context?view=visualstudio).
