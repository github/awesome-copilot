# async-profiler Output Analysis

The three main output formats — flamegraph HTML, JFR recordings, and collapsed
stacks — each tell a different story. This skill walks you through reading each
one and turning the visual patterns into concrete action.

---

## Flamegraphs (HTML or SVG)

Open `.html` output in any browser. It's interactive: hover to see exact sample
counts, click to zoom into a subtree, press Escape or click "Reset Zoom" to go back.

### How to read a flamegraph

```
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ ← leaf frames (actual CPU consumers)
       doWork()
    processItem()
  handleRequest()
      run()
▔▔▔▔▔▔▔▔▔▔▔▔▔ ← base (thread entry points)
```

- **Width = time (or allocation volume)**. A frame that's wide consumed a lot
  of the profiled resource. This is the most important thing to look at.
- **Height = call depth**. Taller stacks just mean more levels of method calls —
  depth by itself isn't a problem.
- **X-axis is NOT time**. The horizontal position has no meaning; similar frames
  are sorted alphabetically to make identical paths merge visually.
- **Leaf frames (top of each column)** are where execution actually spent time.
  Wide leaf frames = actual hotspots.
- **Intermediate frames** show the call path to the hotspot. A wide intermediate
  frame with a narrow leaf means the cost is spread across many callees, which
  is harder to optimize than a single wide leaf.

### What to look for first

1. **Wide frames near the top** — these are your primary optimization targets.
   If `serialize()` is 40% wide at the top, start there.

2. **Plateau patterns** — a wide frame that suddenly narrows just above it
   (like a plateau). The plateau frame is spending most of its time directly
   in itself (i.e., not calling further). Classic hotspot.

3. **Tall, narrow spikes** — deep call stacks that are thin. Usually framework
   overhead (reflection, proxies, Spring AOP) or recursive algorithms. Often
   hard to optimize directly.

4. **Unexpected runtime/framework frames** — if 30% of your CPU flamegraph is
   in GC or JIT compilation (`[Unknown]`, `Compiler::compile`, etc.), that's a
   signal of memory pressure or cold-start behavior, not application logic.

### Color coding

Colors in the default scheme encode frame type, not performance severity:

| Color | Frame type |
|---|---|
| Green | Java methods |
| Yellow / orange | JVM internal / native |
| Red | Kernel frames |
| Purple | C++ (JVM internals) |
| Grey | Inlined frames |

Don't read too much into colors beyond type classification.

### CPU vs allocation vs wall-clock flamegraphs

The visual grammar is identical, but what "width" means differs:

- **CPU flamegraph**: width = CPU sample count = time on-CPU
- **Allocation flamegraph**: width = bytes allocated from that call path
- **Wall-clock flamegraph**: width = wall-clock samples = total elapsed time
  including blocking

For latency investigations, compare CPU and wall-clock side by side:
- Frames that appear wide in wall-clock but narrow in CPU are spending time
  *blocked* (waiting on I/O, locks, sleep) — these are candidates for async
  refactoring or reducing external dependencies.
- Frames wide in CPU but narrow in wall-clock are actually compute-heavy.

### Common flamegraph patterns and what they mean

**"My app is mostly GC"**
Wide `GarbageCollector` or `ZGC` or `G1GC` frames in a CPU profile indicate
the JVM is spending significant CPU collecting heap. Switch to an allocation
profile (`-e alloc`) to find the code paths generating garbage.

**"I see a lot of `Object.wait` or `LockSupport.park`"**
These show up in wall-clock profiles as threads blocking. Look at the frames
just below `park`/`wait` in the stack — those are the callers waiting on
something (a queue, a lock, a CompletableFuture). That's where to investigate.

**"Everything is in reflection or proxies"**
Frames like `sun.reflect.GeneratedMethodAccessor`, Spring AOP proxies, or
Jackson deserializers. This is usually framework overhead and often not worth
optimizing unless it's genuinely dominant (>20%). Consider warming strategies
or native compilation (GraalVM).

**"Wide frame is in a library I don't control"**
Look at *your* code just below it. Can you call this library less often? Can
you cache results? Can you batch calls? The library frame tells you what's
expensive; the frames below it tell you who's calling it.

---

## JFR Files (Java Flight Recorder)

JFR files are richer than flamegraphs — they contain timestamped events,
multiple event types, JVM metrics, and more. You need a viewer to explore them.

### Opening JFR files in IntelliJ IDEA (recommended)

IntelliJ IDEA is the richest viewer for async-profiler output and the
recommended choice for day-to-day profiling work.

