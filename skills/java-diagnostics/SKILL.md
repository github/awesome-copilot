---
name: java-diagnostics
description: 'Symptom-first runtime diagnostics for JVM applications using JDK tools: jcmd, jstack, jmap, jstat, JFR, GC logs, async-profiler, Native Memory Tracking, and Eclipse MAT. Use when a Java app has high CPU, memory leaks or OutOfMemoryError, slow startup, deadlocks or thread starvation, long GC pauses, native memory growth, or slow requests. Includes permission tiers for safe use.'
---

# Java Diagnostics

Pick the lightest tool that answers the question, starting from the symptom.

## Permission tiers (obey them)

| Tier | Tools | Rule |
|------|-------|------|
| 1. Read-only | `jps -l`, `jcmd <pid> help/VM.version/VM.flags/Thread.print`, `jstat`, `jstack`, reading logs | May run after stating the exact command. Class histograms (`jcmd <pid> GC.class_histogram`, `jmap -histo`, `jmap -histo:live`) are NOT Tier 1: they run heap inspection at a safepoint and can pause application threads on a large heap, so treat them as Tier 2 (consent, stated overhead). The default forms and `-histo:live` additionally force a full GC; `-all=true` / `jmap -histo` skip the full GC but still pause during the scan (and count unreachable objects). |
| 2. Recording / attach | JFR (`JFR.start`, `-XX:StartFlightRecording`), async-profiler, NMT (`-XX:NativeMemoryTracking`), enabling GC logs | Requires user consent. State duration and expected overhead (JFR default profile is about 1-2%; async-profiler depends on mode; NMT summary roughly 5-10%, detail more) before running. |
| 3. Intrusive / sensitive | Heap dumps (`GC.heap_dump`, `jmap -dump`), `jhsdb`, commands that print JVM arguments or system properties (`jps -v/-lv/-m`, bare `jcmd`, `VM.system_properties`, `VM.command_line`, `jinfo`, `ps aux` on a Java process; they can expose secrets, redact output), JDWP with suspend, anything on production | Requires explicit consent, a stated target path, free-disk check (a dump is about the size of the used heap), and a stated pause. Heap dumps contain secrets (passwords, tokens, personal data). Never share or upload them; redaction is NOT a reliable safeguard. Analyze locally and delete afterwards. |

Never run Tier 2 or Tier 3 commands against production unless the user explicitly instructs it. Run diagnostic tools as the same OS user as the target JVM. Prefer reproducing on dev or staging.

## Decision table

| Symptom | First step | Then | Reference |
|---------|-----------|------|-----------|
| High CPU | Thread dumps x3 (Tier 1) + `top -H` to map hot native thread ids to `nid` | JFR or async-profiler CPU flame graph (Tier 2) | [threads](references/thread-dumps.md), [jfr](references/jfr.md), [async-profiler](references/async-profiler.md) |
| Memory leak / OOM | `jstat -gcutil`, `GC.class_histogram -all=true` twice, minutes apart (Tier 2: safepoint pause even with `-all=true`; without it a full GC too; get consent on production) | Heap dump + Eclipse MAT (Tier 3) or JFR OldObjectSample (Tier 2) | [heap](references/heap.md), [gc](references/gc.md) |
| Slow startup | `-Xlog:class+load`, framework startup/condition reports, timestamped logs | JFR from start, async-profiler wall-clock | [jfr](references/jfr.md), [async-profiler](references/async-profiler.md) |
| Deadlock / thread starvation | `jcmd <pid> Thread.print` (reports deadlocks), compare dumps over time | Virtual threads: `Thread.dump_to_file` | [threads](references/thread-dumps.md) |
| GC pauses | GC log (`-Xlog:gc*`) and `jstat -gc` | JFR GC events; tune collector/heap | [gc](references/gc.md) |
| Native memory growth (RSS grows, heap does not) | Compare RSS vs heap; enable NMT, `jcmd VM.native_memory baseline` / `summary.diff` (Tier 2) | async-profiler `nativemem` or allocator tools | [nmt](references/native-memory.md), [containers](references/containers.md) |
| Slow requests | Tracing/metrics and logs first; Actuator or Dev UI (see below) | JFR (socket/file/lock events), async-profiler wall-clock | [jfr](references/jfr.md), [async-profiler](references/async-profiler.md) |
| JVM crash / hang, no tools respond | `hs_err_pid*.log`, core dump | `jhsdb` (Tier 3) | [basics](references/jcmd-basics.md) |

Start with [jps/jcmd basics](references/jcmd-basics.md) to identify the target JVM and confirm which JDK version is running.

## Workflow

1. Capture the symptom precisely (when, how often, since which change, JDK version, container limits).
2. Choose the tier needed; state the command, its overhead, and output location, and get consent for Tier 2/3.
3. Collect data to a dedicated directory, with timestamps. Prefer several samples over one.
4. Form a hypothesis from the data, then confirm with a second source (for example a thread dump plus a flame graph).
5. Fix, re-measure with the same method, and clean up artifacts (dumps, recordings).

## Application-level insights (optional)

JDK tools see the JVM; some questions (which endpoint, which SQL query, which bean) are easier at the application level. Optional options, in order of preference:

- **Spring Boot Actuator** (`metrics`, `health`, `loggers`, `httpexchanges`) and **Quarkus Dev UI** / Micrometer metrics are built in and need no extra tool. Expose Actuator endpoints minimally; For `heapdump` and `threaddump`, follow the policy in the `spring-observability` skill: never expose them over public HTTP; the only exception is a temporary, user-consented window with authentication, TLS and network restriction, removed afterwards.
- **BootUI** (https://github.com/jdubois/boot-ui , https://www.julien-dubois.com/boot-ui/): a local-only developer console with an opt-in MCP server for Spring Boot and Quarkus. Optional. Its skill can be installed with `gh skill install jdubois/boot-ui skills/bootui`.

If considering BootUI:

- Ask the user for consent before adding any dependency or installing the skill.
- Use it in a local/dev profile only; never expose it on a network, and never enable its heap dump, thread dump endpoints or MCP server in production.
- Check the capability and version first (read its README for the supported Spring Boot / Quarkus versions) instead of assuming features.

Follow the project's own documentation for usage; this skill does not reproduce it.

## Containers

See [containers](references/containers.md) for attaching tools inside containers, `-XX:MaxRAMPercentage`, and cgroup memory limits.

## References

- [jps / jcmd basics](references/jcmd-basics.md)
- [Thread dumps and deadlocks](references/thread-dumps.md)
- [Heap, histograms, Eclipse MAT](references/heap.md)
- [GC logs and jstat](references/gc.md)
- [JFR and JDK Mission Control](references/jfr.md)
- [async-profiler](references/async-profiler.md)
- [Native Memory Tracking](references/native-memory.md)
- [Containers](references/containers.md)
- Debugger-based investigation: the `java-debugging` skill.

Official docs (prefer them over this skill for the JDK in use; change `21` to your version): `jcmd` <https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html>, `jfr` <https://docs.oracle.com/en/java/javase/21/docs/specs/man/jfr.html>, JFR guide <https://docs.oracle.com/en/java/javase/21/jfr/introduction-jdk-flight-recorder.html>, troubleshooting guide <https://docs.oracle.com/en/java/javase/21/troubleshoot/>, async-profiler releases <https://github.com/async-profiler/async-profiler/releases>.
