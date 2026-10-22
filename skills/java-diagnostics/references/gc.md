# GC logs and jstat

## Unified GC logging (JDK 9+)

Enabling at startup is a restart, so treat it as Tier 2; overhead is low.

```
-Xlog:gc*=info:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=5,filesize=20m
```

On a running JVM (Tier 2):

```bash
jcmd <pid> VM.log what=gc*=info output=gc.log decorators=uptime,time
jcmd <pid> VM.log list
```

JDK 8 uses `-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log` instead.

## jstat (Tier 1)

```bash
jstat -gcutil <pid> 1000 10      # utilization %, sampled every 1s, 10 times
jstat -gc <pid> 1000 10          # capacities and sizes in KB
jstat -gccause <pid> 1000 5      # last GC cause
```

Watch: Old (`O`) occupancy after each full/mixed GC. If it keeps ratcheting up, suspect a leak (see [heap](heap.md)). Rising `FGC`/`FGCT` means frequent full GCs.

## Interpreting

- Long pauses: look at pause time per event and the cause (`Allocation Failure`, `Humongous Allocation`, `Metadata GC Threshold`, `System.gc()`).
- Frequent young GCs with high promotion: allocation rate too high or young gen too small.
- Heap near max after GC: heap too small or leak; do not just raise `-Xmx` without checking.
- Pause target: G1 default `-XX:MaxGCPauseMillis=200`; ZGC and Shenandoah target sub-millisecond-class pauses with more CPU/memory overhead. Change one tuning flag at a time and compare logs.
- Tools such as GCeasy or GCViewer can visualize logs, but GC logs may reveal internal hostnames and sizing; do not upload from sensitive environments.
- JFR also records GC events (`jdk.GarbageCollection`, `jdk.GCPhasePause`); see [jfr](jfr.md).
