# Heap, histograms, Eclipse MAT

## Tier 2: class histogram (no full GC with `-all=true`, but still a safepoint pause)

```bash
jcmd <pid> GC.class_histogram -all=true | head -40   # no GC; includes unreachable objects
jmap -histo <pid> | head -40                          # no GC
jcmd <pid> GC.class_histogram | head -40             # full GC, live objects only
jmap -histo:live <pid> | head -40                    # full GC, live objects only
```

All four run heap inspection at a safepoint, which can pause application threads for the duration of the scan on a large heap: on production, get explicit consent and state the overhead first. The last two also force a full GC. The first two avoid the full GC but may count garbage that is not yet collected. Take two histograms several minutes apart under load; classes whose instance count and bytes keep growing are leak suspects.

## Tier 3: heap dump (explicit consent required)

Before running: state the target path, check free disk (`df -h`; roughly the used heap size), and warn of a stop-the-world pause proportional to heap size. Write to a restricted directory (`chmod 700`).

```bash
jcmd <pid> GC.heap_dump /secure/dir/heap.hprof          # live objects only (full GC)
jcmd <pid> GC.heap_dump -all=true /secure/dir/heap.hprof # include unreachable objects
```

`jmap -dump:live,format=b,file=heap.hprof <pid>` is the older equivalent. The file is written by the target JVM, so the path must be writable by it (and inside the container if containerized).

**Sensitive data**: a heap dump contains everything in memory: credentials, tokens, session data, personal data. Never upload or share it (including with AI services or issue trackers). Redaction is not a reliable safeguard. Analyze locally and securely delete the file when done.

Automatic dump on OOM (an opt-in startup flag, still Tier 3 because of the data and disk usage):

```
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/secure/dir/
```

Set `HeapDumpPath` to a volume with enough space; in containers an unbounded dump can fill the node.

## Analyze with Eclipse MAT

1. Install Eclipse Memory Analyzer (https://eclipse.dev/mat/) from the official download page. It needs a Java runtime and a heap of about 1.5x the dump size (edit `MemoryAnalyzer.ini`, `-Xmx`).
2. Open the `.hprof`; run the **Leak Suspects** report first.
3. Use the **Dominator Tree** (sorted by retained heap) to find what holds memory.
4. For a suspect object, **Path to GC Roots, excluding weak/soft references** shows why it is not collected.
5. Compare two dumps with the histogram comparison to confirm growth.
6. Common causes: unbounded caches or maps, static collections, listeners never removed, ThreadLocals in pooled threads, classloader leaks on redeploy, large result sets.

Headless parsing is available through `ParseHeapDump.sh` in the MAT distribution (`-vmargs -Xmx...`), producing report ZIPs.

## Alternative (Tier 2)

JFR with `jdk.OldObjectSample` and path-to-gc-roots (`path-to-gc-roots=true`) finds leak candidates without a full dump; see [jfr](jfr.md).
