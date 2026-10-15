# Language Notes

Reuse an existing logger or reporting utility first. These notes describe standalone CLI streams; hosted functions and services may need their own logging contract.

## Python

- Send diagnostic messages through a logger configured for stderr, or use `print(..., file=sys.stderr, flush=True)` for a small standalone script. Do not configure the root logger inside a reusable library.
- Use `time.monotonic()` for reporting intervals. `-u` or `PYTHONUNBUFFERED` can help with subprocess output, but verify the actual logger/stream path.
- Handle ordinary item exceptions according to the existing policy. Keep `KeyboardInterrupt` and other control-flow exceptions out of a broad item-error catch.
- Return the agreed code from `main` and use `raise SystemExit(main())` only at the executable entry point.

The [Python probe](../examples/batch.py) uses the standard library and never accesses external data.

## PowerShell

- `Write-Output` writes to the success stream, so it can corrupt returned objects or JSON. Use the existing information/error streams when the host contract supports them; for a standalone native CLI, `[Console]::Error.WriteLine(...)` and `Flush()` provide explicit stderr output.
- `Write-Progress` depends on the host and preferences. It may be invisible in CI or redirection; do not use it as the only evidence of progress.
- Ctrl+C and host stop are host-managed, and behavior can differ by host and version. Preserve the existing stop behavior; do not catch broad exceptions and count host cancellation as an item failure. Use `finally` for cleanup where applicable, but do not promise a final summary after the host stops the pipeline. If graceful cancellation reporting is part of the contract, test the real cancellation path in each supported host; a simulated fixture does not establish it.
- Use `[System.Diagnostics.Stopwatch]` for elapsed intervals. Avoid a blocking `Start-Sleep` heartbeat in the same processing loop.
- Check terminating errors and non-terminating errors separately. Use `-ErrorAction Stop` at a specific cmdlet boundary when that matches the established policy; changing `$ErrorActionPreference` globally can change processing behavior.
- Capture native `$LASTEXITCODE` immediately after the native command. On Windows PowerShell 5.1, do not assume a nonzero native exit is a catchable terminating exception.
- Use `exit` only in a standalone entry point. A function/module should return its agreed result or raise its agreed error without terminating the host.

The [PowerShell probe](../examples/batch.ps1) is a standalone script compatible with Windows PowerShell 5.1 and PowerShell 7. Its cancellation case is simulated, not an OS-signal test.

## Node.js

- `console.log` targets stdout; `console.error` targets stderr. For a stable record format, use the established logger or explicit stream writes.
- Use `performance.now()` or `process.hrtime.bigint()` for elapsed intervals. For redirected writes, respect backpressure and wait for `drain` when `write` returns false.
- Set `process.exitCode` after reporting instead of immediately calling `process.exit()`, which can truncate pending output.
- A timer heartbeat requires an available event loop. Synchronous CPU-bound processing blocks timers; do not add worker threads merely to decorate output.
- Integrate SIGINT/SIGTERM with existing cancellation and cleanup. Do not turn cancellation into a retriable item failure.

The [Node.js probe](../examples/batch.mjs) has no dependencies and uses an async output emitter.

## Executable Overrides

The verifier defaults to `py -3` and `powershell.exe` on Windows, or `python3` and `pwsh` elsewhere. Set `BATCH_PYTHON` to a Python executable path (not a shell command) to override the Python launcher; set `BATCH_POWERSHELL` similarly. Node.js uses the interpreter running the verifier.

On Windows the verifier passes `-ExecutionPolicy Bypass` only to its child PowerShell process so an unsigned local fixture can run. It does not change stored machine/user policy, and organization-enforced policy can still block it. Review the bundled fixture before running it; do not extend this setting to untrusted scripts.

Each probe accepts `normal`, `mixed`, `partial-zero`, `empty`, `unknown`, `fail-fast`, `cancelled`, or `live`. The fixture contract continues after failures except in `fail-fast`; codes are 0 for complete success, 1 for `mixed`/fail-fast, and 130 for simulated cancellation. The `partial-zero` fixture preserves a zero exit contract while reporting an honest partial outcome and one failed item. These are fixture choices, not imposed production exit codes. In `live`, the probe waits for one stdin line after the first progress notification so the verifier can prove pre-exit delivery without guessing a delay.