**IntelliJ IDEA Ultimate — built-in profiler**

Ultimate has async-profiler and JFR support built in, no plugins needed.

Open a captured `.jfr` file:
- *Run → Open Profiler Snapshot…* → select the file
- Or drag the `.jfr` file directly onto the editor

You'll see five views across the top tab bar. Start here:

1. **Flame Graph** — same reading rules as HTML flamegraphs (width = time).
   Use the search box (Ctrl/Cmd+F) to highlight all frames matching a class
   or package. Right-click any frame to jump to source.

2. **Call Tree** — hierarchical breakdown. Expand hotspots top-down to see
   exactly which call path is responsible. The "%" column shows inclusive time.

3. **Method List** — flat ranked list of methods by self-time. The fastest
   way to answer "what is the single hottest method?" Sort by *Self* to find
   direct CPU consumers; sort by *Total* for inclusive time.

4. **Timeline** — thread activity over the profiling window. Each thread is a
   row; colours show running vs. blocked vs. waiting state. Use this to spot
   contention (many threads blocked at the same moment) or to correlate a
   spike with a specific time window.

5. **Events** — raw JFR event log. Useful for GC events, class loading, JIT
   compilations, and socket I/O — things that don't show up in the flame graph.

**IntelliJ IDEA Community — install the Java JFR Profiler plugin**

Search the Marketplace for **"Java JFR Profiler"** (by parttimenerd). It adds
full JFR and async-profiler support including flame graph, call tree, and
Firefox Profiler integration:
- *Settings → Plugins → Marketplace* → search "Java JFR Profiler" → Install
- After restart: *Tools → Open JFR File…* or drag the file into the editor

**Launching async-profiler directly from IntelliJ (Ultimate)**

You can skip the terminal entirely and profile a run configuration from inside
the IDE:
- Open *Run → Edit Configurations…*
- Select your run configuration → switch to the **Profiler** tab
- Choose **Async Profiler** from the dropdown
- Click the profile button (▶ with the flame icon) instead of the normal run
- IntelliJ attaches async-profiler automatically and opens results when done

Configure which events to capture at *Settings → Build, Execution, Deployment
→ Java Profiler*.

**Navigating from flamegraph frame → source**

In IntelliJ's flamegraph view, right-clicking any frame shows:
- *Navigate to Source* — jumps directly to the method in the editor
- *Find Usages* — shows callers
- *Filter* — narrows the flame to stacks containing this frame

This makes it much faster to go from "this frame is hot" to "here's the code"
compared to any other viewer.

---

### Other viewers

**JDK Mission Control (JMC)**
- Download from https://adoptium.net/jmc/
- Strength: *Automated Analysis Report* — runs heuristics and flags findings
  with explanations. Good for a second opinion or sharing with someone who
  doesn't have IntelliJ.
- *File → Open File* or drag-and-drop

**Command-line `jfr` utility** (ships with JDK 14+)
```bash
jfr summary recording.jfr                              # what event types are present
jfr print --events jdk.ExecutionSample recording.jfr   # raw CPU samples
```

**`jfrconv`** (bundled with async-profiler — convert to flamegraph HTML)
```bash
jfrconv recording.jfr flamegraph.html         # full flamegraph
jfrconv --alloc recording.jfr alloc.html      # allocation-only flamegraph
jfrconv --cpu recording.jfr cpu.collapsed     # collapsed stacks for scripting
```

### What to examine in JMC / IntelliJ

After opening a JFR file, prioritize these views:

1. **Automated Analysis** (JMC only) — runs heuristics and flags findings
   automatically. Always start here.

2. **Method Profiling** → flame graph view of CPU samples

3. **Memory** → allocation sites, heap occupancy over time, GC events

4. **Threads** → thread states over time (runnable vs. blocked vs. waiting)
   — useful for spotting lock contention

5. **Lock Instances** → which monitors had the most contention

6. **I/O** → socket and file read/write events with durations

### Reading JFR from a `--all` combined profile

When you capture with `--all`, the JFR contains multiple event streams. In JMC,
each event type appears as a separate section. Compare:
- CPU samples vs. wall-clock: identifies blocking vs. compute-bound time
- Allocation events: find garbage-producing call paths
- Lock events: find synchronization bottlenecks

---

## Collapsed Stacks

Collapsed stack files are plain text in the format:
```
com/example/App.main;com/example/Service.process;java/util/HashMap.get 42
com/example/App.main;com/example/Service.process;java/util/HashMap.put 18
```

