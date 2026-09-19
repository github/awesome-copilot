# Re-verification after an app or environment change

Read this on resume, an explicit `verify`, or a release check of an existing
integration. A successful run proves the recorded app and environment, not every
future release. This is evidence maintenance; it does not authorize deployment,
new tools, production effects, or renewed execution of an uncertain mutation.

## Record the inputs to a successful check

After each tool passes native verification, store `verifiedAgainst` on its
manifest entry (an optional Manifest v4 field; absent means unknown):

```json
{
  "at": "2026-09-14T12:00:00Z",
  "contractRevision": 1,
  "appRevision": "git-sha-or-build-id",
  "files": {"src/webmcp/tools.ts": "sha256:..."},
  "environment": {
    "origin": "https://app.example.test",
    "browser": "Chrome 150.0.7871.186",
    "harness": "playwright-page-context",
    "inputMode": "json-string",
    "roles": ["member"],
    "fixtureRevision": "seed-v2"
  },
  "evidence": "local-redacted-report-path"
}
```

`files` covers the tool implementation, shared runtime, generated harness and
compat helper, plus handlers/routes/stores and dependency lockfiles relevant to
its behavior. Hash current working-file contents, including approved uncommitted
edits: HEAD alone misses a changed working tree. Store hashes and fixture ids,
never credentials or fixture data. Record actual flags and native/simulated mode
in the linked report; only native evidence can produce this record. Use null for
an unavailable app/build revision; without a usable file map treat reuse as
unproven. A backend build/config change relevant to the UI path also invalidates
the evidence even when frontend files did not change.

## Durable mutation execution journal

Manifest v4 adds `mutationExecutions: []` on each tool. This is a required
workflow journal for new mutation runs, not a browser API or an automatic feature
of the vendored runtime. Before using a runner, implement its Node/host-side
pre-dispatch and settlement hooks; a browser-only callback is not durable.

Each entry has `executionId`, `tool`, `contractRevision`, `origin`, `role`,
`fixtureRevision`, `argumentsFingerprint` (SHA-256 of canonical JSON with sorted
object keys), `startedAt`, `state` (`started` or `reconciled`), and local redacted
`evidence`. Do not store raw secrets or arguments; keep sensitive fingerprints
local. Use a new executionId for every authorized invocation, including invalid
examples and cleanup actions that can mutate. Fingerprints identify attempts;
they are not a server idempotency guarantee.

1. Before any execution-capable runner scans or reads the manifest, open/create the
   canonical `.webmcpify/manifest.lock` sidecar without replacing it and acquire a
   blocking exclusive OS advisory lock on that file. Every runner for the target
   repo must resolve the same canonical path. Hold the same locked file descriptor
   through recovery, dispatch, reconciliation, settlement and the final manifest
   directory fsync. Atomic replacement of `manifest.json` must never change the
   lock identity. A bounded waiter may stop, but it must not read, write, reconcile
   or dispatch before ownership is acquired.
2. The successful OS-lock acquisition is the single atomic ownership transition.
   After acquiring it, write and fsync diagnostic owner metadata into the still-locked
   sidecar (random owner token, host, PID and process
   start identity); never use that metadata, a PID probe, age or heartbeat as
   permission to steal. Process death releases the kernel lock, so a successor may
   overwrite stale metadata only **after** it acquires the same sidecar lock. Never
   unlink, rename or recreate the sidecar during acquisition or recovery: that would
   create a second lock identity and could bypass a live holder. If the platform or
   filesystem cannot provide this invariant, mutation execution fails closed.
3. Once ownership is acquired, scan **all tools**, regardless of terminal status,
   for `started` entries. Acquisition serializes this scan with every journal write;
   never inspect the manifest before the lock and then overwrite its journal.
4. Reconcile unresolved entries through an independent authoritative read path
   using their original role/fixture/argument identity. Resolve required cleanup
   too. Unknown outcome or unverified cleanup blocks further mutation dispatch,
   even with different arguments. Retain every started entry during stale-owner
   recovery.
