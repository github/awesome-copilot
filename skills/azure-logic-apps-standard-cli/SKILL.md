---
name: azure-logic-apps-standard-cli
description: 'Create, inspect, validate, test, run, debug, package, and deploy Azure Logic Apps Standard projects using the Azure CLI logicapp extension. Use for Standard workflow authoring, optional workspaces, connector discovery, identity-based connections, local runtimes, native workflow tests, and approved cloud lifecycle operations. Not for Consumption-only workflow development.'
compatibility: 'Requires Azure CLI 2.67.0 or newer with the logicapp extension; its Python runtime must be 3.10 or newer. Local hosting and native tests have additional task-specific dependencies. Installation, connector catalogs, and Azure operations can require network access and Azure permissions.'
---

# Logic Apps Standard CLI

Use `az logicapp` as the primary interface for supported Standard project, workflow,
connection, validation, runtime, diagnostic, testing, and packaging operations.
Do not manually recreate files or Azure wiring owned by a supported command.
Manual workflow authoring, workspace files, ignore files, and infrastructure-as-code
remain appropriate where the CLI does not own that operation.

Reviewed baseline: extension **1.0.0b1**. It is a public **preview** for evaluation and
development, not a claim of production readiness. Use non-production resources for
evaluation. Existing core app-management, app-settings, and ZIP-deployment commands
are distinct from the extension's preview commands, even where reference pages label
extension commands GA. Declared platform support is not live-runtime qualification.

## Mandatory procedure routing

This folder is one installable skill package. Resolve bundled files relative to this
`SKILL.md`, not the customer's working directory. Install/copy the entire folder.
These references are required procedures, not optional background reading.
See the [package README](README.md) for installation, provenance, and maintenance notes.

**Before the corresponding operation, read every applicable reference below.**
For combined tasks, read each required procedure before its phase. If a required
file is missing or unreadable, report that operation as blocked. Do not invent
syntax, bypass its prerequisites, or fetch an unreviewed substitute.

| Requested operation | Required bundled procedure |
|---|---|
| Install/check dependencies; diagnose, start, or stop a host | [Local runtime](references/local-runtime.md) |
| Discover connectors; create/change/test/delete connections; configure identity or ACLs | [Connections and identity](references/connections.md) |
| Inspect/export/change live workflows; invoke/diagnose/cancel/replay runs | [Live workflows and runs](references/live-operations.md) |
| Scaffold, plan, run, or inspect native workflow tests | [Workflow testing](references/testing.md) |
| Package, deploy, or change deployment exclusions | [Packaging and deployment](references/packaging-deployment.md) |

Basic local scaffolding, workspace creation, and offline validation are specified here.
Do not start a host, restore packages, invoke workflows, or mutate Azure merely because
the skill was activated. Select only the procedures needed for the requested task.

## Non-negotiable rules

1. **Inspect before mutation.** Establish the actual project root and requested scope.
   Inspect affected workflows, configuration structure/references, ignore files,
   workspaces, and uncommitted changes. Do not dump secret setting values.
2. **Preserve existing conventions.** Do not restructure repositories, convert workflow
   kinds, migrate authentication, normalize aliases, or replace user files unsolicited.
3. **Use managed identity by default.** For new connections and deployed app configuration,
   use another authentication method only when explicitly requested by the customer or
   unsupported by the selected connector/operation. Authentication failure is not proof
   of lack of support. Never silently fall back to secrets.
4. **Enable identity as part of new-project delivery.** Configure the supported local
   identity-based connection mechanism. For deployment-facing work, enable app identity
   through the authorized provisioning/deployment process. Preserve an existing identity
   convention; otherwise default to system-assigned identity. Local scaffolding does not
   authorize Azure mutation; report unapproved cloud prerequisites explicitly.
5. **Verify distinct principals and permissions.** A local process does not acquire a
   deployed app's managed identity. Follow the connector's documented local mechanism;
   do not assume every connector uses `DefaultAzureCredential`. Verify local and cloud
   principals, connection access, and least-privilege data-plane roles separately.
6. **Discover, do not guess.** Obtain connector IDs, operation IDs, parameter sets, and
   required input shapes from the actual runtime or regional managed catalog. Verify
   authentication support using metadata and authoritative connector documentation.
7. **Protect secrets and sensitive outputs.** Never put secret values in command arguments,
   source control, examples, or shared logs. Treat existing definitions, exports, and provider
   output as potentially sensitive; protect and review them before sharing. Use supported
   stdin secret input and setting references. Required protected local/runtime storage is
   permitted; local settings and test artifacts must be ignored and excluded from deployment.
8. **Keep environments configurable.** Put deployment-specific endpoints, resource IDs,
   and environment values in settings or parameters, not hardcoded workflow literals.
9. **Guard replacements and concurrency.** Inspect before every create; treat creation
   as non-idempotent. Use `--force` only for reviewed replacement. Export live workflows
   before replacement/deletion, retain revisions, and obtain approval for non-atomic
   writes. Do not bypass conflicts or blindly retry uncertain mutations.
