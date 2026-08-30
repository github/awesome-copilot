# claude (Claude Code)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.claude/skills` |
| Project skills | `.claude/skills` |
| Rules | `CLAUDE.md` |
| MCP | `~/.claude.json` |
| Project MCP | `.mcp.json` |
| Project config | `.claude/settings.json` |
| Config | `~/.claude/settings.json` |

<!-- END GENERATED: ide-paths.json summary -->
- Settings include project `.claude/settings.json` and local `.claude/settings.local.json`; local scopes are manual.
- User/local MCP is `~/.claude.json`; shared project MCP is `.mcp.json`, both with `mcpServers`. The mapper handles user MCP and reports project scope for review.
- Rules include `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/`, and local `CLAUDE.local.md`. Project/user Skills are standard directories.
- `.claude/commands/*.md` is **legacy compatibility**; prefer Skills. Agents and hooks are schema-bound and manual. Do not auto-migrate auto memory from `~/.claude/projects/.../memory/`.

Sources: [settings](https://code.claude.com/docs/en/settings), [MCP](https://code.claude.com/docs/en/mcp), [memory](https://code.claude.com/docs/en/memory), [Skills](https://code.claude.com/docs/en/slash-commands), [subagents](https://code.claude.com/docs/en/sub-agents).
