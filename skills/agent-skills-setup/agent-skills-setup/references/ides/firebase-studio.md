# firebase-studio

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | Not mapped |
| Rules | `.idx/airules.md` |
| MCP | Not mapped |
| Project MCP | `.idx/mcp.json` |
| Project config | Not mapped |
| Config | Not mapped |

<!-- END GENERATED: ide-paths.json summary -->
- Firebase Studio stopped accepting new users and workspaces on 2026-06-22 and is scheduled to shut down on 2027-03-22. Use this ID only to migrate rules out of an existing workspace; prefer Google AI Studio or Antigravity for new work.
- Gemini prioritizes `.idx/airules.md`, then `GEMINI.md`, `.gemini/styleguide.md`, `AGENTS.md`, and `cursorrules`. The mapper uses only the canonical `.idx/airules.md` file and does not flatten the fallbacks.
- Existing workspaces have project MCP at `.idx/mcp.json` under the `mcpServers` root. It supports stdio and remote HTTP transports, headers, env, and environment-variable references. It is a source-only surface because Firebase Studio is sunsetting.
- No stable Firebase Studio Agent Skills, prompts, or commands surface is documented. Do not infer Gemini CLI or VS Code paths.
- Workspace provisioning in `.idx/dev.nix`, Gemini API keys, models, chat state, and user settings are configuration/runtime state and remain manual.

Sources: [lifecycle](https://firebase.google.com/docs/studio/get-started), [MCP](https://firebase.google.com/docs/studio/mcp-servers), [Gemini workspace configuration](https://firebase.google.com/docs/studio/set-up-gemini).
