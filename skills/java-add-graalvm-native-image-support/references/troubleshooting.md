# Common native image errors and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `ClassNotFoundException`, `NoSuchMethodException`, `NoSuchFieldException` at runtime | missing reflection metadata | tracing agent; framework hints; `reflect-config.json` |
| `MissingReflectionRegistrationError` | same, reported precisely | register the named type/member |
| Resource `null` / `FileNotFoundException` for classpath files | resource not included | `resource-config.json` pattern; framework resource setting |
| `Proxy class defined by interfaces [...] not found` | missing proxy metadata | `proxy-config.json` / framework hints |
| `Classes that should be initialized at run time got initialized during image building` | build-time init of a class holding runtime state (random, sockets, threads, system properties) | `--initialize-at-run-time=<class>` |
| `Object of type X was found in the image heap` (random, threads, file handles) | build-time init stored non-image-safe state | move init to run time for the owning class |
| `Detected a started Thread in the image heap` | thread started in a static initializer | defer to run time |
| `UnsatisfiedLinkError` | missing JNI/native lib | `jni-config.json`; ship or link the native library |
| `Unsupported features in ...` / `Discovered unresolved type during parsing` | an optional dependency is missing or the library is unsupported | add the dependency; upgrade the library; check the reachability metadata repository |
| Serialization errors (`java.io.Serializable`) | missing serialization metadata | `serialization-config.json` / framework hints |
| Out of memory during build | native build needs several GB | raise container/CI memory; `-J-Xmx<size>` as a build arg; close other processes |
| Build very slow | normal for full optimization | `-O b` for dev only; use CI caching; build only in a profile |
| Binary behaves differently from JVM | build-time initialization, missing metadata, no dynamic class loading | native tests; tracing agent over the full test suite |
| Large binary | many dependencies | review dependencies; `-Os`; on Oracle GraalVM check `--emit build-report` (not available in Community Edition) |
| Dynamic class loading, `Class.forName` on unknown names, agents, `MethodHandles` tricks | not supported in native images | refactor to static registration |

## Diagnosis workflow

1. Run the build with `-H:+ReportExceptionStackTraces` for the full error.
2. On Oracle GraalVM, add `--emit build-report` to see what pulled classes in (Build Report is not available in GraalVM Community Edition; use the standard build output there).
3. For runtime errors, run the same scenario with the tracing agent on the JVM and diff the output against your metadata.
4. On Oracle GraalVM, use the build report to find which dependency causes the size or initialization problem.

## Cautions

- Dependency/framework upgrades and CI or runner changes require user approval even when suggested above; preserve managed versions and rerun the JVM baseline after dependency changes.
- `--initialize-at-build-time` is an optimization with risks; apply it to named classes, not broad packages, unless the framework documents it.
- `--report-unsupported-elements-at-runtime` only delays failures; use it for diagnosis, not as a fix.
- Native binaries are platform-specific; build on the target OS/architecture (or in a matching container).