10. **Authorize effects, not just targets.** Starting local triggers and running test/build
    code can contact real systems. Establish permitted effects first. Obtain explicit
    authorization for Azure mutations, cancellation, and replay; preview is not a sandbox.
11. **Keep evidence honest.** Read structured results even on nonzero exits. Distinguish
    configured, authorized, accepted, observed, and verified states. An open port, accepted
    invocation, generated plan, or inspected report is not successful workflow execution.
12. **Validate without manufacturing success.** Validate incrementally; require strict
    full-project validation before release packaging/deployment. Preserve stricter
    repository policy. Do not remove warnings, assertions, outputs, or guards merely
    to obtain a passing result.
13. **Own cleanup precisely.** Stop only task-owned runtimes unless asked to leave them
    running; verify shutdown and shared dependency ownership. Never kill processes by
    name or stop another user's host/emulator.
14. **Preserve deployment boundaries.** Merge ignore rules without replacing unrelated
    entries; inspect the actual package. Do not deploy local settings, tests, state,
    editor files, logs, settings templates, or generated packages.
15. **Keep connector semantics specialized.** Use available connector-specific guidance
    for delivery guarantees, poison handling, and operation-specific tests. If unavailable,
    use authoritative connector documentation; do not invent specialized behavior.

## Defaults and consequential choices

| Decision | Rule |
|---|---|
| Workflow kind | Preserve existing kinds; new workflows default to Stateful |
| Stateful vs Stateless | Stateful for durable history/long-running work; choose Stateless deliberately for suitable short-lived, low-latency work |
| Initial scope | Local authoring, unless the request includes further operations |
| Authentication | Managed identity, subject only to the exceptions above |
| Identity type | Existing convention, otherwise system-assigned; user-assigned for explicit stable/shared/pre-provisioned identity requirements |
| Project root/layout | Existing repository convention; otherwise the smallest suitable layout |
| Workspace | Optional; reuse an existing workspace and ask only if intent is unresolved |
| Context | Optional saved shortcut; never change active selection without authorization |
| Automation | Explicit project path and runtime/cloud target coordinates |
| Runtime lifetime | Stop task-owned hosts after checks unless explicitly asked to retain them |

Infer paths and established choices from the request/repository. Ask only about missing,
consequential decisions. Do not insist on three scaffold questions when answers are known.

## 1. Verify tooling and select the target

Inspect first; these commands do not install the extension:

```azurecli
az version
az extension list --query "[?name=='logicapp'].{name:name,version:version}" --output table
```

Minimums for the reviewed release: Azure CLI 2.67.0 and its Python runtime 3.10.
If the extension is absent and installation is authorized, use the public extension index:

```azurecli
az extension add --name logicapp --version 1.0.0b1 --allow-preview true
az extension show --name logicapp --output json
az logicapp --help
```

Check the exit after each command; do not continue after failed installation.
If the requested version is unavailable, report the index/network/version error.
Do not substitute a private wheel, disable TLS, or bypass organizational package policy.
Do not automatically upgrade an installed extension. For a different installed version,
inspect each affected command's `--help` and current official contracts before execution;
report material differences instead of assuming this baseline still applies.

Detect OS and shell before using examples. Single-line `azurecli` blocks avoid shell-specific
continuations. `App`, `Orders`, and uppercase identifiers are illustrative names: substitute
the inspected target, quote paths containing spaces, and use the host OS's path separator.
PowerShell/native-wrapper quoting for expressions is specified in the connections procedure.

| Operation | Target contract |
|---|---|
| Local file authoring/validation | Explicit `--path`; some commands also accept a local context |
| Runtime API inspection/execution | `--local --port PORT`, or cloud `--resource-group GROUP --name APP` |
| Runtime lifecycle | Local `runtime start/show/stop` flags; not cloud host management |
| Runtime doctor | Local `--path` and optional `--port`, or local `--context`; no `--local` |
| Managed connection creation | `--name CONNECTION` and `--logic-app-name APP`, not interchangeable |
| Live workflow enable/disable | Deployed apps only |

For API-targeting commands, explicit `--port` requires `--local`. A named context owns its
coordinates: do not mix it with explicit API target flags. Inspect command-specific help
for file-command context combinations; do not assume one universal precedence rule.
Cloud work requires the intended Azure login, tenant, subscription, and permissions.
Verify account selection independently: saved contexts do not bind subscription/tenant.
Avoid changing global account selection; prefer explicit `--subscription` in automation.

## 2. Inspect and scaffold locally

Classify the destination as new, an existing Standard project, or a nonempty unrecognized
directory. The **project/host root contains `host.json`**; workflow directories are its direct
children. The repository root may itself be that project root.

For an existing project, inspect `host.json`, workflow files, `connections.json`,
`parameters.json` when present, settings names/references, ignore files, workspaces, and
affected uncommitted changes. Preserve unrelated content and avoid exposing local values.

