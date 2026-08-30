# goose-cli (Goose CLI)

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | `~/.agents/skills` |
| Project skills | `.agents/skills` |
| Rules | `.goosehints` |
| MCP | `~/.config/goose/config.yaml` |
| Project MCP | Not mapped |
| Project config | Not mapped |
| Config | `~/.config/goose/config.yaml` |

<!-- END GENERATED: ide-paths.json summary -->
- `config.yaml` is YAML `extensions`, not JSON MCP; `sse` is legacy and must not be relabeled as `streamable_http`. MCP/config/project/prompt migration is manual.
- Dedicated Skills and local `.goosehints` are low-risk. Other context names can be selected with `CONTEXT_FILE_NAMES`.
- Recipes, prompt templates, Memory, slash commands, permissions, and `secrets.yaml` are separate state. Never copy secrets, mixed config, or runtime memory automatically.
- Windows uses a distinct app-data path; the generated POSIX mapping is macOS/Linux only.

Sources: [Skills](https://goose-docs.ai/docs/guides/context-engineering/using-skills/), [configuration](https://goose-docs.ai/docs/guides/config-files/), [extensions](https://goose-docs.ai/docs/getting-started/using-extensions/), [goosehints](https://goose-docs.ai/docs/guides/context-engineering/using-goosehints/).
