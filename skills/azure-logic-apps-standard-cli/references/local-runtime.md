# Local dependencies and runtime

Mandatory before dependency installation/checks, runtime doctor, or host lifecycle work.
Baseline: `logicapp` 1.0.0b1. Read `SKILL.md` rules first. Use the actual project root, OS,
shell, available port, and ownership evidence; `App` and 7071 are example coordinates.

## Prerequisites and effects

Inspect existing configuration, settings references, listeners, and runtime ownership before
starting or repairing anything. Do not print secret values. Running a local host can activate
polling/event triggers and invoke real services using local credentials. Establish authorized
effects and appropriate non-production resources before startup; "local" does not mean isolated.
Do not install dependencies or start services as a side effect of read-only inspection.

## Check before installation

For a destination that does not exist, a general `dependency check` may identify tooling.
Once the project exists, use the project-aware form:

```azurecli
az logicapp dependency check --path App
```

Inspect Core Tools, Node.js, bundle, .NET, and Azurite findings. The project-aware check
resolves configured storage and whether Azurite is required; not every tool is needed
for every operation. A local SDK test has different prerequisites from a live host.

For an existing project, diagnose before runtime repair:

```azurecli
az logicapp runtime doctor --path App --port 7071 --output json
```

Doctor is read-only: it does not install, download, repair, start/stop services, decrypt
settings, or contact cloud storage. It uses bounded loopback probes and local project/tool/
cache/ownership evidence. A stopped host is an optional skipped probe, not an offline failure.

| Doctor exit | Meaning and required response |
|---|---|
| 0 | No required blockers/unknowns; not business correctness or universal compatibility |
| 1 | Required failure; inspect and resolve the actual finding |
| 2 | Required unknown, or optional problem under `--strict`; preserve diagnostic uncertainty |

Exact tool/bundle compatibility remains a required unknown in this baseline; a responsive
project can exit 2. Do not reinstall merely because compatibility is unknown or convert
the result into certified health. Preserve structured stdout on nonzero exits.
Use a local `--context` instead of path/port if appropriate; explicit context cannot be
combined with `--path` or `--port`. Doctor does not take `--local`.

## Install only selected missing dependencies

Install only the kinds reported missing and required for the requested operation:

```azurecli
az logicapp dependency install --kind core-tools --yes
az logicapp dependency install --kind node --yes
az logicapp dependency install --kind azurite --yes
az logicapp dependency install --kind bundle --yes
```

These are alternatives, not a command sequence to run unconditionally. Repeat `--kind` for
multiple required kinds. Omitting `--kind` installs all installable kinds and is not the
default procedure. `--yes` is appropriate only after installation is authorized.
Check each exit and rerun the project-aware check after the selected installation.

Constraints:

- The CLI does not install the .NET SDK. Report a required missing SDK and use the customer's
  approved installation process; do not run a remote installer implicitly.
- Azurite requires Node.js 22 or newer. Establish Node/npm availability before installing it.
- Managed dependencies default to `~/.azurelogicapps/dependencies`, shared with VS Code
  tooling; `LA_DEPENDENCIES_PATH` or supported target flags can override it.
- Managed tools affect child-process environments, not global PATH.
- Respect approved package sources, proxies, and network policies. The Azurite installer
  uses the public npm registry by default rather than the user's configured registry.
  Use `--kind azurite --source-url REGISTRY_URL` for an authorized mirror.
- `--source-url` requires exactly one kind. Custom sources do not receive the same
  publisher-checksum verification; establish trust independently. Never disable TLS.
- `--version` pins one selected kind when required. Do not upgrade working tools merely
  because a newer version exists.
- `dependency uninstall` removes only recorded CLI-owned dependencies using
  `.logicapps-integrity.json`. Inspect shared use and obtain removal authorization first.

**Gate:** Every dependency required for this task is available, or its concrete blocker is
reported. An unknown compatibility finding is not a missing-package finding.

## Start and verify readiness

Choose a port after inspecting existing listeners. Do not stop another process to free it.
Reuse a suitable existing host only after confirming its project and permitted effects.

```azurecli
az logicapp runtime start --path App --port 7071 --background --ready-timeout 90
az logicapp runtime show --port 7071
```

Require running state **and** `readiness.managementEndpointReachable: true`.
An open port or recorded process alone is insufficient. If starting/failed/unready, inspect
the reported `logPath`, then rerun doctor as appropriate. Do not invoke workflows until ready.
Logs can contain sensitive payloads; inspect locally and sanitize before sharing.

When `AzureWebJobsStorage` resolves to `UseDevelopmentStorage=true`, startup manages Azurite
on ports 10000-10002 and reuses an existing emulator. Real storage configuration does not
start Azurite. Use `--no-azurite` only when another authorized process owns its lifecycle.
Do not manually author emulator/runtime state directories.

Inspect the returned dependency record:

| Azurite state | Required response |
|---|---|
| `started` | Record CLI ownership and dependent host |
| `already-running` | Inspect `startedByCli`; do not infer ownership from the port |
| `port-conflict` | Identify the non-Azurite listener; stop startup, not the unrelated process |
| `missing` | Authorize/install the required Azurite dependency |
| `not-started` | Inspect storage configuration without exposing its values |
| `failed` | Inspect the dependency's reported `logPath` |
| `skipped` | Confirm intentional externally managed emulator lifecycle |

Local runtime lifecycle honors saved local context ports where applicable; explicit path/port
coordinates are safer for automation. Do not add API-only `--local` to lifecycle commands.
These commands do not manage cloud host startup/shutdown.

**Gate:** Correct owned/reused host, actual management readiness, permitted trigger effects,
and understood dependency ownership.

## Diagnose before stopping

Collect required run/action evidence while the host is reachable using the mandatory live
operations procedure selected from `SKILL.md`. Console output alone is not a workflow
business diagnosis. If no run exists or Stateless history is unavailable, report that fact
and use supported response/telemetry evidence; do not invent a failed action.

## Stop only owned processes

After required validation, discovery, execution, and diagnosis are finished:

```azurecli
az logicapp runtime stop --port 7071
az logicapp runtime show --port 7071
```

Confirm the task-owned host is stopped and its listener is closed using OS-appropriate
process/listener inspection. If a new listener has reused the port, identify it without
terminating it. Do not declare the original host alive solely from a reused port.

Stop only runtimes started for this task, unless explicit shutdown of another host is
authorized. If asked to leave a host running, verify responsiveness and report project,
port, and lifecycle ownership instead of stopping it.

When Azurite was started by the CLI, it is retained while any CLI-started foreground or
background host depends on it. Only after the last dependent host stops should its
10000-10002 listeners close. Never stop an emulator the CLI did not start.

CLI process ownership uses PID and creation identity. Unknown/recycled identities and
unresolved descendants must not be signalled. If cleanup remains pending, retain ownership
records and inspect the exact reported processes. Use an explicitly authorized, identity-
verified PID only; never kill by executable name or delete records to bypass a guard.
Use supported stop retries only after reviewing ownership evidence.

**Gate:** All task-owned processes are verified stopped, or explicit retention/cleanup blockers
are reported. Shared and unrelated services remain intact.