Each line is a semicolon-separated call stack (bottom to top) followed by
a sample count. They're the input format for the original
[FlameGraph scripts](https://github.com/brendangregg/FlameGraph) and useful
for programmatic analysis.

### Quick analysis with the bundled script

`scripts/analyze_collapsed.py` produces a ranked table of self-time and
inclusive-time frames, with percentage bars and filter support:

```bash
# Top 20 self-time and inclusive frames
python3 scripts/analyze_collapsed.py profile.collapsed

# Filter to your own code only
python3 scripts/analyze_collapsed.py profile.collapsed --grep 'com/yourcompany'

# Group by package instead of method
python3 scripts/analyze_collapsed.py profile.collapsed --packages

# Exclude framework noise
python3 scripts/analyze_collapsed.py profile.collapsed --exclude 'sun/reflect|\$\$Lambda'

# Top 40 self-time frames as CSV (for further analysis)
python3 scripts/analyze_collapsed.py profile.collapsed --self-time --top 40 --csv
```

### Manual analysis with grep/awk

```bash
# How much time in any HashMap operation?
awk '{if ($1 ~ /HashMap/) total += $NF} END {print total}' profile.collapsed

# Everything involving serialization
grep -i "serial\|jackson\|json" profile.collapsed | awk '{sum+=$NF} END{print sum}'
```

### Convert collapsed → flamegraph

```bash
# Using the original FlameGraph perl script (if installed)
flamegraph.pl profile.collapsed > flamegraph.svg

# Or regenerate HTML directly from the original JFR recording
jfrconv --cpu recording.jfr cpu.html
```

---

## Interpreting allocation profiles

Allocation flamegraphs answer "where is memory being created?" not "what's
alive on the heap?" (for live object analysis, use `-e live` or look at JFR
heap snapshots).

Key things to look for:

- **`byte[]` or `char[]` at the top** — string manipulation, serialization, or
  logging are common culprits. Look at the callers.
- **`Object[]` allocations** — often from collections growing (`ArrayList.grow`,
  `HashMap.resize`). Pre-size collections if you know the expected cardinality.
- **Allocation spikes in request-handling code** — objects created per-request
  that could be pooled or cached.
- **Framework allocations** — ORM, serialization libraries often allocate heavily.
  Consider caching deserialized objects or using streaming APIs.

---

## Interpreting lock / wall-clock profiles

When wall-clock shows threads blocked:

- **`LockSupport.park` + `AbstractQueuedSynchronizer`** — JUC locks
  (`ReentrantLock`, semaphores, etc.). Look two frames up to see which lock.
- **`Object.wait`** — classic `synchronized` monitors. The caller is your target.
- **`sun.nio.ch.EPoll.wait` or similar** — network I/O wait. Thread is blocked
  on the network. Is connection pool exhausted? Is a remote service slow?
- **`Thread.sleep`** — deliberate sleep (scheduled polling, backoff, etc.).
  Usually expected, but verify the intervals are appropriate.

---

## Worked example: reading a flamegraph

Suppose you see this pattern in a CPU flamegraph:

```
processOrder()  ← wide frame (45% of samples)
  |
  ├── ProductService.loadProduct()  ← 30% (wide)
  │    └── HibernateSession.find()  ← 30% (leaf)
  │
  └── TaxCalculator.calculate()  ← 10%
       └── BigDecimal.multiply()  ← 10% (leaf)
```

**Diagnosis:**
- 30% of CPU in `HibernateSession.find()` — likely N+1 query problem.
  Each `processOrder()` call loads a product via Hibernate one at a time.
- 10% in `BigDecimal.multiply()` — tax calculations using high-precision
  arithmetic. Often fine, but if this is called thousands of times per second,
  consider pre-computing or caching tax rates.

**Next steps:**
1. Check if `loadProduct()` could be batched or pre-fetched (JPA `@BatchSize`,
   fetch joins, or a bulk load before the loop).
2. Profile with `-e alloc` to see if Hibernate is also creating a lot of garbage.
3. If the fix is non-trivial, capture a JFR (`--all`) to get a fuller picture
   before committing to an approach.

---

## When to reach for each output format

| Situation | Best format |
|---|---|
| Quick overview, share with team | HTML flamegraph |
| Need timestamped events, JVM metrics | JFR + JMC/IntelliJ |
| Scripted / automated analysis | Collapsed stacks |
| Multi-event combined analysis | JFR with `--all` |
| Share with someone without a viewer | HTML flamegraph |
