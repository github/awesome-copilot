---
name: java-development
description: 'Day-to-day plain Java development without a framework: Maven and Gradle usage and wrappers, project layout, dependency and vulnerability management, modern Java idioms by JDK version (records, sealed types, pattern matching, virtual threads), SLF4J logging, error and null handling, immutability, concurrency basics, static analysis and formatting (Spotless, Error Prone, -Xlint), packaging (jar, jlink, jpackage) and GitHub Actions CI. Use when writing, building, reviewing or maintaining ordinary Java code.'
---

# Java Development (plain Java)

Everyday guidance for Java projects that are not tied to a framework. If the project uses Spring Boot, Quarkus, Helidon or similar, prefer that framework's skills for framework concerns and use this one for the plain-Java parts.

## Rules that always apply

1. **Detect before you write.** Read `pom.xml`/`build.gradle*`, `.mvn/`, `gradle/`, `.java-version`/`.sdkmanrc`, `.editorconfig`, CI files, and a few source files. Match the build tool, Java release, formatter, naming, logging and test libraries already in use.
2. **Never upgrade implicitly.** Do not change the Java release, build-tool version, plugin or dependency versions, or add a formatter/linter/static analyzer the project lacks, as a side effect of another task. Suggest it and ask. Version upgrades are their own task (`java-upgrade`, if installed).
3. **Use the wrapper** (`./mvnw`, `./gradlew`) when present; otherwise the installed `mvn`/`gradle`. Do not commit a wrapper unprompted.
4. **Verify with a build.** After any change run the project's own verification (`./mvnw -B verify` or `./gradlew build`) and report the result. Run a narrower command first while iterating. If you could not run it, say so.
5. **Ask the user** before: changing public APIs or serialized/DB/wire formats, raising the Java release, adding runtime dependencies, adding tools to the build, deleting or weakening tests, changing CI, or when two reasonable designs have different trade-offs.
6. Prefer the standard library and small, explicit code over new dependencies. No Lombok unless already used.

## Pick idioms by the project's Java release

Check `maven.compiler.release`/`<release>`, `java.toolchain`, or `sourceCompatibility`; never use a feature newer than that release. Summary (details and snippets in `references/modern-java.md`):

| Release | You can use |
| --- | --- |
| 8 | lambdas, streams, `Optional`, `java.time` |
| 11 | `var`, `String.isBlank/strip/lines`, `java.net.http.HttpClient`, `List.of`/`Map.of` (9) |
| 17 | records, sealed classes, text blocks, switch expressions, `instanceof` patterns |
| 21 | pattern matching for `switch`, record patterns, **virtual threads**, `SequencedCollection` (`getFirst/getLast/reversed`) |
| 22-24 | unnamed variables `_` (22), `Stream.gather` (24) |
| 25 | scoped values, instance `main`/compact source files, module import declarations (all final) |

Structured concurrency (`StructuredTaskScope`) is still a **preview API** in 25 and 27 (verified: needs `--enable-preview`); do not use it in production code unless the user opts in to preview features.

## Build tools in practice

- Maven: `./mvnw -B verify` (compile, unit tests, integration tests, packaging), `-pl <module> -am` for one module, `dependency:tree`, `-DskipTests` only when the user asks. Gradle: `./gradlew build`, `test --tests 'pkg.Class'`, `dependencies`, `dependencyInsight --dependency <name>`.
- Standard layout: `src/main/java`, `src/main/resources`, `src/test/java`, `src/test/resources`; package by feature, one top-level type per file, no split packages.
- Set the Java version explicitly (`maven.compiler.release` / Gradle toolchain with `options.release`) and UTF-8 encoding; do not rely on the JDK that happens to run the build.
- Wrapper, BOM and `dependency:tree`/`versions:` usage, version catalogs and multi-module layout: `references/build-and-dependencies.md`.

## Dependencies and vulnerabilities

