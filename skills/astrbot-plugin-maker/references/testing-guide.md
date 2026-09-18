# Testing generated and repaired plugins

Test real production behavior and report the level of evidence obtained.

## Offline checks

For a generated plugin, run from its directory in a development environment:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m ruff check .
python -m ruff format --check .
```

If generated with `--with-openapi`, also install its `requirements.txt` first.
The default `pytest.ini` selects `tests/`; these tests import `plugin_logic.py`
and, when included, the actual HTTP client. They use no AstrBot services or real
network calls. Async HTTP tests use `asyncio.run`, so pytest-asyncio is not needed.

The skill's static checker needs `PyYAML` and `packaging`:

```bash
python <skill-dir>/scripts/validate_plugin.py <plugin-dir>
```

It reads the real metadata/schema/source files and checks syntax, required string
fields, version constraint syntax, and basic configuration shape. It rejects
duplicate YAML keys. It intentionally does not impose a frozen metadata/adapter
allowlist or import the plugin. A passing result proves none of loadability,
complete JSON/schema semantics, adapter delivery, or marketplace acceptance.

## Actual AstrBot SDK smoke test

In an isolated environment with the selected AstrBot version and its dependencies:

```bash
python -m pytest runtime_tests -q
```

For the unmodified example baseline, install `astrbot==4.28.0` on Python 3.12+.
The generated smoke tests import the actual SDK and plugin as a package, check
`Star` discovery, construct a real `AstrBotConfig` using the generated schema,
and invoke the command with real event/result objects. Config changes must alter
the resulting text. A missing SDK fails collection rather than silently skipping.

This is SDK-level evidence. It does not start `PluginManager`, route a real
message, or verify reload behavior. Keep runtime-created data in an isolated
working directory; AstrBot imports may initialize local data/logging paths.

When adapting the scaffold, update the smoke test's class, handler, and expectations.
For an existing plugin, use its own test conventions rather than copying a
greeting-specific test verbatim.

## Loader, reload, and adapter check

Use an already selected local development runtime, or set one up when within the
requested scope. The [startup reference](../assets/dev-commands.txt) points to the
official source workflow and shows platform-specific directory commands.

1. Place the plugin under the runtime's `data/plugins/<plugin_name>` directory.
2. Start that runtime, check plugin discovery and its log, and exercise the requested
   command with the configured prefix.
3. Change a setting in WebUI, save/reload as appropriate, and verify the reply changes.
4. If the plugin owns sessions/jobs, reload twice and check they are cleaned up.
5. Exercise platform-specific features on the actual selected adapter.

Report a concrete untested check if the runtime or adapter is unavailable.

## Troubleshooting

| Symptom | Inspect |
| --- | --- |
| Import fails | Target SDK/interpreter and runtime dependencies; package-relative imports |
| Plugin missing | `main.py`, metadata, version constraint, startup log |
| Command ignored | Registered method, command prefix, permission/platform filters |
| Config ignored | Schema field names and constructor injection; hardcoded defaults |
| Duplicate replies after reload | Uncancelled background tasks, repeated registrations |
| Tool argument missing | Docstring `Args:` schema; annotations alone are insufficient |
| API key works on one endpoint only | Endpoint's required scope and deployed version |
| JSON parse fails on chat | SSE content type and stream parser |

A test that creates its own metadata file and checks it exists, evaluates unrelated
string operations, or raises its own expected auth exception cannot verify a plugin.
Do not keep such placeholders as passing tests.
