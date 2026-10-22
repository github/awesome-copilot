---
name: batch-script-progress
description: 'Design and verify runtime output when creating or modifying Python, PowerShell, or Node.js scripts that process multiple files, records, or API requests. Use for batch scripts, bulk operations, silent long-running loops, progress reporting, per-item failures, final counts, stdout separation, or exit-status consistency. Not for UI progress bars, monitoring infrastructure, or progress updates in the AI conversation.'
---

# Batch Script Progress

Make generated batch scripts observable while they run, without changing their processing contract. Design start, periodic progress, per-item failure, and final-summary output together with result streams and exit status. A progress-bar library alone does not establish this contract.

## 1. Fix the existing contract

Read the script, callers, and nearby tests before editing. Identify:

- Input unit, known or unknown total, and whether enumeration is lazy.
- Existing stdout format and consumers, runtime version, and interactive versus redirected execution.
- Continue-on-error or fail-fast policy, retry rules, skip rules, transaction boundaries, and cancellation behavior.
- Existing exit codes and what callers treat as success.

Preserve these decisions. Do not add retries, parallelism, dependencies, or a new failure policy just to add progress output. If partial failures currently return zero, report the partial outcome honestly while keeping that exit contract. If the contract is missing or contradictory, ask for the decision that changes behavior; do not silently make it.

## 2. Define the output contract before implementation

Choose a small, stable vocabulary and fields, reusing the repository logger where suitable:

- **Start:** operation name, total or explicit unknown, and initial counters. Emit before expensive enumeration; discovery itself may need progress.
- **Progress:** processed, succeeded, failed, skipped, total or unknown, and elapsed time. Add a sanitized current-item identifier only when useful.
- **Item failure:** safe identifier, failure category or sanitized reason, and whether processing will continue. Emit when observed, independently of the normal progress interval.
- **Summary:** completed, partial, failed, or cancelled; final counters; elapsed time; known unprocessed count if available; and the exit status required by the existing contract.

Define `processed = succeeded + failed + skipped` for items that reached a terminal outcome. Keep in-flight and not-started items separate. Count each item once; retry attempts are not additional processed items. Do not label an item successful before its required commit, write, or acknowledgement. If a transaction rolls back, report rolled-back work rather than claiming durable success.

For an unknown total, report counts without a fabricated percentage, ETA, or remaining count. Do not materialize a stream just to count it. For zero items, emit start and summary with zero counts; never divide by zero.

## 3. Choose output streams and cadence

Reserve stdout for the established machine-readable result, pipeline objects, or protocol. Put progress and diagnostics on a separate channel; stderr is the portable default for standalone CLI scripts. Stderr output alone does not imply failure: callers must use the agreed exit code and result contract. Verify callers that treat any stderr as failure before changing their output. If stdout is reserved and stderr is incompatible, use an existing compatible logger or sink only when the caller already supports it. Do not move progress to stdout or another stream with changed semantics. If no compatible channel exists, stop and ask whether the output contract may change, or report that progress cannot be added safely.

Use a bounded cadence, such as every configured number of items **or** elapsed interval, rather than unconditionally logging every item. Emit start, failures, and summary regardless of that cadence. Preserve required per-item audit records separately. Avoid unbounded in-memory failure lists and repeated stack traces. Redact credentials, query parameters, personal data, and sensitive paths before formatting; do not dump raw exceptions or whole input records by default.

Use monotonic time for intervals and duration. Ensure output is flushed or drained so notifications arrive before exit. Use plain newline-delimited records under redirection; enable terminal rewriting or colors only for an appropriate TTY. Keep log-field meanings consistent across languages, not necessarily their exact formatting or libraries.

**A time check at the end of a loop cannot emit while one item is blocking.** For a long item, use existing progress callbacks, stage notifications, or a safely integrated heartbeat where the runtime permits it. A Node.js timer cannot run through synchronous event-loop blocking; a PowerShell progress display is not a durable log. If mid-item progress cannot be added without changing execution semantics, emit the current stage before it starts and disclose the notification gap. Do not promise a periodic heartbeat that the implementation cannot deliver.

## 4. Implement the smallest compatible change

Read [language notes and safe examples](references/language-notes.md) for the selected runtime. The examples are executable output-contract probes, not production processors; adapt their emitter and accounting to the existing code rather than copying their failure policy.

Keep reporting separate from processing decisions. In concurrent code, serialize reporting through the coordinator and count completed outcomes, not submissions. On handled failure or cancellation, attempt one final summary and preserve the original outcome; a summary-write error must not replace the original processing exception. Do not swallow cancellation as an ordinary item failure. For host-managed cancellation, including PowerShell host stops, preserve the existing host behavior; do not convert stop exceptions into item failures or promise a final summary after host termination. Use `finally` for applicable cleanup, but verify the actual cancellation path in the supported host when graceful cancellation is part of the contract.

Do not force successful termination to deliver buffered output. In Node.js prefer setting `process.exitCode` and draining writes over an immediate `process.exit()`. Respect existing host/library semantics in PowerShell: a reusable function should not exit its caller. Forced termination, process crashes, and broken output pipes can prevent final reporting; do not claim otherwise.

## 5. Verify before reporting completion

Read [verification cases](references/verification.md), then run focused tests for the changed script with harmless fixtures. Capture stdout and stderr separately and check the real exit status. Verify start/progress ordering, monotonic counters, sanitized failures, exactly one summary on supported paths, and unchanged result contents and processing policy.

Prove liveness by reading the child process output **while it is still running**, not by examining output collected after exit. Check both terminal and redirected behavior when both are supported. A controlled pause after a progress event is a useful deterministic probe: receive the event, confirm the child has not exited, then release it. Keep such gates in harmless test fixtures or the test harness; do not add stdin waits, sleeps, or cancellation hooks to normal production processing solely to make a test pass. Prefer an existing callback or injectable processing boundary. If no safe deterministic seam exists, test the real path only with harmless inputs or report liveness as unverified. A watchdog may fail the test; it must not manufacture a successful result.

The bundled [cross-language verifier](tests/verify-examples.mjs) runs the [Python](examples/batch.py), [PowerShell](examples/batch.ps1), and [Node.js](examples/batch.mjs) probes with normal, partial-failure, preserved partial-failure exit-zero, empty, unknown-total, fail-fast, simulated-cancellation, and live-output cases. It checks the probes only; it does not prove that an arbitrary generated script or automatic skill selection works.

Run it from this skill folder with Node.js 20 or later:

```text
node tests/verify-examples.mjs
```

It also requires Python 3.9 or later and PowerShell 5.1 or later. See the language notes for executable overrides. Missing runtimes are failures, not silently skipped coverage.

## Deliverables

Return the changed script, its output/exit contract, and focused verification results. Distinguish executed tests from inspection and unexecuted cases. Do not call the script verified merely because it prints a progress bar or the skill metadata passes validation.

## Gotchas

- Counting before logging can make discovery silently consume an entire stream.
- Writing status with PowerShell `Write-Output` adds strings to the success pipeline.
- Measuring only buffered output after exit cannot prove progress visibility.
- A final message saying `completed` hides partial failure unless the outcome and counters explain it.
- `finally` is not a guarantee of reporting after forced termination.
