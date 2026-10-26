# async-profiler (Tier 2: needs consent)

Low-overhead sampling profiler (CPU, wall-clock, allocation, lock, native memory) producing flame graphs. Project: https://github.com/async-profiler/async-profiler . Download a **pinned release** from its GitHub Releases page and verify the checksum (the release API lists a sha256 digest per asset); do not pipe scripts into a shell. State the profiling duration and mode before running. Check the README of the version you use for current flags. The commands below were run against 4.5 (macOS build attached to a running JDK 27 JVM, and the `linux-arm64` build attached to a JDK 21 JVM in an `eclipse-temurin:21` container); `nativemem` needs 4.0 or newer, and `-e lock` prints "No samples were collected" when there is no contention.

## Usage (3.x/4.x launcher `asprof`)

```bash
asprof -d 30 -e cpu -f /secure/dir/cpu.html <pid>      # CPU flame graph, 30 s
asprof -d 30 -e wall -t -f wall.html <pid>             # wall-clock per thread (slow requests, startup)
asprof -d 30 -e alloc -f alloc.html <pid>              # allocations
asprof -d 30 -e lock -f lock.html <pid>                # lock contention
asprof -d 60 -e nativemem -f native.html <pid>         # native allocations (4.0+); use -f native.jfr then `jfrconv --nativemem --leak` for leak analysis
```

Use as a Java agent for startup profiling:

```
-agentpath:/path/to/libasyncProfiler.so=start,event=cpu,file=/secure/dir/startup.html
```

The report is written when the JVM exits normally (verified: `timeout 5 java -agentpath:...` produced the HTML on SIGTERM).

Open the HTML flame graph in a browser: wide frames at the top are where time goes. Use `wall` for latency (threads blocked on I/O), `cpu` for CPU burn.

## Permissions and caveats

- `cpu` mode on Linux uses `perf_events`. If it fails, check `/proc/sys/kernel/perf_event_paranoid` (needs a low value, or `CAP_PERFMON`/`CAP_SYS_ADMIN`) and `kptr_restrict`. Changing these sysctls is a host-level security change: ask the user, do not do it silently, and do not do it on shared/production hosts. Without them, use `-e ctimer` (4.x docs: like `cpu` but needs no perf_events, no kernel stacks; `-e itimer` is also accepted and ran in 4.5). In 4.5 in a default Docker Desktop container (`perf_event_paranoid=2`, no extra capabilities) plain `-e cpu`, `itimer`, `wall`, `alloc`, `lock`, `nativemem` and the `-agentpath` form all worked without relaxing security, so try the plain command before loosening anything.
- In Docker the default seccomp profile blocks `perf_event_open` (the `--cap-add SYS_ADMIN` / `seccomp=unconfined` variants were not run); running with relaxed security (`--cap-add SYS_ADMIN`, `--security-opt seccomp=unconfined`) weakens isolation: dev only.
- Attach requires the same user as the JVM. macOS support exists with limitations (no perf events).
- Flame graphs can expose class and method names from proprietary code; handle accordingly.
- Debug symbols: enable `-XX:+UnlockDiagnosticVMOptions -XX:+DebugNonSafepoints` on the target for more accurate attribution (requires a restart).
