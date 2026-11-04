# Packaging and deployment

Mandatory before changing deployment exclusions, packaging, or deploying.
Baseline: `logicapp` 1.0.0b1. Packaging is local archive creation; core ZIP deployment is a
separate authorized Azure mutation. Preserve an existing supported repository/CI deployment
route rather than replacing it merely because this skill includes a CLI example.

## Establish actual boundaries

Identify repository root, Logic Apps host root, deployable runtime assets, dedicated tests,
templates, local state, and intended package destination. The project may be at repository
root or nested; do not require a solution-root layout.

Merge source-control exclusions relative to the actual `.gitignore` location. For a
project-at-root layout, typical applicable entries are:

```gitignore
local.settings.json
.azurelogicapps/
workflow-designtime/
.logicapp-test-state/
*.log
```

For nested projects, adapt paths or place scoped rules at the host root. Ensure nested
secret copies are also ignored. Add actual generated output directories, not assumed
`logs`/`artifacts` directories that do not exist. Preserve unrelated entries and verify
effective exclusions, including existing tracked files: adding ignore rules does not
remove a tracked secret or make its history safe.

The **host-root `.funcignore`**, not `.gitignore`, defines extra deployment exclusions.
Merge applicable rules such as:

```gitignore
local.settings.json
cloud.settings.json
.azurelogicapps/
.logicapp-test-state/
workflow-designtime/
.vscode/
.git/
.gitignore
*.code-workspace
*.log
*.trx
```

Adapt/add exact host-root-relative locations of tests, fixtures, request samples, docs,
settings templates, reports, generated packages, and other non-runtime content inside the
host root containing `.funcignore`. For example, for a host at `repo\App`, exclude
`repo\App\fixtures` with `fixtures/` in `repo\App\.funcignore`, not `App/fixtures/`.
Folders outside the host root are already outside the package source. Do not use broad
binary exclusions that would remove required runtime assemblies.

A placeholder-only settings template is optional. Document that the runtime does not
consume it; configure local/cloud settings through the appropriate process. Exclude the
template from deployment even if safe to track. It must never contain actual secrets.
Do not copy `.gitignore` over `.funcignore` or replace existing user rules wholesale.

## Validate before packaging

Require strict completed full-project validation immediately before release packaging:

```azurecli
az logicapp workflow validate --path App --all --fail-on-warning
```

When runtime validation is required by the task/repository, first establish readiness and
complete the runtime-backed form against the intended target. Report actual blockers;
do not disable warnings or claim an HTTP 202 accepted validation completed.
Review existing validation failures without silently weakening the release gate.

Choose an output path outside the host root where feasible. A current-directory destination
such as `App.zip` is outside a child `App` host; for a host at `"."`, choose an explicit
external destination or verified exclusion. Create only the actual requested output parent.

```azurecli
az logicapp deployment package --path App --output-path App.zip
```

Optional `--manifest MANIFEST_PATH` selects the manifest destination. Archive and manifest
must be distinct files, including normalized paths/aliases. `--force` authorizes replacing
reviewed output only; never use it to bypass invalid inputs or exclusions.
An unreadable, non-file, or invalid UTF-8 `.funcignore` is an error, not empty policy.

The packager excludes `local.settings.json` case-insensitively, including nested copies,
dedicated recognized native test/state content, and raw TRX. It refuses ambiguous mixed
test/runtime roots rather than dropping runtime files. Dedicated native test intent is
identified from project declarations, not merely a filename or state-directory marker.
Do not rely on sensitive-data scanning to recognize every possible secret or custom artifact.

## Inspect the actual ZIP and manifest

Require all requested workflow directories, `host.json`, `connections.json` when required,
referenced `parameters.json`/runtime files, and necessary assemblies/artifacts.
Verify the ZIP root is the host content, not an extra enclosing project directory.

Require absence of:

- local settings, credentials, signed URLs/keys, or secret-bearing exports;
- settings templates and non-runtime fixtures/tests;
- native private caches, test state, raw TRX, and test build output;
- logs, editor/workspace files, repository metadata, and runtime state;
- generated packages, nested archives, and inappropriate diagnostic reports.

Inspect using a read-only archive tool appropriate to the OS. Manifest exclusions are
useful evidence but not a substitute for checking the archive. Ordinary runtime binaries
may be necessary; do not exclude all `bin`, `.dll`, or `.exe` files indiscriminately.

**Gate:** Strict validation passed; exact archive/manifest inspected; only deployable
content remains. Packaging success alone is not a deployment or secret-free attestation.

## Deploy only within authorized scope

Confirm tenant/subscription, resource group, Standard app, environment/location, deployment
route, and external effects. Azure services may incur charges. This preview does not
establish production readiness. Do not create infrastructure as an unrequested side effect.

Prerequisites:

1. App and required resources exist, with compatible hosting/deployment configuration.
2. Managed identity is enabled by default through authorized provisioning; required
   local/cloud principals, connector access policies, and data-plane grants are verified.
3. Required app settings/parameters and managed connection wiring are configured without
   exposing values. Keep triggers from activating incomplete external dependencies.
4. Package and validation gates pass; relevant tests and deployment approvals are complete.
5. Deployment/recovery follows existing repository policy, including coordinated writers.

Use the existing pipeline when supplied. For authorized direct CLI ZIP deployment, the
core Logic Apps command is available independently of extension packaging:

```azurecli
az logicapp deployment source config-zip --resource-group GROUP --name APP --src App.zip --subscription SUBSCRIPTION_ID
```

This is a core command, not an extension-owned `deployment deploy` command. Do not invent
such a command. Core app-management/settings commands are also distinct from extension
runtime APIs. Their existence does not broaden individual preview command support to
Consumption, hybrid hosts, or deployment slots. Inspect target-specific support first.

Full application deployment publishes shared files and adds new cloud workflows.
`workflow set` is only a separately approved replacement of one existing workflow on
a writable target; it is not a substitute for deploying settings or a new app.
Do not bypass run-from-package or read-only hosting restrictions.

## Verify deployment separately

After acknowledged deployment:

1. Inspect the deployment result and actual workflow inventory.
2. Validate the local authored project against the deployed runtime when required:

   ```azurecli
   az logicapp workflow validate --path App --all --fail-on-warning --with-runtime --resource-group GROUP --name APP --subscription SUBSCRIPTION_ID
   ```

3. Inspect deployed connection wiring and required authentication/access.
4. Exercise explicitly authorized representative workflows and verify outputs/effects;
   use actual supported run IDs and diagnose failed actions where history is available.
5. Verify excluded local files/secrets were not deployed using appropriate read-only
   inspection without printing secret contents.

Use the mandatory connections/live-operations procedures selected from `SKILL.md` before
those phases. Runtime-template validation is not deployed-file equality, connection
certification, or successful business execution; record each evidence type separately.

If deployment is partial, validation fails, resources remain, or effects are uncertain,
report the actual state. Do not blindly retry, activate incomplete dependencies, delete
retained resources, or claim guaranteed rollback.

**Gate:** Intended cloud content/configuration, completed required runtime validation,
verified approved scenarios, exclusion evidence, and explicit remaining blockers.
