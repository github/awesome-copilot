# Live workflows, execution, and diagnosis

Mandatory before runtime workflow inspection/export/mutation, invocation, diagnosis,
cancellation, or replay. Baseline: `logicapp` 1.0.0b1. Apply `SKILL.md` targeting,
authorization, sensitive-output, and mandatory runtime-readiness rules.

## Target and inspect

Local examples use a previously verified host at port 7071. Cloud equivalents replace
`--local --port 7071` with `--resource-group GROUP --name APP --subscription SUBSCRIPTION_ID`.
An explicitly selected API `--context NAME` replaces those target flags; do not mix them.
Account selection remains independent of contexts.

Workflow list/show/export/set/delete query a reachable runtime, not an offline path.
For offline work read authored files and run `workflow validate --path PROJECT_ROOT`.
The host must be ready, but no workflow run needs to be active.

```azurecli
az logicapp workflow list --local --port 7071 --max-items 10 --output table
az logicapp workflow show --local --port 7071 --workflow Orders
az logicapp workflow export --local --port 7071 --workflow Orders --output-path Orders.backup.json
```

List returns `value` plus `nextContinuationToken`; page with `--max-items` and
`--continuation-token` (`--next-token` alias). Pass tokens unchanged; they are offsets,
not snapshots. Changed inventories can shift page boundaries. Show returns the complete
authored workflow and ETag; table output omits definition/revision details.
Export preserves authored kind/configuration and reports its source ETag.

Export is one workflow, not an app backup: it does not download settings, connections,
artifacts, or resolved expression values. Definitions can contain sensitive literals.
Review/protect exports before persisting to shared locations or source control. Use a new
regular `.json` destination, or `--force` only for an inspected replacement.

## Replace or delete one existing live workflow

Prerequisites: explicit approval of the selected target/effect, retained export and revision,
coordinated writers, and a reviewed complete replacement file for `set`.

```azurecli
az logicapp workflow set --local --port 7071 --workflow Orders --file Orders.edited.json --if-match SAVED_ETAG --allow-non-atomic
```

Quote the actual saved ETag according to the shell, preserving its exact value.
`set` takes a complete workflow file, not a bare definition or patch. It preserves kind,
requires the existing workflow, performs static and completed target-runtime validation,
and verifies written bytes. It does not publish shared settings/connections or add new
cloud workflows. An unfinished validation HTTP 202 is not a completed preflight.

Deletion has the same approval, retained-export, revision, and non-atomic prerequisites:

```azurecli
az logicapp workflow delete --local --port 7071 --workflow Orders --if-match SAVED_ETAG --allow-non-atomic
```

Both commands prompt unless `--yes` is explicitly authorized. Exact strong revision checks
still apply without optional `--if-match`; providing it binds to the earlier editing
revision. Wildcards, weak revisions, and `--force` bypasses are unsupported.

`--allow-non-atomic` is required even with `--yes`. VFS can race or leave partial writes;
rollback is not guaranteed. A concurrent deletion can permit recreation during a write.
Conflicts or uncertain receipts require inspection, not blind retry or unconditional restore.
Read-only/run-from-package targets may reject writes; use authorized full deployment instead.

Delete removes only that workflow's `workflow.json`, not its folder/siblings/shared files,
active runs, or history. File absence does not immediately establish runtime removal.
Set byte verification is not proof of reload/execution. Inspect runtime metadata and
exercise approved behavior separately after mutation.

**Gate:** Retained export/revision, verified file outcome, separate runtime observation, and
explicit uncertainty/recovery guidance if either verification is incomplete.

## Enable or disable one deployed workflow

Supported only for deployed Standard Stateful/Stateless workflows, not local live state APIs.
Confirm settings read/write permissions and coordinate **all** app-settings writers:

```azurecli
az logicapp workflow disable --resource-group GROUP --name APP --workflow Orders --allow-non-atomic --subscription SUBSCRIPTION_ID
```

Use `workflow enable` instead when that is the requested operation; do not run both.
These commands set `Workflows.<workflow-name>.FlowState`. The underlying API replaces the
whole app-settings map: unrelated concurrent changes can be lost despite snapshot checks
and readback. Explicit approval of that non-atomic risk is required, even with `--yes`.
No guaranteed rollback, invented ETag guard, or automatic retry is available.

Read `configuredState` separately from `runtimeState`/convergence. Pending or unknown
convergence is not proof of quiescent dispatch. Even converged metadata does not establish
drained runs. Disabling does not cancel in-flight/pending runs, stop the app, or purge
history; enabling can process backlog. Settings changes can cause hosting/reload effects.

