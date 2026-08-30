# copilot-cli

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.copilot/skills` |
| Project skills | `.github/skills` |
| Rules | `.github/copilot-instructions.md` |
| MCP | `~/.copilot/mcp-config.json` |
| Project MCP | `.mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- `copilot` means GitHub Copilot CLI, not VS Code. Global MCP and project `.mcp.json`/`.github/mcp.json` use `mcpServers`; project files remain manual.
- Keep explicit local/stdio/http/legacy-SSE transport and required tools; never copy VS Code `.vscode/mcp.json` (`servers`) unchanged or guess between CLI project files.
- Rules and Skills use documented GitHub/agent files. IDE prompt files are unsupported; agents, hooks, plugins, and managed state need manual review.

Sources: [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli), [MCP](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp), [custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot).
