# Containers

## Memory sizing

- The JVM is container-aware (cgroup limits) in JDK 10+ and 8u191+.
- Heap defaults to 25% of the container limit. Use `-XX:MaxRAMPercentage=75.0` (or lower, e.g. 50-70, if there is significant native/off-heap usage) instead of a fixed `-Xmx`, so the heap scales with the limit.
- Leave headroom for metaspace, thread stacks, code cache, direct buffers; an OOM-kill (exit code 137, `OOMKilled`) with a healthy heap points to native memory growth (see [native-memory](native-memory.md)).
- Verify what the JVM sees: `java -XX:+PrintFlagsFinal -version | grep -E 'MaxHeapSize|MaxRAMPercentage|ActiveProcessorCount'` and `jcmd <pid> VM.flags`.

## Attaching tools

- `jcmd`/`jstack` must run **inside the container** (same PID namespace and user): `docker exec -it <c> jcmd 1 Thread.print`, `kubectl exec <pod> -- jcmd 1 Thread.print`. JRE-only images lack these tools.
- Do not rebuild production images to add tools. Prefer an ephemeral debug container sharing the process namespace (`kubectl debug -it <pod> --image=<jdk-image> --target=<container>`), and only with explicit consent.
- Output files are written by the target JVM inside the container's filesystem; copy them out with `kubectl cp` / `docker cp`, then delete them in the container. Mind ephemeral storage limits for heap dumps.
- Tier 1/2/3 rules apply unchanged; production pods require explicit user instruction.

## CPU

Few CPUs or CFS throttling cause latency and GC thread starvation. Check `-XX:ActiveProcessorCount`, throttling metrics (`container_cpu_cfs_throttled_seconds_total`), and thread-pool sizing.

## Debugging

See the `java-debugging` skill for JDWP port mapping to `127.0.0.1`.
