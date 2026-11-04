# Native Memory Tracking (Tier 2: needs consent)

Use when container RSS grows but heap usage does not. NMT tracks JVM-internal allocations (metaspace, thread stacks, code cache, GC structures, direct buffers via `Internal`/`Other`), not arbitrary native library `malloc`.

Enable at startup (needs a restart; Oracle documents a 5-10% JVM performance drop with NMT enabled, plus extra malloc header memory, and `detail` costs more; measure on your workload):

```
-XX:NativeMemoryTracking=summary
```

Then:

```bash
jcmd <pid> VM.native_memory summary
jcmd <pid> VM.native_memory baseline
# ... wait while the problem develops ...
jcmd <pid> VM.native_memory summary.diff
```

Use `detail` only for short sessions (higher overhead). It cannot be enabled on a running JVM.

## Common growth areas

| Category | Typical cause | Mitigation |
|----------|---------------|-----------|
| Thread | Too many threads (stack ~1 MB each) | Bound pools; virtual threads; `-Xss` |
| Class | Classloader leak, dynamic proxies | Fix leak; `-XX:MaxMetaspaceSize` |
| Code | Large JIT code cache | `-XX:ReservedCodeCacheSize` |
| GC | Remembered sets/card tables for big heaps | Right-size heap |
| Internal/Other | Direct `ByteBuffer`, Netty pools | `-XX:MaxDirectMemorySize`, check pooling |
| Not in NMT | JNI/native libraries, glibc arenas | async-profiler `nativemem`; `MALLOC_ARENA_MAX=2`; allocator profiling |

Total RSS ≈ heap + metaspace + threads + code cache + direct buffers + native libs. Compare against the container memory limit (see [containers](containers.md)).
