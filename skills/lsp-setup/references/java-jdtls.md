# Java code intelligence with jdtls

Details for the Java entry in [lsp-servers.md](lsp-servers.md). LSP is optional for Java: builds, tests and runtime diagnostics work without it.

## JDKs: two different things

- **jdtls runtime JDK**: jdtls needs a recent JDK (21+ for current releases) found via `JAVA_HOME` or `PATH`.
- **Project JDK**: the version your code targets (`maven.compiler.release`, `java.toolchain`). Install a matching JDK too; if jdtls cannot find one, it falls back to its own runtime and may report false errors for newer language features.

## Project import

- Maven: jdtls reads `pom.xml` (multi-module supported). Run `./mvnw -q compile` once so dependencies are in `~/.m2`.
- Gradle: jdtls uses the Gradle wrapper (`gradlew`) if present. Run `./gradlew classes` once.
- Open Copilot CLI at the repository root (or the module root) so the build file is found.
- After large `pom.xml` / `build.gradle` edits, restart the session (`/exit`, relaunch) so the project is re-imported.

## Workspace (data) directory

`-data .jdtls-workspace` keeps the index per project, avoiding cross-project classpath contamination. Delete it to reset a stale index; git-ignore it. Never share one data dir between two running jdtls instances.

## Performance

- Heap: `--jvm-arg=-Xmx2G` is enough for most projects; raise to 4G for very large multi-module builds.
- The first start indexes and may take 30-60s or more; `workspaceSymbol` can be empty meanwhile. Fall back to grep briefly.
- Keep one Java server configured at a time.

## Lombok and annotation processors

jdtls does not see Lombok-generated members (`@Getter`, builders) unless the Lombok agent is passed to the JVM, e.g. `--jvm-arg=-javaagent:<path-to>/lombok.jar` (this path is machine-specific; set it in user-level config, not in a committed repo file). MapStruct, Immutables and other processors need annotation processing enabled and generated sources produced by a prior build. Treat "cannot resolve method" errors on generated code as possible false positives and confirm with `./mvnw compile` or `./gradlew classes`.

## What `lsp` operations give for Java

| Operation | Use |
|---|---|
| `goToDefinition` / `goToImplementation` | jump to a type, or to implementations of an interface |
| `findReferences` | all usages, resolving overloads and imports |
| `incomingCalls` / `outgoingCalls` | call hierarchy |
| `hover` | type info and Javadoc |
| `documentSymbol` / `workspaceSymbol` | outline of a file, or search types by name |
| `rename` | semantic rename across files |

Parameters are 1-based `line` and `character`, except `documentSymbol` (file only) and `workspaceSymbol` (query). Prefer `lsp` first for symbol questions; use grep for non-symbol text (properties, log messages).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/lsp` shows no Java server | check `which jdtls` and config location; restart the session |
| Unresolved imports everywhere | run the Maven/Gradle build once; delete `.jdtls-workspace` |
| Server exits immediately | check the JDK version used by jdtls (`java -version`); confirm wrapper flags with `jdtls --help` |
| Out-of-memory or slow | raise `-Xmx`; close other Java servers |
| Wrong language-level errors | install the project's JDK and make sure the build file declares it |

## Provenance

Adapted from [jdubois/dr-jskill](https://github.com/jdubois/dr-jskill) (`references/JDTLS.md`, `assets/lsp.json`), read at commit `29e71996048e4086bfa389268a3c6c2e49ea3f25`. Contributed here by its original author (Julien Dubois, sole copyright holder of dr-jskill) under this repository's MIT license; it remains available upstream under Apache-2.0. Reworked and condensed; no host-specific paths.
