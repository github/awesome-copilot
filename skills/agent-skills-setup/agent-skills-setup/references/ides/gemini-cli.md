# gemini-cli

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.gemini/skills` |
| Project skills | `.gemini/skills` |
| Rules | `GEMINI.md` |
| MCP | `~/.gemini/settings.json` |
| Project MCP | `.gemini/settings.json` |
| Project config | `.gemini/settings.json` |
| Config | `~/.gemini/settings.json` |

<!-- END GENERATED: ide-paths.json summary -->
- User settings are the only automatic MCP/config source. Project settings and project MCP are diagnostic/manual; never copy the whole `.gemini` namespace.
- MCP JSON uses `mcpServers`; servers need `command`, legacy SSE `url`, or Streamable HTTP `httpUrl`. Never relabel `url` and `httpUrl`; aliases containing `_` require manual renaming and policy review.
- `GEMINI.md` supports project/ancestor context and configurable filenames. Commands use user/project `.gemini/commands/*.toml`; subagents use `.gemini/agents/*.md`. Both remain manual because their formats are not generic prompts or rules.
- `.agents/skills/` is a supported higher-precedence alias within the same scope; the mapper uses canonical Gemini paths and never merges aliases implicitly.

Sources: [configuration](https://geminicli.com/docs/reference/configuration), [MCP](https://geminicli.com/docs/tools/mcp-server/), [Skills](https://geminicli.com/docs/cli/using-agent-skills/), [commands](https://geminicli.com/docs/cli/custom-commands/).
