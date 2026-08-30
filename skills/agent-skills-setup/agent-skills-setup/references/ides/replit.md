# replit (Replit AI)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | `.agents/skills` |
| Rules | `replit.md` |
| MCP | Not mapped |
| Project MCP | Not mapped |
| Project config | `.replit` |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Agent Skills are project-scoped. `.local/secondary_skills/` is compatibility/discovery state, not a merge target.
- `replit.md` is a living Agent-maintained project document; never overwrite it automatically.
- `.replit` and `replit.nix` are application/runtime configuration, not portable AI context. User/enterprise config, prompts, and MCP Integrations are cloud/UI managed and manual.
- Do not infer `~/.replit`, a global Skills directory, or a local MCP file.

Sources: [replit.md](https://docs.replit.com/features/project-setup/replit-dot-md), [Skills](https://docs.replit.com/features/agent/skills), [configuration](https://docs.replit.com/features/project-setup/configuration), [MCP](https://docs.replit.com/build/connect-via-mcp).
