# Java Flight Recorder (Tier 2: needs consent)

JFR is built into OpenJDK 11+ (and Oracle JDK 8u262+/OpenJDK 8u262+). Default overhead of the `default` settings is low (about 1% or less); `profile` settings collect more at a few percent. State the duration and settings before starting.

## Start

At startup:

```
-XX:StartFlightRecording=filename=/secure/dir/rec.jfr,duration=120s,settings=profile
```

On a running JVM:

```bash
jcmd <pid> JFR.start name=diag duration=120s settings=profile filename=/secure/dir/rec.jfr
jcmd <pid> JFR.check
jcmd <pid> JFR.dump name=diag filename=/secure/dir/rec.jfr
jcmd <pid> JFR.stop name=diag
```

For a continuous low-overhead recording to dump after an incident, use `maxage=30m maxsize=250m` with `settings=default`, and set `disk=true` limits so storage is bounded.

Leak candidates: add `path-to-gc-roots=true` when dumping (`JFR.dump ... path-to-gc-roots=true`), which includes the `jdk.OldObjectSample` event and costs extra time.

## Analyze (command line)

```bash
jfr summary rec.jfr                               # event counts
jfr print --events jdk.ExecutionSample rec.jfr | head
jfr print --events jdk.GarbageCollection rec.jfr
jfr print --events jdk.JavaMonitorEnter,jdk.ThreadPark rec.jfr
jfr print --events jdk.VirtualThreadPinned rec.jfr
jfr print --json --events jdk.SocketRead rec.jfr
```

Useful events: `jdk.ExecutionSample` (CPU hot methods), `jdk.ObjectAllocationSample` (allocation), `jdk.GCPhasePause`, `jdk.JavaMonitorEnter` (lock contention), `jdk.SocketRead`/`jdk.FileRead` (slow I/O), `jdk.ClassLoad`, `jdk.CPULoad`, `jdk.NativeMethodSample`.

`jdk.VirtualThreadPinned` (JDK 21+, in the default profile, 20 ms threshold) reports virtual threads that blocked while pinned; verified on JDK 21.0.12 and 27. It is the replacement for `-Djdk.tracePinnedThreads` (JDK 21-23 only, see [thread-dumps](thread-dumps.md)).

## JDK Mission Control

Open the `.jfr` file in JDK Mission Control (JMC, separate download from https://adoptium.net/jmc or the Oracle/Eclipse distributions). The Automated Analysis page gives ranked findings; the Method Profiling, Memory, Lock Instances, and I/O pages drill down. Open recordings locally; they contain stack traces, system properties, and sometimes command lines or environment details, so do not share them from sensitive environments.
