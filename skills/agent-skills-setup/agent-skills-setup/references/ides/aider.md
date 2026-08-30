# aider

<!-- GENERATED: ide-paths.json summary; do not edit this block -->

| Object | Documented path |
| --- | --- |
| Global skills | Not mapped |
| Project skills | Not mapped |
| Rules | `CONVENTIONS.md` |
| MCP | Not mapped |
| Project MCP | Not mapped |
| Project config | Not mapped |
| Config | `~/.aider.conf.yml` |

<!-- END GENERATED: ide-paths.json summary -->
- Aider config is YAML and layered; an explicit `--config` can select another file. It is diagnostic/manual, never a conversion target.
- `CONVENTIONS.md` is read-only context (`--read` or YAML `read:`).
- `.env`, `AIDER_*`, CLI flags, `/load`, prompts, Skills, and MCP lack a portable generic migration contract. Never copy credentials or rewrite another IDE's config into Aider YAML.

Sources: [configuration](https://aider.chat/docs/config.html), [YAML config](https://aider.chat/docs/config/aider_conf.html), [conventions](https://aider.chat/docs/usage/conventions.html).
