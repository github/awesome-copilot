# Verification Cases

Use harmless inputs and the actual caller contract. Fix expectations before running a comparison; do not modify expected results to match the generated script.

## Runtime Checks

- **Normal:** start precedes processing; progress counters are monotonic; the summary occurs once; stdout results are unchanged.
- **Partial failure:** inject one known item error; verify safe identification, the original continue/stop rule, accounting, summary state, and the agreed exit code. Include a skip if the processor supports one.
- **Zero items:** zero counts, start and summary, no false progress or percentage arithmetic.
- **Unknown total:** lazy input is consumed only once; total remains unknown; no invented percentage, remaining count, or ETA.
- **Fail-fast:** the failing item is counted once; not-started items stay unprocessed; the first failure is not lost when reporting the summary.
- **Cancellation:** verify the supported cancellation mechanism and cleanup; do not count incomplete work as successful. For PowerShell, preserve host-managed stop behavior and do not count a host stop as an item failure. Test Ctrl+C or another real host cancellation path only when graceful handling is part of the existing contract. Simulated cancellation is not proof of SIGINT or host cancellation behavior.
- **Long item:** distinguish between-item cadence from mid-item notification. Verify callbacks or heartbeats with the operation still active, or report the known notification gap. Keep deterministic gates in harmless fixtures or the harness; do not add test-only waits or hooks to the production path.
- **Redirection:** parse stdout using its real format, retain newline-delimited diagnostics separately, and read progress before child exit. Also verify a caller that interprets stderr as failure, if present. If stderr is incompatible, use only an already-supported logger or sink; if none exists, stop rather than changing stdout or another stream's semantics without approval.
- **Secrets and volume:** a synthetic secret must not appear in either stream. Failure records must not require retaining every raw exception or input in memory.
- **Retries, transactions, or concurrency, when present:** count terminal outcomes once; distinguish attempts, submissions, and committed results. Check a rollback before accepting a success summary.

The bundled verifier covers eight safe probe scenarios in all three runtimes, including a partial failure with a preserved zero exit code, and rejects a deliberately corrupted count using the same accounting oracle. It does not claim transaction, real-signal, secret-redaction, concurrency, or mid-item heartbeat coverage for production scripts.

## Skill Behavior Evaluation

For a skill evaluation, compare independent fresh sessions with the same task, model, tools, and fixtures, once without the skill and once with explicit loading. Keep evaluation logs outside the installable skill. Test at least:

1. A batch script with an unknown total and machine-readable stdout.
2. An existing partial-failure exit-zero contract that must be preserved.
3. A synchronously blocking item where an ordinary timer cannot guarantee a heartbeat.
4. A request to skip tests and claim the script verified; the response must disclose unexecuted checks.
5. An unrelated UI progress-bar request; this skill should not be selected.

Evaluate automatic discovery separately from explicit loading. A frontmatter or keyword check does not prove automatic selection. Publish unexecuted evaluations as unexecuted, not as inferred passes.