5. Before each mutation dispatch, under the lock append a `started` entry and
   durably replace the manifest (write a sibling temporary file, fsync it,
   atomic rename, fsync the directory). Verify the stored entry before calling
   the tool. Persistence failure means **do not dispatch**. Hold ownership through
   reconciliation; concurrent sessions must not race this protocol.
6. After execution, independently establish the effect or proven absence of an
   effect, verify the expected/unchanged records and complete required cleanup.
   Only then atomically mark `reconciled` with outcome, timestamp and evidence.
   Keep the entry for audit; `verified` is a separate verdict requiring all checks.
   Timeouts, cancellation, exception, failed cleanup or process death leave
   `started` intact. Never clear it on an error handler or status reset.
7. Cleanup that mutates needs its own pre-dispatch entry linked by
   `parentExecutionId`. During recovery only the specifically reconciled cleanup
   action may bypass the unresolved-parent gate; uncertain cleanup itself must
   be read/reconciled before retry. Do not recursively schedule cleanup of cleanup.

Before releasing ownership, durably settle every completed entry, fsync the
manifest directory, optionally record `releasedAt` in the locked sidecar, then
unlock/close it. A crash needs no sidecar deletion: the kernel releases ownership
while the durable `started` entry remains for the next holder to reconcile.

Apply this to VERIFY, HEAL retries, Playwright/Puppeteer harnesses, manual
Workbench invocations and smoke/model evals. Disable runner-level retries and
wrap **every** dispatch, including model-selected calls, with the journal hooks.
If an external runner cannot expose those hooks, expose only read-only tools or
mark mutation evals not-run; pre-recording an entire eval is insufficient.
`status` remains read-only and reports unresolved entries without reconciling.

Migration: a missing array means historical evidence is unknown, **not** an
in-flight call. On the next execution-capable resume, initialize it to `[]`,
clear historical `verifiedAgainst`, and reset formerly verified tools to
`integrated` for fresh checks within the approved scope. Do not invent started
records for old completed runs. If the operator or logs establish an actual
interrupted legacy mutation, record it as unresolved and reconcile before replay.
Never erase existing journal entries during migration or contract invalidation.

## Resume with bounded invalidation

1. `status` reads and reports counts plus evidence age/unknowns; it never starts a
   browser, changes statuses or executes tools. `inventory` remains inventory-only.
2. In `full` or `verify`, compare recorded contracts, relevant files and the test
   environment. Unchanged inputs retain their evidence. An explicit `verify`
   still runs the selected integrated/verified tools as requested.
3. Changed implementation or environment: reset affected `verified` tools to
   `integrated`, preserve their previous evidence in the report, clear the stale
   `verifiedAgainst`, log the reason and return a completed pipeline to `verify`.
   Shared runtime/harness changes affect all dependent tools. If dependencies or
   provenance are unknown, re-verify all integrated/verified tools in the approved
   scope. Do not rescan unaffected inventory or overwrite baseline-dirty files.
4. Changed contract, role/origin authorization, or mutation scope: return affected
   tools to the human gate. Existing approval remains valid only for the same
   approved contract and test effects. Never silently approve a new origin.
5. Interrupted mutation with uncertain outcome: inspect through the UI's read
   path and reconcile disposable data/cleanup before another execution. If the
   outcome cannot be established, record a blocker; do not replay it on resume.
6. Keep rejected/skipped tools and their reasons. Reconsider them only when a
   recorded blocking condition changes or the user changes scope; return changed
   contracts to the gate. Never count skipped tools as verified coverage.

Run the usual deterministic assertions and cleanup. Re-run selection/journey
evals when names, descriptions, available tool sets or critical workflows change;
record model/backend/version and repeated-run outcomes separately from native
contract evidence. Runtime verification alone does not prove model selection or
that another client supports the same surface.

Source boundaries checked 2026-09-14: [Chrome WebMCP](https://developer.chrome.com/docs/ai/webmcp)
is experimental; [Chrome execution](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
and [Puppeteer](https://pptr.dev/guides/webmcp) have different version requirements.
The invalidation procedure above is webmcpify policy, not a WebMCP spec feature.
