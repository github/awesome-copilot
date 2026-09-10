---
name: astrbot-plugin-maker
description: 'Create, repair, and test AstrBot Python plugins from requirements or an existing repository. Use for Star handlers, commands, plugin configuration, storage, LLM tools, metadata, and plugin HTTP integrations; also prepare plugin releases when requested.'
---

# AstrBot Plugin Maker

Turn the requested behavior into a working AstrBot plugin, or make a focused repair
to an existing one. Preserve the user's chosen plugin, platform, version, and scope.
An ordinary command plugin uses AstrBot's Python API; HTTP OpenAPI is optional.

## Establish the target

- Inspect the existing `main.py`, `metadata.yaml`, `_conf_schema.json`, dependencies,
  tests, and repository instructions before changing an existing plugin.
- Identify the trigger, expected reply or side effect, configuration, and supported
  platform. Infer routine choices; ask only for missing information that changes the
  behavior, compatibility, or publication destination. Do not require a questionnaire
  or a separate plan approval for a clear implementation request.
- Check the installed AstrBot version or the runtime checkout's `pyproject.toml`.
  The bundled examples were checked against **v4.28.0, Python 3.12+**; this is a
  verification baseline, not a minimum imposed on every plugin. For an older target,
  verify the APIs there before choosing `astrbot_version`.
- Use [sources](references/sources.md) to find the relevant official guide and pinned
  implementation. Prefer the target runtime's source/signatures when examples differ.
  If live sources are unavailable, use the recorded baseline and state that limit.

## Implement the requested behavior

For a new command plugin, use the small configurable greeting scaffold as a starting
point, then replace its behavior and tests with the requested feature:

```bash
python <skill-dir>/scripts/scaffold_plugin.py <plugin-dir> --author "Author" --description "Plugin purpose" --command greet
```

`<plugin-dir>` must be a new `astrbot_plugin_<name>` directory. The script refuses to
overwrite an existing path. It creates a real `main.py`, configuration, metadata,
business logic, offline tests, and a separately invoked AstrBot runtime smoke test.
It does not clone AstrBot, install dependencies, or publish anything.
Use `--repo` for a known repository URL, `--astrbot-version` for a verified target,
and `--with-openapi` only for a plugin that needs the optional HTTP client example.
For an existing plugin, edit it directly; do not regenerate over it.

The [scaffolder](scripts/scaffold_plugin.py) renders the bundled [templates](assets/),
including production modules, metadata/configuration, and offline/SDK test examples.
The [static validator](scripts/validate_plugin.py) checks a plugin without importing it.

Read only the references needed for the feature:

| Need | Reference |
| --- | --- |
| Translate an open-ended request into concrete behavior | [Requirement mapping](references/nl-to-implementation.md) |
| Metadata, supported platforms, dependencies, release preparation | [Plugin packaging](references/plugin-new-checklist.md) |
| Commands, lifecycle, configuration, storage, messages, LLM calls/tools | [Python API patterns](references/api-patterns.md) |
| External access to an AstrBot server | [HTTP API integration](references/openapi-integration.md) |
| Offline tests, real SDK smoke tests, reload troubleshooting | [Testing guide](references/testing-guide.md) |

Keep these framework constraints in the implementation:

- Put the `Star` subclass in `main.py`; register handlers as methods with `self, event`.
  Current AstrBot discovers subclasses automatically. Do not add the deprecated
  `@register` to a new plugin; preserve old-version compatibility when repairing one.
- Use AstrBot's config schema and the injected `AstrBotConfig`. Read the supplied
  values, not hardcoded copies of defaults. Do not log config objects or credentials.
- Store durable data under `data/plugin_data/<plugin_name>` or the plugin KV API.
  Use the runtime's path helper, not the process's current directory.
- Use async network clients with explicit timeouts. Create tasks/connections in
  `initialize()` when needed and cancel/await/close them in `terminate()` so reloading
  does not leave duplicate jobs or open sessions.
- Use generic message components where possible. Check the selected adapter before
  using platform-specific calls or claiming support for additional platforms.
- Inspect a hook's contract before choosing `yield`, a return value, or
  `await event.send(...)`; LLM lifecycle hooks cannot be treated as command generators.

## Validate and deliver

1. Run the existing relevant tests. For new logic, test actual production functions
   and error paths; the supplied tests demonstrate this with the greeting module and
   optional HTTP client. Never leave passing placeholder assertions in the deliverable.
2. Run `python <skill-dir>/scripts/validate_plugin.py <plugin-dir>` after installing
   `PyYAML` and `packaging` in the development environment. This checks source syntax,
   metadata types/version constraints, and basic config shape without importing the
   plugin. It does **not** certify API compatibility or marketplace acceptance.
3. Run Ruff on changed Python files. If the target SDK is installed, run the separate
   SDK smoke test. Exercise load/reload and the requested command when a selected
   local instance is running or runtime integration testing is within the task's
   scope. SDK availability alone does not call for starting a server. Use
   [testing](references/testing-guide.md) for commands.
4. Apply the relevant [delivery checks](references/compliance-checklist.md). Report
   changed files, usage/configuration, checks actually run, and any untested runtime
   or adapter behavior. Missing runtime access must not be reported as a passing
   integration test.

Prepare a release or PR when requested. Use the already authorized destination;
plugin implementation alone does not imply publication to AstrBot Cloud.
