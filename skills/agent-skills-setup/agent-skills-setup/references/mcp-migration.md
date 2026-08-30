# MCP migration

Use for the profile-aware `mcp` object. The automatic core accepts the reviewed stdio subset of JSON and JSONC server maps. Remote HTTP/SSE requires a dedicated target-profile transport adapter and currently produces reconstruction actions; read [mcp-transport.md](mcp-transport.md) for remote URLs, OAuth, or headers.

| Target | Automatic shape | Boundary |
| --- | --- | --- |
| Common clients | `mcpServers` | Automatic for reviewed stdio `command`/`args`/`env`; permission and lifecycle fields enter the loss report. |
| Registered JSON/JSONC profiles | Profile-specific root key | Validate command/URL and preserve unrelated keys. |
| TOML/YAML/JSON5/XML/Lua | Dedicated manual adapter | Generate a reviewed reconstruction; never use JSON fallback. |
| Cloud/UI profiles | Rebuild manifest | Use the official API/UI; never invent a local file. |

Validate command/args/env or URL/headers, apply [migration-safety.md](migration-safety.md), convert only target-supported fields, preserve unrelated settings, parse the target, and emit a credential-free diff. Ambiguous transport, OAuth/session state, unknown schema, and non-automatic adapters remain manual.

## Sensitive configuration handling

User-level agent config files are treated as sensitive inputs:

- **Subobject extraction only.** For `config-subobject` storage — and for
  every MCP object at ACB collection time, including shared host settings
  files registered with plain `file` storage — the adapter parses and
  re-emits only the authorized MCP servers section. Sibling settings —
  model choice, approval policy, sandbox, profile state, telemetry — are
  never read into plans, bundles, or reports.
- **Trust sections are hard-denied.** Surfaces registered with the
  `never-migrate` policy (e.g. the trust block of a host config file) are
  excluded before disk collection; no code path can inventory or copy them.
- **Least-privilege reads.** A config file is opened only when its product is
  an explicitly named migration source or target. There is no startup scan of
  installed products.
- **Secret preflight and redaction.** Every collected object passes the strict
  secret scanner before output; credential-looking values in `env`, `args`,
  and URLs are dropped to the loss report instead of being migrated.
- **No network.** MCP migration never contacts servers, registries, or update
  endpoints; remote-transport entries always produce a manual rebuild.

~~~bash
bash scripts/smart-ide-migration.sh plan \
  --source cline/ide --target forge/cli --workspace /path/to/project \
  --objects mcp --scope project --output /path/to/plan.json --json
~~~