- Import BOMs (`junit-bom`, `testcontainers-bom`, the framework's BOM) instead of repeating versions; one version per library across modules.
- Inspect before changing: `mvn dependency:tree -Dincludes=group:artifact` / `gradlew dependencyInsight`. Resolve conflicts with `dependencyManagement` or Gradle constraints, not by excluding randomly.
- Check updates with `mvn versions:display-dependency-updates` (add `-Dmaven.version.ignore` to hide alpha/beta/RC) and report them; do not apply major upgrades without asking.
- Vulnerabilities: use what the project has (Dependabot/Renovate alerts, OWASP dependency-check, OSV-Scanner, GitHub dependency review). Suggest one if none exists; do not add it silently. Keep secrets out of scanner config; NVD-based scanners need an API key to be practical.

## Version-dependent failures (verified)

- **JDK 23+ no longer runs annotation processors implicitly** (Lombok, MapStruct, Dagger...): `-proc:none` is the default unless `-processor`, `--processor-path` or `--processor-module-path` is given. Declare the processor path in the build (Maven `annotationProcessorPaths`, Gradle `annotationProcessor`) or pass `-proc:full`. JDK 21+ prints a warning when it detects implicit use; `-proc:full` is also backported to 17.0.11, 11.0.23 and 8u411. Source: <https://inside.java/2024/06/18/quality-heads-up/>.
- **Virtual threads and `synchronized`**: on JDK 21-23 a virtual thread that blocks inside `synchronized` is pinned to its carrier; JEP 491 removes nearly all such pinning in JDK 24+. On 21-23 prefer `ReentrantLock` around blocking calls. Source: <https://openjdk.org/jeps/491>.
- **Error Prone** on JDK 16+ needs the `--add-exports`/`--add-opens` javac flags, and on JDK 21 `-XDaddTypeAnnotationsToSymbol=true` (see the quality reference).
- Never use a language feature newer than the project's release (see the table above).

## Static analysis and formatting (only if already present, or the user agrees)

Respect what is configured: if the project uses Spotless/Checkstyle/SpotBugs/Error Prone, run them and fix findings; if not, do not add them. When asked to introduce them, start with `-Xlint:all` and Spotless (formatter only), then Error Prone. Verified configs for Maven and Gradle on JDK 21 and 25 (including the JDK-21-only `-XDaddTypeAnnotationsToSymbol=true` requirement and Maven `.mvn/jvm.config` flags) are in `references/quality-and-packaging.md`. Never reformat the whole codebase in an unrelated change.

## Packaging and CI

- Plain library jar: `mvn package`/`gradlew jar`. Runnable app: shaded/fat jar or `lib/` directory plus manifest `Main-Class`; custom runtime with `jlink`; native installer/app-image with `jpackage` (verified on macOS, see `references/quality-and-packaging.md`).
- GitHub Actions: `actions/checkout`, `actions/setup-java` with `distribution: temurin`, an explicit `java-version`, built-in dependency `cache`, then `./mvnw -B verify` or `./gradlew build`. Snippet and notes in `references/quality-and-packaging.md`. Do not change CI without asking.

## Related skills (use when installed)

`java-junit` (unit tests), `java-testcontainers` (integration tests with Docker), `java-hibernate-jpa` (persistence), `java-debugging` (failures and stack traces), `java-diagnostics` (performance, memory, threads, JFR), `java-upgrade` (JDK/framework upgrades), `lsp-setup` (Java language server for navigation and refactoring).

## References

- `references/modern-java.md`: idioms and verified snippets (records, sealed types, switch patterns, text blocks, virtual threads, `SequencedCollection`, unnamed variables), preview status, pitfalls.
- `references/build-and-dependencies.md`: Maven/Gradle commands, wrappers, BOMs, conflict diagnosis, update checking, Dependabot/Renovate, vulnerability scanning.
- `references/quality-and-packaging.md`: logging setup, `-Xlint`, Spotless, Error Prone, Checkstyle/SpotBugs notes, jar/jlink/jpackage, GitHub Actions.
