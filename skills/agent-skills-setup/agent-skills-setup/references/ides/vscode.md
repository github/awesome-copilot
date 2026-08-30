# vscode (VS Code + GitHub Copilot IDE; not the `copilot` CLI target)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.copilot/skills` |
| Project skills | `.github/skills` |
| Rules | `.github/copilot-instructions.md` |
| MCP | Not mapped |
| Project MCP | `.vscode/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Workspace MCP is `.vscode/mcp.json` with `servers`. User MCP is active-Profile/UI managed: use **MCP: Open User Configuration**, never guess a default, Insiders, VSCodium, or relocated path.
- Keep explicit `http`/legacy `sse` types, re-authorize OAuth, and fail closed on foreign schemas. This differs from CLI `mcpServers`.
- Project Skills may also live in `.agents/skills/` or `.claude/skills/`; personal aliases are `~/.agents/skills/` and `~/.claude/skills/`. The mapper uses GitHub Copilot's primary locations to avoid duplicate-name precedence surprises.
- Rules include `.github/copilot-instructions.md`, scoped instruction files, `AGENTS.md`, and `CLAUDE.md`; project prompts are `.github/prompts/*.prompt.md`. Agents, hooks, and preview plugins are supported but schema-sensitive and remain manual.
- The `copilot` mapper key is GitHub Copilot CLI, not this VS Code surface.

Sources: [MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers), [instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions), [Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [prompts](https://code.visualstudio.com/docs/agent-customization/prompt-files), [plugins](https://code.visualstudio.com/docs/agent-customization/agent-plugins), [profiles](https://code.visualstudio.com/docs/configure/profiles).
