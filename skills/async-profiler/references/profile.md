# async-profiler — Running Profiles

## Agent-driven background profiling

Use `scripts/collect.sh` when you need to profile while simultaneously
reproducing the workload — the standard blocking `run_profile.sh` would make
that impossible because it holds the terminal for the full duration.

`collect.sh` captures all event types (CPU, allocation, wall-clock, lock) in
a single JFR recording and produces four separate flamegraphs when done.

### When to use `collect.sh` vs `run_profile.sh`

| Scenario | Use |
|---|---|
| You need the terminal free to run load, tests, or other commands during the capture | `collect.sh start` / `collect.sh stop` |
| Fixed duration, you can background the call | `collect.sh timed -d <seconds> <PID> &` |
| Simple timed capture, terminal can block | `run_profile.sh --comprehensive` |

### `start` / `stop` workflow — full agent control

```bash
# 1. Find the JVM process
jps -l

# 2. Start profiling (returns immediately, saves session state)
bash scripts/collect.sh start <PID>

# 3. Reproduce the problem — run load tests, make requests, etc.
#    The profiler is attached and collecting.

# 4. Stop profiling and generate all flamegraphs
bash scripts/collect.sh stop <PID>
```

> ⚠️ **macOS: `asprof stop -f <path>` silently ignores the output path.**
> The JFR is written to `/var/folders/<hash>/T/<timestamp>_<pid>/<timestamp>.jfr`
> regardless of the `-f` argument. `collect.sh` handles this automatically by
> creating a sentinel file at `start` time and using `find -newer` to locate the
> JFR after `stop`. If you call `asprof stop` directly, find the file with:
> ```bash
> find /var/folders -maxdepth 8 -name "*.jfr" 2>/dev/null
> ```

Output is written to `profile-<pid>-<timestamp>/` in the current directory.
The directory contains:
- `combined.jfr` — the raw multi-event recording
- `profile-cpu.html`, `profile-alloc.html`, `profile-wall.html`, `profile-lock.html` — interactive flamegraphs

### `timed` workflow — fixed-duration background capture

Use this when you know exactly how long the workload takes:

```bash
# Start a 60-second capture in the background
bash scripts/collect.sh timed -d 60 <PID> &
PROF_PID=$!

# Run your workload here while profiling is active
./run-load-test.sh

# Wait for the profiler to finish (if workload finished faster)
wait $PROF_PID
```

`timed` blocks for the specified duration, so run it in the background with `&`.

### After collecting

Once `stop` or `timed` completes, offer to analyze the results immediately.
Read `references/analyze.md` before interpreting the flamegraphs. Each `.html`
file can be opened directly in a browser; pass `.collapsed` files to
`scripts/analyze_collapsed.py` for a ranked self-time table.

---

## IntelliJ IDEA Ultimate — no terminal needed

If the process you want to profile was launched from IntelliJ, the fastest path
is to use the built-in integration:

1. Click the **flame icon** next to the run/debug buttons (▶🔥), or use
   *Run → Profile '[configuration name]'*
2. IntelliJ attaches async-profiler automatically and opens results when done
3. To choose which events to capture (CPU, allocation, wall-clock):
   *Settings → Build, Execution, Deployment → Java Profiler*

Results open directly in IntelliJ's viewer — see `references/analyze.md` for how to
navigate the flame graph, call tree, and timeline tabs.

Use the terminal approach below when you need to profile a process that wasn't
started from IntelliJ (a remote server, a running Docker container, a
production JVM, etc.).

---

## Usually start with `--all`

**`asprof start --all` records CPU, allocation, wall-clock, and lock contention
simultaneously in a single JFR file.** That is usually the best default when
you can afford one richer capture and want optionality during analysis. You can
then split the JFR into separate flamegraphs with `jfrconv` after the fact.

`--all` does trade a broader signal set for more output to store and post-process.
Start there for intermittent or one-shot reproductions; switch to single-event
captures when you already know the signal you need or must minimize overhead,
output size, or post-processing time.

```bash
# Direct asprof — capture all events, produce a single JFR
jps -l                                    # find your PID
asprof start --all <PID>                  # attach, collect everything
# ... reproduce the problem ...
asprof stop <PID>                         # stop; JFR written to disk
                                          # ⚠️  macOS: see note below on output path

# Then split into flamegraphs:
jfrconv --cpu   combined.jfr cpu.html
jfrconv --alloc combined.jfr alloc.html
jfrconv --wall  combined.jfr wall.html
jfrconv --lock  combined.jfr lock.html
```

