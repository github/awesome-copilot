---
name: java-testcontainers
description: 'Write reliable integration tests in plain Java with Testcontainers 2.x: JUnit Jupiter lifecycle, singleton containers, reuse, generic containers, wait strategies, networks, init scripts, Docker Compose, CI and Docker/Podman setup. Use when adding or fixing Testcontainers tests, or migrating from 1.x. Framework-neutral.'
---

# Java Testcontainers (2.x)

Run real dependencies (databases, brokers, caches) in Docker for integration tests. This skill is framework-neutral. If the project uses Spring Boot and the `spring-boot-testing` skill is installed, use it for `@ServiceConnection`, `@DynamicPropertySource` and test slices; for Quarkus, rely on Dev Services (Quarkus skills/docs), not hand-wired containers.

## Workflow

1. Detect the existing version (`pom.xml` / `build.gradle`) and test framework (JUnit Jupiter). Testcontainers 2.x has no JUnit 4 support.
2. Pick the smallest container that matches production (same DB engine and major version; never H2 as a stand-in for behavior you care about).
3. Choose a lifecycle (table below), configure waiting, wire connection details into the code under test.
4. Run locally and in CI; check Docker availability and speed.

## Testcontainers 2.x essentials

- Artifacts are all prefixed `testcontainers-`: `org.testcontainers:testcontainers-junit-jupiter`, `testcontainers-postgresql`, `testcontainers-mysql`, `testcontainers-kafka`, etc. (1.x: `junit-jupiter`, `postgresql`). Core stays `org.testcontainers:testcontainers`.
- Module container classes moved to per-module packages, e.g. `org.testcontainers.postgresql.PostgreSQLContainer` (1.x: `org.testcontainers.containers.PostgreSQLContainer`). Core classes (`GenericContainer`, `Network`, `wait.strategy.*`) remain under `org.testcontainers.containers`.
- Module container classes are no longer generic: `PostgreSQLContainer`, not `PostgreSQLContainer<?>`.
- Use a BOM to keep versions aligned: `org.testcontainers:testcontainers-bom:2.0.5` (verify the current release on Maven Central).
- Docker Compose: use `ComposeContainer` (Compose v2); `DockerComposeContainer` is still present in 2.0.5 (older API); prefer `ComposeContainer`.

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>testcontainers-bom</artifactId>
      <version>2.0.5</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-junit-jupiter</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-postgresql</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.7.14</version>
    <scope>test</scope>
  </dependency>
</dependencies>
```

Gradle: `testImplementation platform("org.testcontainers:testcontainers-bom:2.0.5")`, then the same Testcontainers artifacts without versions, plus `testRuntimeOnly "org.postgresql:postgresql:42.7.14"`. The Testcontainers module does not bundle the JDBC driver; skip the explicit driver when the project already depends on one (e.g. via Spring Boot's BOM).

## Minimal test

```java
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers
class CustomerStoreIT {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    @Test
    void connects() throws Exception {
        try (var c = java.sql.DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            org.junit.jupiter.api.Assertions.assertTrue(c.isValid(2));
        }
    }
}
```

Always pin the image tag (never `latest`); match the production major version.

## Lifecycle decision

| Need | Pattern |
| --- | --- |
| One container per test class | `static @Container` field |
| Fresh container per test method (slow, strong isolation) | non-static `@Container` field |
| One container for the whole test run (fastest) | singleton holder, see `references/lifecycle-and-reuse.md` |
| Keep containers between local runs | `withReuse(true)` + opt-in property, local only |

Prefer sharing a container and isolating **data** (truncate/rollback, unique schema or DB per test) over restarting containers.

## Checklist

- [ ] Image tag pinned and matches production.
- [ ] Wait strategy meaningful (module defaults are usually fine; custom for `GenericContainer`).
- [ ] No fixed host ports; use `getMappedPort`/`getHost`.
- [ ] Containers shared across classes where possible (singleton).
- [ ] Integration tests named `*IT` and run by failsafe (Maven) or a separate Gradle test task, so unit tests stay fast.
- [ ] No secrets or real credentials in test containers.
- [ ] CI runner has Docker; log output is captured on failure.

## References

- `references/lifecycle-and-reuse.md`: per-class/per-method, singleton pattern, reuse, parallel runs, data isolation.
- `references/containers-and-waiting.md`: modules vs `GenericContainer`, wait strategies, env/config, init scripts, copy files, networks, multi-container setups, Docker Compose.
- `references/environment-ci-troubleshooting.md`: Docker/Podman/Colima setup, CI, private registries, performance, common errors, 1.x to 2.x migration table.

Official docs: <https://java.testcontainers.org/>

Upgrading to 2.x: no dedicated migration page was found on java.testcontainers.org; read the 2.0.0 release notes <https://github.com/testcontainers/testcontainers-java/releases/tag/2.0.0> and all releases <https://github.com/testcontainers/testcontainers-java/releases> for the target version, and prefer them over this skill when they conflict.
