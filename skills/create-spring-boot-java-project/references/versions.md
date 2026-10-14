# Version handling

## Rules

1. **Existing project:** read versions from `pom.xml` / `build.gradle(.kts)` (Spring Boot parent or plugin version, `java.version`/toolchain, `spring-boot-starter-test`). Keep them. Never bump implicitly.
2. **New project:** resolve at run time, fall back to the table below only when offline.
3. Never use `latest`, `LATEST` or `RELEASE` as a version, nor piped shell installers.

## Resolve the latest stable Spring Boot

```bash
curl -fsS -H 'Accept: application/json' https://start.spring.io/metadata/client \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['bootVersion']['default'], d['javaVersion']['default'])"
```

- `bootVersion.default` is the current stable release (it may carry a `.RELEASE` suffix such as `4.1.1.RELEASE`; strip it: pass `4.1.1`).
- Skip ids containing `SNAPSHOT`, `M` or `RC` (milestones/snapshots) unless the user asks for them.
- `javaVersion.default` is only the start.spring.io default. Pick the highest LTS the installed JDK supports (`java -version`), and make sure it is offered in `javaVersion.values`.
- Use the major line the user asks for. If they do not say, use the latest stable; see [spring-boot-4.md](spring-boot-4.md) for what changes between 3.x and 4.x.
- start.spring.io only generates Boot 4.0+ (verified: `bootVersion=3.5.x` returns HTTP 400 "compatibility range is >=4.0.0"). For a Boot 3.5 project, generate nothing: hand-write the build file with `spring-boot-starter-parent` 3.5.x (latest 3.5 on Maven Central, e.g. 3.5.16), `spring-boot-starter-web`, and `spring-boot-starter-test`, plus the Maven/Gradle wrapper. Creating the wrapper (`mvn wrapper:wrapper` / `gradle wrapper`) requires Maven or Gradle to be installed locally; if neither is available, ask the user to install one or choose Boot 4.
- Verify the choice exists on Maven Central: `curl -fsSI https://repo1.maven.org/maven2/org/springframework/boot/spring-boot/BOOT_VERSION/spring-boot-BOOT_VERSION.pom`.

## Fallback values (offline, reviewed 2026-10)

| Item | Value |
|------|-------|
| Spring Boot | 4.1.1 |
| Java | 25 (LTS) |
| PostgreSQL image | `postgres:18-alpine` |
| Testcontainers | managed by the Spring Boot BOM; do not pin unless overriding |
| JDK image | `eclipse-temurin:25-jdk-noble` |
| GraalVM image | `ghcr.io/graalvm/graalvm-community:25` |

These values age: when start.spring.io is reachable, prefer its answer, and tell the user which source was used.

## Dependencies managed by the BOM

Do not specify versions for Spring-managed dependencies (Hibernate, Jackson, Testcontainers, PostgreSQL driver, JUnit). Pin only what the BOM does not manage (for example a Maven plugin or a Docker image tag).