For agent-driven work, use `collect.sh` instead — it handles the macOS output
path bug, session state, and the JFR split automatically:

```bash
bash scripts/collect.sh start <PID>
# ... reproduce the problem ...
bash scripts/collect.sh stop <PID>
# → outputs profile-cpu.html, profile-alloc.html, profile-wall.html, profile-lock.html
```

---

## Quick start (terminal / remote processes)

### Using the bundled script

`scripts/run_profile.sh` wraps `asprof` with sensible defaults and auto-timestamped
output files.

**Default — capture all events:**
```bash
# One 30s capture → four separate flamegraphs generated in parallel
bash scripts/run_profile.sh --comprehensive -d 30 <PID>
```
This runs a single `--all` JFR capture, then uses `jfrconv` in parallel to
split it into separate CPU, allocation, wall-clock, and lock flamegraphs.
On macOS all four open in the browser automatically.

**When you already know which event type to focus on:**
```bash
# Allocation only (heap pressure / GC churn)
bash scripts/run_profile.sh -e alloc -d 60 <PID>

# Wall-clock only (latency / blocking / I/O)
bash scripts/run_profile.sh -e wall <PID>

# Target by app name instead of PID
bash scripts/run_profile.sh MyApplication
```

---

## Choose the right flamegraph to read

`--all` records everything — use `jfrconv` to pick the view that matches your
symptom:

| Symptom | View to read | `jfrconv` flag |
|---|---|---|
| High CPU, slow throughput | `--cpu` | CPU time by call stack |
| High GC pressure / heap churn | `--alloc` | Where objects are being allocated |
| Threads are blocked / latency spikes | `--wall` | All threads regardless of state |
| Slow synchronized methods | `--lock` | Java monitor contention time |

All four are captured by `asprof start --all` — just open the flamegraph that
matches your symptom. When in doubt, read the **wall-clock** view first: it
shows blocked and sleeping threads that CPU profiling misses entirely.

---

## Common profiling scenarios

### The standard approach — capture all, read what you need

```bash
# Capture everything in one session
asprof start --all <PID>
# ... reproduce the problem ...
asprof stop <PID>
# ⚠️  macOS: see output path note above — use collect.sh to handle this automatically

# Generate whichever flamegraph(s) you need:
jfrconv --cpu   combined.jfr cpu.html     # CPU hotspots
jfrconv --alloc combined.jfr alloc.html   # Garbage / allocation pressure
jfrconv --wall  combined.jfr wall.html    # Latency / blocking / I/O
jfrconv --lock  combined.jfr lock.html    # Lock contention
```

Open any `.html` in a browser. Wide frames at the top are your hotspots.

**What each view shows:**
- **CPU** — where the CPU is spending time; misses sleeping/blocked threads
- **Alloc** — which call stacks produce the most heap; wide = large allocations
- **Wall** — all threads regardless of state; best for latency/I/O investigations
- **Lock** — time spent *waiting* to acquire monitors (not holding them)

### Fixed-duration capture (blocks terminal)

```bash
# All events, 60 seconds, output to JFR
asprof -d 60 --all -f combined.jfr <PID>
```

Use `collect.sh timed` or background with `&` if you need the terminal free.

---

## Key flags to know

### Duration and output

```bash
-d N          # Profile for N seconds (e.g., -d 30)
-f FILE       # Output file; extension sets format: .html, .jfr, .txt, .collapsed
```

File extension drives format automatically:
- `.html` → interactive flamegraph (recommended for sharing)
- `.jfr` → JFR recording (for IntelliJ / JDK Mission Control)
- `.collapsed` → raw collapsed stacks (for FlameGraph scripts)
- `.txt` → plain-text summary

### Targeting

```bash
# Attach to a specific PID
asprof -d 30 -f out.html 12345

# Auto-detect if only one JVM is running
asprof -d 30 -f out.html jps

# Target by application name
asprof -d 30 -f out.html MyApplication
```

### Thread-level breakdown

```bash
# Separate flame per thread (useful for pinpointing which thread is the culprit)
asprof -d 30 -t -f out.html <PID>
```