For a new project, choose a minimal project-at-root layout or a solution/monorepo child
project according to requirements. Support directories such as docs, requests, fixtures,
tests, logs, and artifacts are optional and created only for actual work. Prefer package
output outside the host root. Do not author `.azurelogicapps` runtime state.

After inspecting the destination, scaffold using explicit paths:

```azurecli
az logicapp project create --path App --workflow Orders
```

Add `--workflow-kind Stateless` only for an intentional Stateless choice.
Use `--adopt` only for a reviewed nonempty unrecognized directory, not as routine setup.
Inspect generated host/settings/connection/workflow files before extending them.
Create additional workflows without replacing existing ones:

```azurecli
az logicapp workflow create --path App --workflow Notify --kind Stateful
```

`--file FILE` accepts a reviewed full workflow file or bare definition for local import.
Creation is local-only and non-idempotent. Do not use it to add a cloud workflow.

Before writing sensitive local settings, confirm effective Git exclusions. Merge rules
relative to the actual repository and host roots; never copy `.gitignore` over `.funcignore`.
Always exclude local settings/state from source control and deployment. If changing
deployment exclusions, first read the packaging procedure and follow its concrete rules.

**Gate:** Correct project root, requested workflow kinds, preserved user files, effective
secret exclusions, and identity-based configuration or an explicitly reported prerequisite.

## 3. Optional workspace and context

A `.code-workspace` file is optional; opening the host directory is valid. Reuse an existing
workspace. When a new multi-root workspace is requested, use relative paths to real folders
and put the Logic Apps host project first. Do not create empty folders just to populate it.
Adapt this JSON to the selected layout; it is not a required filename or folder scheme:

```json
{
  "folders": [
    { "name": "Logic App", "path": "App" }
  ]
}
```

Preserve existing workspace settings and names. Add docs/test roots only when useful and
present. For a project-at-root workspace, the project path is `"."`.

Saved contexts are optional. Inspect `context list` before choosing a unique project-specific
name. If requested, create a shortcut without implicitly selecting it:

```azurecli
az logicapp context list --output table
az logicapp context create --name orders-local --path App --port 7071
az logicapp context show --name orders-local
```

Use `context use --name NAME` or creation's `--use` only when active selection is authorized.
`context update` preserves omitted fields and does not select a target; editing an active
target prompts unless `--yes` is authorized. A kind change requires explicit local path/port
or cloud resource group/app coordinates. Inspect its help before changing kind.
`context delete` deletes only a shortcut; deleting the active one clears selection without
choosing a replacement. Stores follow `AZURE_CONFIG_DIR`; no credentials belong in them.

## 4. Author and validate

Preserve workflow structure/kind. Use stable action/trigger names. Implement the required
ordering, branching, retries, timeouts, and failure paths; terminal success/failure paths
must not both execute. Use discovered operation shapes and configurable environment values.
Create representative non-sensitive fixtures only when needed.

For built-in connector discovery, read both the local-runtime and connections procedures
before establishing safe host startup and querying the catalog. For runtime-backed
validation, read the local-runtime procedure and establish readiness first.
Native tests can instead use authored mocks without starting a host.

Validate the workflow under active development:

```azurecli
az logicapp workflow validate --path App --workflow Orders
```

For completed project authoring and before release packaging/deployment:

```azurecli
az logicapp workflow validate --path App --all --fail-on-warning
```

When runtime-backed validation is required, first establish host readiness:

```azurecli
az logicapp workflow validate --path App --all --fail-on-warning --with-runtime --local --port 7071
```

Do not start a host solely for an offline edit/review. Assess findings and preserve repository
policy; report unrelated pre-existing failures separately without weakening release gates.
Static validation, runtime-template validation, native assertions, and live integration
checks are separate evidence. A completed runtime validation response is required; accepted
asynchronous validation alone does not establish completion.

## Completion evidence

Apply only gates relevant to the requested task; do not turn an inspection into a deployment.

| Task | Required evidence |
|---|---|
| Scaffold/author | Requested files/kinds and behavior; affected validation; no unsolicited restructuring |
| Connections/identity | Discovered shape, setting references, selected principal, verified grants or explicit blockers; no secrets exposed |
| Full-project release | Strict full-project validation passes; required runtime validation completes |
| Native tests | Reviewed meaningful assertions, actual executed counts/outcome, skipped counts and limitations |
| Live execution/diagnosis | Actual supported run evidence, required outputs/effects, failed action/platform error where available |
| Live mutation | Retained export/revision, guarded write result, separate observed runtime behavior |
| Cancellation/replay | Requested/accepted/observed/unknown distinguished; no inferred new run IDs |
| Package/deploy | Inspected archive/exclusions; authorized prerequisites; required post-deploy verification |
| Runtime ownership | Task-owned processes stopped and verified, or explicitly retained with coordinates/ownership |

State concrete missing permissions, dependencies, resources, unexecuted checks, retained
resources, and uncertain effects. Do not call configured identity authorized, an accepted
request complete, a skipped suite passing, or a blocked prerequisite satisfied.