For authorized local startup configuration, the companion procedure is to edit the
corresponding FlowState key under local settings `Values` and restart only the owned host.
This is not a live local enable/disable API; preserve other settings and protect values.
Use the mandatory local-runtime procedure for any restart.

## Invoke and observe approved behavior

Establish actual workflow/trigger names, kind, payload, environment, and permitted external
effects. A local invocation may still mutate real services.

```azurecli
az logicapp run start --local --port 7071 --workflow Orders --trigger manual --payload-file payload.json
```

Inspect the structured result and capture the **actual** returned run ID if present.
Do not guess an ID or infer successful completion from accepted invocation.
For Stateful runs with an actual ID:

```azurecli
az logicapp run wait --local --port 7071 --workflow Orders --run-id RUN_ID --timeout 300 --interval 5
az logicapp run show --local --port 7071 --workflow Orders --run-id RUN_ID
```

| `run wait` exit | Meaning |
|---|---|
| 0 | Observed Succeeded |
| 4 | Observed another terminal status |
| 2 | CLI observation deadline, not workflow TimedOut |
| 1 | Observation/protocol error |

Waiting does not cancel, retry, or roll back execution. Verify required outputs and effects
separately; workflow status alone is not business correctness.

Stateful history/control commands are not general Stateless controls, including when
Stateless debug history exists. For Stateless work use the supported invocation response,
approved telemetry, or native tests as appropriate. Report missing durable evidence;
do not enable history/change kind merely to make diagnosis resemble Stateful behavior.

## Diagnose while the runtime is reachable

Start with the run and action metadata, not console output alone:

```azurecli
az logicapp run list --local --port 7071 --workflow Orders --status Failed --max-items 10
az logicapp run show --local --port 7071 --workflow Orders --run-id RUN_ID
az logicapp run action list --local --port 7071 --workflow Orders --run-id RUN_ID
az logicapp run action show --local --port 7071 --workflow Orders --run-id RUN_ID --action ACTION_NAME
```

Follow supported run-list continuation tokens unchanged. A skipped dependent action is not
necessarily the root failure. Expression failure may have metadata error but no outputs;
a failed HTTP action may instead have useful response content.
Retrieve bounded recorded content only when needed and authorized:

```azurecli
az logicapp run action show-content --local --port 7071 --workflow Orders --run-id RUN_ID --action ACTION_NAME --max-bytes 16384
```

Outputs are default; use `--content inputs` only when needed. Payloads/provider errors can
contain secrets despite default URL redaction. Content links contain SAS credentials:
do not use `--show-content-urls` unless needed for immediate diagnosis; never persist or
share raw links. Inspection exit 0 means read success, not workflow success.

**Gate:** Actual failed action/platform evidence where available, or a precise explanation
of missing history/response/telemetry. Complete diagnosis before stopping the owned host.

## Cancel or replay only with explicit approval

These Stateful operations can affect external systems. They are not automatic diagnosis
steps. Establish the exact target and effects before using confirmation bypass `--yes`.

```azurecli
az logicapp run cancel --local --port 7071 --workflow Orders --run-id RUN_ID --wait --timeout 60 --interval 2
```

An acknowledgement is not observed cancellation. With wait, exit 0 means observed Cancelled
or an already-terminal unchanged source; 4 means another terminal outcome; 2 means the
observation deadline; 1 is an observation/protocol error. Inspect the structured result.
Cancellation cannot undo effects or guarantee in-flight actions stop. A timeout sends no
additional cancellation or retry.

Choose exactly one replay type based on verified source evidence:

| Operation | Required source and interpretation |
|---|---|
| `run resubmit` | One executed `--action` in a completed `--run-id`; runtime must literally advertise `canResubmit=true` |
| `trigger history resubmit` | Exact retained fired `--history-name` for the selected `--workflow` and `--trigger`; not a run ID |

```azurecli
az logicapp run resubmit --local --port 7071 --workflow Orders --run-id COMPLETED_RUN_ID --action ACTION_NAME
```

```azurecli
az logicapp trigger history resubmit --local --port 7071 --workflow Orders --trigger manual --history-name HISTORY_ID
```

These are alternatives. Action resubmission uses the source version and retained prior
results with current settings/connections. Selected/dependent actions may repeat effects.
Trigger replay is distinct, not a fallback for ineligible actions. Neither is in-place
resume or exactly-once recovery. Do not enable runtime features to bypass eligibility.

HTTP 202 is acceptance, not completion. Wait only on a service-returned `newRunId`.
`acceptedNewRunIdUnknown` requires reporting uncertainty; do not choose the latest run,
substitute an ID, follow a Location URL to invent an identity, or automatically retry.

**Gate:** Requested, accepted, observed, and unknown outcomes remain distinct. Report
uncertain effects and retained resources before considering deliberate recovery.