### Sampling interval

```bash
# Sample every 1ms (default is ~10ms; lower = more detail but higher overhead)
-i 1ms

# Sample every N nanoseconds
-i 500000    # 0.5ms
```

Note: on macOS with itimer, the minimum effective interval is ~10ms regardless
of what you specify.

### Stack depth and filtering

```bash
-j 512        # Max stack depth (default 2048; reduce if stacks are very deep)

# Include only frames matching a pattern
-I 'com/mycompany/*'

# Exclude frames matching a pattern
-X 'sun/reflect/*'
```

### Long-running or manual start/stop

Sometimes you want to start profiling, do a specific action, then stop rather
than time-boxing it:

```bash
# Start profiling (runs indefinitely)
asprof start -e cpu <PID>

# ... do your thing ...

# Stop and write output
asprof stop -f profile.html <PID>

# Or dump a snapshot without stopping (live sampling continues)
asprof dump -f snapshot.html <PID>
```

> ⚠️ **macOS only:** `asprof stop -f <path>` silently ignores the `-f` path.
> Use `bash scripts/collect.sh start/stop` instead — it handles this automatically.
> If calling `asprof` directly, find the output with:
> ```bash
> find /var/folders -maxdepth 8 -name "*.jfr" 2>/dev/null
> ```

---

## Continuous profiling

For finding intermittent regressions, profile in a loop and dump results
periodically:

```bash
# Dump a new flamegraph every 60 seconds, cycling indefinitely
# %t in the filename is replaced with a timestamp
asprof -e cpu --loop 60s -f /tmp/profile-%t.html <PID>
```

---

## Attach as Java agent (no dynamic attach)

If the JVM doesn't allow dynamic attach (common in locked-down environments),
use the agent at startup:

```bash
java -agentpath:/path/to/libasyncProfiler.so=start,event=cpu,interval=1ms,file=output.html,duration=60 \
     -XX:+UnlockDiagnosticVMOptions -XX:+DebugNonSafepoints \
     -jar myapp.jar
```

Agent options are comma-separated after the `=`. Duration is in seconds.

---

## macOS-specific notes

- Default CPU engine is **itimer** — works without elevated privileges
- No kernel frame collection (platform limitation, not a bug)
- itimer has a known bias toward system calls; wall-clock (`--wall`) is often
  more representative for latency investigations on macOS
- Minimum sampling interval ~10ms (kernel timer resolution)

These limitations don't make macOS profiling useless — CPU and wall-clock
flamegraphs are still highly actionable for application-level code.

---

## Overhead and production use

async-profiler is designed to be low-overhead:

- **CPU profiling**: ~1-3% overhead at default intervals
- **Allocation profiling**: ~1-5% depending on allocation rate (uses TLAB sampling)
- **Wall-clock**: ~1% overhead (timer-based, not instruction-based)

It's reasonable to run brief (30-60s) profiles in production. For longer sessions,
use the `--memlimit` flag to cap memory usage:

```bash
asprof -d 300 --memlimit 256m -f profile.html <PID>
```

---

## jfrconv syntax

Convert a JFR recording to flamegraphs:

```bash
jfrconv --cpu   combined.jfr cpu.html
jfrconv --alloc combined.jfr alloc.html
jfrconv --lock  combined.jfr lock.html
jfrconv --wall  combined.jfr wall.html
```

> ⚠️ The event flag (`--cpu`, `--alloc`, etc.) must come **before** the input
> file. The form `jfrconv input.jfr --event cpu output.html` does not work.

---

## Session layout (recommended)

Store all output in one versioned directory per session:

```
profiling/
  session-1/
    combined.jfr
    profile-cpu.html
    profile-alloc.html
    profile-wall.html
    profile-lock.html
    findings.md
```

---

## After profiling: always offer to analyze

Once a profile capture completes, **always offer to analyze the results
immediately** — don't wait for the user to ask. Say something like:

> "The profile is saved at `profile-all-20250409-143201-cpu.html`. Want me to
> analyze it and identify the bottlenecks?"

Then read `references/analyze.md` and interpret the output. If it's a JFR file,
offer to run `jfrconv` to extract flamegraphs first. If it's collapsed stacks,
offer to run `scripts/analyze_collapsed.py`. The user has already done the hard
part (reproducing the problem) — close the loop for them.
