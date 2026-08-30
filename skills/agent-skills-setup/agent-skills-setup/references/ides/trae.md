# trae

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.trae/skills` |
| Project skills | `.trae/skills` |
| Rules | `.trae/rules` |
| MCP | Not mapped |
| Project MCP | `.trae/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Project MCP is `.trae/mcp.json` with `mcpServers`; global MCP is managed through **Settings → MCP Servers** and its raw-JSON editor, not a portable file.
- `.agents/skills/` is optional and `.trae/skills/` takes precedence. Project rules use documented frontmatter; Commands, Subagents, Hooks, and Memory need manual scope/schema review. Never copy or run hooks automatically.
- No global CLI, argv, or settings file is documented. Do not infer `~/.trae/argv.json` or `~/.trae/settings.json`.
- **`bytedance/trae-agent`** is a separate CLI with repo-local `trae_config.yaml`/`trae_config.json`; its `mcp_servers` schema is not an IDE target. Do not merge TRAE Work/Desktop/Web, Plugin, or Agent paths here.

Sources: [MCP](https://docs.trae.ai/ide/model-context-protocol?_lang=en), [Skills](https://docs.trae.ai/ide/skills?_lang=en), [Rules](https://docs.trae.ai/ide/rules?_lang=en), [Hooks](https://docs.trae.ai/ide/automate-actions-with-hooks?_lang=en), [Trae Agent](https://github.com/bytedance/trae-agent).
