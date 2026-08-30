# factory-droid

Factory Droid uses `.factory/skills/` and `~/.factory/skills/`, project `AGENTS.md` and user `~/.factory/AGENTS.md`, `.factory/mcp.json` and `~/.factory/mcp.json`, and custom droids under `.factory/droids/` or `~/.factory/droids/`. Hooks are separate user, project, and local subobjects in `~/.factory/settings.json`, `.factory/settings.json`, and `.factory/settings.local.json`.

Skills and reviewed MCP server maps are portable. Custom droids require a manual agent template; hooks can only be generated disabled and must never be activated by migration.

Sources: [MCP](https://docs.factory.ai/cli/configuration/mcp), [hooks](https://docs.factory.ai/reference/hooks-reference), [custom droids](https://docs.factory.ai/cli/configuration/custom-droids).
