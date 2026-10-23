---
name: java-add-graalvm-native-image-support
description: 'GraalVM Native Image skill for Spring Boot, Micronaut and plain Java: detects the build tool and framework, adds native image support, builds the executable, analyzes errors, and iterates until the native build succeeds and the binary runs correctly. For Quarkus projects it only dispatches to the quarkus-native-and-container skill.'
---

# GraalVM Native Image Support

Single source of truth for adding GraalVM Native Image to a Java project, whatever the framework. Work iteratively: configure, build, read the error, fix, rebuild, until the native build succeeds and the executable runs correctly.

Detail lives in `references/`; load only what the project needs:

| Topic | File |
|---|---|
| Maven / Gradle native plugin setup | [references/build-tools.md](references/build-tools.md) |
| Reachability metadata and tracing agent | [references/reachability-metadata.md](references/reachability-metadata.md) |
| Common build/runtime errors and fixes | [references/troubleshooting.md](references/troubleshooting.md) |
| Spring Boot (AOT, `-Pnative`, `nativeCompile`, `build-image`) | [references/spring-boot.md](references/spring-boot.md) |
| Quarkus | `quarkus-native-and-container` skill (hand off); short pointer in [references/quarkus.md](references/quarkus.md) |
| Micronaut | [references/micronaut.md](references/micronaut.md) |

## Step 1: Analyze the project

1. Build tool: `pom.xml` (Maven) or `build.gradle` / `build.gradle.kts` (Gradle). Prefer the wrapper (`./mvnw`, `./gradlew`) when present.
2. Framework, from dependencies/plugins:
   - Spring Boot: `spring-boot-starter-parent`, `spring-boot-maven-plugin`, or `org.springframework.boot` Gradle plugin
   - Quarkus: `io.quarkus` BOM/plugin or `quarkus-*` dependencies
   - Micronaut: `io.micronaut` parent/plugin or `micronaut-*` dependencies
   - otherwise plain Java
3. Existing native configuration: native-build-tools plugin, `META-INF/native-image/`, native profile, `application.properties` native keys.
4. Toolchain: run `java -version` and `native-image --version`. Local native compilation needs a GraalVM JDK (with `native-image`) as the JDK used for the build. Container or buildpack builds (Spring Boot buildpacks via `bootBuildImage`/`spring-boot:build-image`, Quarkus container builds) compile inside a container and need no local GraalVM, only a container runtime. Check the project's Java level against the installed GraalVM version.

If the framework is Quarkus, stop here and hand off to the `quarkus-native-and-container` skill. Container builds there need no local GraalVM.

## Scope and JVM baseline

- Adding native support does not authorize a JDK, framework, library, build-tool, or wrapper upgrade. Preserve the existing BOM/parent-managed versions and test conventions; ask before changing versions to solve native compatibility.
- Run the project's existing JVM build and tests before editing. Record pre-existing failures rather than weakening checks to hide them. Keep the JVM packaging/run path working alongside native support.
- After any approved dependency or framework change, rerun that JVM baseline before continuing with native builds. Verify the same relevant behavior on both JVM and native paths.
- Ask before creating or changing CI workflows, adding native CI jobs, or changing runner resources. Suggest commands separately if CI changes were not requested.

## Step 2: Get a GraalVM toolchain

- **Oracle GraalVM** (free under the GraalVM Free Terms and Conditions) and **GraalVM Community Edition** builds provide `native-image`. Use a release matching the project's Java version (for example, GraalVM for JDK 21 or newer; Spring Boot 3.x/4.x need a Java 17+ baseline, see the Spring reference).
- Install with SDKMAN (`sdk list java`, then `sdk install java <identifier>` using an identifier from that list), a vendor download, or a CI action such as `graalvm/setup-graalvm`. Pick the version from the vendor's current download page rather than hard-coding one.
- Linux needs a C toolchain and zlib headers (`build-essential`, `zlib1g-dev`); macOS needs Xcode command line tools; Windows needs Visual Studio Build Tools. Check the current GraalVM "Native Image prerequisites" page.

## Step 3: Add native support

Per framework:

- **Spring Boot**: with Maven, `spring-boot-starter-parent` only manages the native plugins' versions and configuration in its `native` profile, so declare `native-maven-plugin` and `spring-boot-maven-plugin` in `<build><plugins>` if missing (no versions needed); with Gradle, apply `org.graalvm.buildtools.native` next to `org.springframework.boot`; a custom parent needs the plugin added by hand. Do not duplicate configuration the parent already provides. See [references/spring-boot.md](references/spring-boot.md).
- **Quarkus**: hand off to the `quarkus-native-and-container` skill.
- **Micronaut**: built in via the Micronaut build plugins. See [references/micronaut.md](references/micronaut.md).
- **Plain Java** (or any project without a framework plugin): add the GraalVM Native Build Tools plugin. See [references/build-tools.md](references/build-tools.md). Resolve the plugin version at run time from Maven Central (`org.graalvm.buildtools:native-maven-plugin`) or the Gradle Plugin Portal (`org.graalvm.buildtools.native`) and pin it in the build file; do not copy a version from memory.

## Step 4: Build

| Setup | Command |
|---|---|
| Plain Maven | `./mvnw -Pnative native:compile` |
| Plain Gradle | `./gradlew nativeCompile` |
| Spring Boot Maven | `./mvnw -Pnative native:compile` (or `spring-boot:build-image` for a container) |
| Spring Boot Gradle | `./gradlew nativeCompile` (or `bootBuildImage`) |
| Micronaut Maven | `./mvnw package -Dpackaging=native-image` |
| Micronaut Gradle | `./gradlew nativeCompile` |

Native builds are slow and memory hungry (several GB of RAM). Capture the full output to inspect it.

## Step 5: Iterate until the build succeeds

1. Read the first real error, not the final summary.
2. Match it against [references/troubleshooting.md](references/troubleshooting.md).
3. Apply the smallest fix, in this order of preference:
   1. Check whether a compatible library/framework version has built-in native support (see the [reachability metadata repository](https://github.com/oracle/graalvm-reachability-metadata)). Propose the upgrade; apply it only with user approval and rerun the JVM baseline. If declined, try metadata or framework hints compatible with the current versions.
   2. Use the framework's own mechanism (Spring `RuntimeHints`, Quarkus `@RegisterForReflection`, Micronaut `@Introspected`).
   3. Collect metadata with the tracing agent (see [references/reachability-metadata.md](references/reachability-metadata.md)).
   4. Hand-write metadata under `src/main/resources/META-INF/native-image/<groupId>/<artifactId>/`.
   5. Adjust initialization (`--initialize-at-build-time` / `--initialize-at-run-time`) only for specific classes.
4. Rebuild. Repeat until the build completes with no errors.

## Step 6: Verify the executable

A successful build is not enough: many problems only appear at runtime.

- Run the binary and exercise the main paths (HTTP endpoints, DB access, serialization, resource loading, scheduled jobs).
- Run the native tests where the framework supports them (`native:test`, `nativeTest`, Quarkus `@QuarkusIntegrationTest`).
- Compare startup time and memory against the JVM run only if the user asks for it.
- Report the exact commands run, whether the build and the run succeeded, and any remaining warnings.

## Pitfalls

- Recommend a native build and native test run in CI with an explicit GraalVM version; add or change CI only with user consent.
- Mockito's default inline mock maker does not work on native image (Mockito 5.0.0 release notes); use the subclass mock maker for native tests.
- Do not leave `--report-unsupported-elements-at-runtime` or verbose flags in production builds unless justified.

## References

- [GraalVM Native Image documentation](https://www.graalvm.org/latest/reference-manual/native-image/)
- [Native Build Tools](https://graalvm.github.io/native-build-tools/latest/index.html)
- [GraalVM reachability metadata repository](https://github.com/oracle/graalvm-reachability-metadata)
- [Spring Boot GraalVM native images](https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html)
- [Quarkus building a native executable](https://quarkus.io/guides/building-native-image)
- [Micronaut GraalVM guide](https://docs.micronaut.io/latest/guide/#graal)

## Upstream sources (read before upgrading GraalVM or native config)

Fetch the page for the target version; prefer it over this skill when they conflict.

- GraalVM release notes: <https://www.graalvm.org/release-notes/>
- Reachability metadata format: <https://www.graalvm.org/latest/reference-manual/native-image/metadata/>
- Build configuration options: <https://www.graalvm.org/latest/reference-manual/native-image/overview/BuildConfiguration/>
- Metadata repository (check your library versions are covered): <https://github.com/oracle/graalvm-reachability-metadata>
