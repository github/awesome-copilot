# async-profiler Setup

async-profiler (v4.3+) is a low-overhead sampling profiler for Java. It avoids the
"safepoint bias" of standard JVM profilers by using HotSpot-specific APIs, and it
can profile CPU, memory allocation, wall-clock time, and lock contention.

## Do you need to install anything?

**If you're using IntelliJ IDEA Ultimate**, async-profiler is already bundled —
no installation needed for profiling apps you run from the IDE. You can profile
any run configuration right now by clicking the flame icon (▶🔥) next to the run
button, or via *Run → Profile*. Jump straight to `references/profile.md` if
that's your use case.

You do still need a standalone install if you want to:
- Profile a process not launched from IntelliJ (remote server, Docker, SSH)
- Use `asprof` from the terminal or CI pipeline
- Run `scripts/run_profile.sh` or `scripts/analyze_collapsed.py`
- Use IntelliJ IDEA Community (no built-in profiler)

**Everyone else** (Community edition, terminal-only, production servers):
continue below.

---

## Step 1 — Download

The latest stable release is **v4.3** (January 2025). The skill includes an
install script that handles everything automatically.

### Option A — use the bundled install script (recommended)

`scripts/install.sh` auto-detects the platform (macOS arm64/x64, Linux x64/arm64),
downloads the right binary, removes the macOS Gatekeeper quarantine flag, and
verifies the install:

```bash
bash scripts/install.sh               # installs to ~/async-profiler-4.3/
bash scripts/install.sh /opt          # installs to /opt/async-profiler-4.3/
```

It prints the exact binary path and a one-liner to add it to your PATH.

### Option B — manual install

**macOS (Intel or Apple Silicon):**
```bash
# Using Homebrew (easiest)
brew install async-profiler

# Or download directly
curl -LO https://github.com/async-profiler/async-profiler/releases/download/v4.3/async-profiler-4.3-macos.zip
unzip async-profiler-4.3-macos.zip
```

**Linux x64:**
```bash
curl -LO https://github.com/async-profiler/async-profiler/releases/download/v4.3/async-profiler-4.3-linux-x64.tar.gz
tar xf async-profiler-4.3-linux-x64.tar.gz
```

**Linux arm64:**
```bash
curl -LO https://github.com/async-profiler/async-profiler/releases/download/v4.3/async-profiler-4.3-linux-arm64.tar.gz
tar xf async-profiler-4.3-linux-arm64.tar.gz
```

After extracting, add `bin/` to your PATH:
```bash
export PATH="$PWD/bin:$PATH"
# Or permanently in ~/.zshrc / ~/.bashrc
```

Verify:
```bash
asprof --version
```

## Step 2 — Platform-specific configuration

### macOS

On macOS, async-profiler works out of the box with no extra configuration. The
default CPU sampling engine is **itimer**, which works without elevated privileges.

**Important limitation to communicate to the user:** On macOS, async-profiler
cannot collect kernel stack frames and the itimer engine has a known bias toward
system calls. CPU profiles are still very useful, but they reflect user-space
time more faithfully than kernel time. This is a platform constraint, not a bug.

### Linux — enabling kernel stack traces (optional but recommended)

On Linux, async-profiler prefers the **perf_events** engine, which gives the most
accurate profiles and includes kernel frames. It requires:

```bash
# Allow non-root perf_events with kernel stack traces for processes you own
sudo sysctl kernel.perf_event_paranoid=0
sudo sysctl kernel.kptr_restrict=0
```

To make these permanent across reboots, add to `/etc/sysctl.d/99-perf.conf`:
```
kernel.perf_event_paranoid=0
kernel.kptr_restrict=0
```

If perf_events isn't available (e.g., inside a container), async-profiler
automatically falls back to **ctimer** — no action needed.

### Linux — container / Docker

In containers, perf_events is typically restricted by seccomp. async-profiler
still works via the itimer/ctimer fallback. If you want full perf_events inside a
container, the container needs `--cap-add SYS_ADMIN` or `--privileged` (use
judiciously in production).

## Step 3 — Configure the JVM for better profiles

Add these flags when starting your Java application. They're optional but make
profiles significantly more accurate by allowing the JVM to provide stack frames
even between safepoints:

```bash
java -XX:+UnlockDiagnosticVMOptions -XX:+DebugNonSafepoints -jar myapp.jar
```

If you're using a framework that manages JVM startup (Spring Boot, Quarkus, etc.),
set these in `JAVA_TOOL_OPTIONS`:
```bash
export JAVA_TOOL_OPTIONS="-XX:+UnlockDiagnosticVMOptions -XX:+DebugNonSafepoints"
```

## Step 4 — Verify everything works

Find your Java process PID first:
```bash
jps -l          # lists all JVM processes with their main class
# or
ps aux | grep java
```

Then run a quick 5-second test profile:
```bash
asprof -d 5 <PID>
```

You should see output like:
```
Profiling for 5 seconds
--- Execution profile ---
Total samples       : 453
...
```

If it works, you're ready to profile. If you hit errors, see the troubleshooting
section below.

## Troubleshooting common issues

**"Could not attach to <PID>"**
- The JVM may need `-XX:+PerfDataSaveToFile` or you may lack permissions. Run as
  the same user that owns the JVM process, or use `sudo`.

**"Failed to open perf_events"**
- Run the sysctl commands in Step 2, or use `-e itimer` to force the itimer engine.

**"No such process"**
- Double-check the PID with `jps -l`. JVM processes can restart under a new PID.

**Homebrew install on macOS says "permission denied" running asprof**
- `chmod +x $(brew --prefix async-profiler)/bin/asprof`

**macOS Gatekeeper blocks the binary**
- `xattr -d com.apple.quarantine /path/to/asprof` (removes the quarantine flag)

## Using async-profiler as a Java agent

If you can't attach dynamically (e.g., the JVM was started with
`-XX:-UseDynamicCodeDeoptimization`), use the Java agent mode:

```bash
java -agentpath:/path/to/libasyncProfiler.so=start,event=cpu,file=profile.html \
     -jar myapp.jar
```

This starts profiling from the first moment the JVM launches, which is useful
for capturing startup performance.

## What's next

Once installed, move to `references/profile.md` to run a profiling session and
choose the right event type for your problem (CPU, memory, wall-clock, or lock
contention).
