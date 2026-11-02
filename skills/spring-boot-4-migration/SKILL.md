---
name: spring-boot-4-migration
description: 'Migrate a Spring Boot 3.x application to Spring Boot 4.0 (Spring Framework 7, Jackson 3, modular starters, JSpecify). Use only for an explicit Boot 3.x to 4 migration, or to fix build or test failures caused by it, or to review one. Not for 3.x patch bumps or 4.0 to 4.1 upgrades; follow the target Boot version release notes and upgrade guide for those. Covers Maven and Gradle (Kotlin DSL, version catalogs).'
---

# Spring Boot 3.x to 4.0 Migration

Step-by-step migration workflow. Topic details live in `references/`; load only the files relevant to the current step.

## Rules

- Never read or print secrets (`.env`, credentials, tokens in properties files).
- Change one thing per step and run the test suite after each step; commit nothing you cannot build.
- Pin versions explicitly; never use `latest` or open-ended ranges.
- Check the official sources when unsure: the Spring Boot 4.0 Migration Guide on the Spring Boot GitHub wiki and the release notes on spring.io.

## Workflow

1. **Detect the current state**
   - Boot version: `pom.xml` (`spring-boot-starter-parent` / BOM version), `build.gradle(.kts)` (`org.springframework.boot` plugin), or `gradle/libs.versions.toml`.
   - Build tool: `pom.xml` + `mvnw` means Maven; `build.gradle.kts` / `build.gradle` means Gradle (Kotlin or Groovy DSL). Use the project wrapper (`./mvnw`, `./gradlew`).
   - Java version (Boot 4 needs Java 17+, Java 25 recommended), Kotlin version, and key libraries (Jackson, Hibernate, Security, Kafka, Elasticsearch, MongoDB).
   - See [prerequisites](references/01-prerequisites.md).
2. **Migrate to the latest 3.5.x first.** If the project is older than 3.5, upgrade to the latest 3.5.x, fix deprecation warnings, and get the tests green before touching 4.0. Never jump from 3.2 straight to 4.0.
3. **Baseline**: run the full build and tests (`./mvnw verify` or `./gradlew build`) and record failures that exist before migration.
4. **Bump to 4.0.x** (parent/BOM or plugin version) and fix the build in this order, running the build after each item:
   1. Starters and modules: [starters and removed features](references/02-starters-and-removed-features.md). Choose either the classic starters or the new modular ones; Boot 4 split the auto-configuration into many modules, and each technology now has its own `*-test` starter.
   2. Build files and third-party dependencies: [build and dependencies](references/05-build-and-dependencies.md) and [Kotlin/Java build config](references/10-kotlin-and-java-build-config.md).
   3. Jackson 3 (new `tools.jackson` packages): [Jackson 3](references/03-jackson-3.md). A temporary Jackson 2 compatibility module exists; plan to remove it.
   4. Core framework (JSpecify nullability, package relocations, logging, DevTools, `PropertyMapper`): [core framework](references/04-core-framework.md).
   5. Configuration properties (MongoDB, Spring Session, persistence, Kafka retry): [configuration properties](references/06-configuration-properties.md). Add `spring-boot-properties-migrator` temporarily to find renamed keys, and remove it afterwards.
   6. Web and messaging changes (trailing slash matching, `HttpMessageConverters`, Jersey, Kafka, RabbitMQ): [web and messaging](references/07-web-and-messaging.md).
   7. Tests (Mockito/`@MockBean` replacement, `@SpringBootTest` changes, `@PropertyMapping`): [testing](references/08-testing.md).
   8. Actuator and observability modules, health probes: [actuator and observability](references/09-actuator-and-observability.md).
5. **Verify** with the [checklist, pitfalls and resources](references/11-checklist-pitfalls-resources.md): full build, tests, startup, actuator health, a smoke test of the main endpoints, and native image build if used.

## Build tool notes

- **Maven**: change the parent (or `spring-boot-dependencies` BOM) version, then swap starters in `<dependencies>`. Use `./mvnw dependency:tree` to find stale transitive Jackson 2, Undertow, or Spring Retry usage. The reference files show Gradle snippets; translate the coordinates directly to Maven `<dependency>` entries.
- **Gradle Kotlin DSL**: update the plugin version in `plugins {}` or the version catalog; use `./gradlew dependencies --configuration runtimeClasspath` to inspect resolution.
- Keep the Spring Boot version in a single place (parent, BOM property, or version catalog entry).

## Reference files

| File | Topic |
|---|---|
| [01-prerequisites.md](references/01-prerequisites.md) | Minimum versions, pre-migration steps |
| [02-starters-and-removed-features.md](references/02-starters-and-removed-features.md) | Modular starters, renamed starters, removed servers/features |
| [03-jackson-3.md](references/03-jackson-3.md) | Jackson 3 packages, renames, compatibility module |
| [04-core-framework.md](references/04-core-framework.md) | JSpecify, package moves, logging, DevTools, PropertyMapper |
| [05-build-and-dependencies.md](references/05-build-and-dependencies.md) | Gradle plugin, Spring Retry, Authorization Server, Elasticsearch, Hibernate |
| [06-configuration-properties.md](references/06-configuration-properties.md) | Renamed and restructured properties |
| [07-web-and-messaging.md](references/07-web-and-messaging.md) | Web framework, Kafka, RabbitMQ changes |
| [08-testing.md](references/08-testing.md) | Test framework changes |
| [09-actuator-and-observability.md](references/09-actuator-and-observability.md) | Actuator, Micrometer and OpenTelemetry modules |
| [10-kotlin-and-java-build-config.md](references/10-kotlin-and-java-build-config.md) | Kotlin compiler and Java preview configuration |
| [11-checklist-pitfalls-resources.md](references/11-checklist-pitfalls-resources.md) | Final checklist, pitfalls, links |

## Automation

Use OpenRewrite (`org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0`, <https://docs.openrewrite.org/recipes/java/spring/boot4/upgradespringboot_4_0-community-edition>) when available, review the diff, and always fetch the version-specific official guide before editing.

## Upstream sources (read before migrating)

Fetch the page for the target version; prefer it over this skill when they conflict.

- Boot 4.0 Migration Guide: <https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide>
- Boot 4.0 Release Notes: <https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes>
- Upgrading Spring Boot (incl. `spring-boot-properties-migrator`): <https://docs.spring.io/spring-boot/upgrading.html>
- System requirements: <https://docs.spring.io/spring-boot/system-requirements.html>
- Boot releases: <https://github.com/spring-projects/spring-boot/releases>
- Spring Framework 7: <https://github.com/spring-projects/spring-framework/wiki/Upgrading-to-Spring-Framework-7.x>, <https://github.com/spring-projects/spring-framework/wiki/What%27s-New-in-Spring-Framework-7.x>
- Spring Security 7: <https://docs.spring.io/spring-security/reference/migration/index.html>
- Spring Data 2025.1: <https://github.com/spring-projects/spring-data-commons/wiki/Spring-Data-2025.1-Release-Notes>
- Spring Batch 6: <https://docs.spring.io/spring-batch/reference/whatsnew.html>
- Hibernate ORM 7: <https://docs.hibernate.org/orm/7.0/migration-guide/>
- Jackson 3: <https://github.com/FasterXML/jackson/blob/main/jackson3/MIGRATING_TO_JACKSON_3.md>
- Micrometer: <https://github.com/micrometer-metrics/micrometer/wiki/Migration-Guide>

For Boot 3.x patch bumps or Boot 4.0 to 4.1 upgrades, go directly to the target Boot version's release notes and upgrade guide using the official links above. These are dependency upgrades, not JDK migrations; do not route them to `java-upgrade`.

Related skills, each only if installed (otherwise use the fallback in parentheses):
- `spring-security` (Security 7 changes): fall back to the Spring Security 7 migration guide above.
- `spring-observability`: fall back to [actuator and observability](references/09-actuator-and-observability.md) and the Micrometer guide above.
- `java-hibernate-jpa`: fall back to the Hibernate ORM 7 migration guide above.
- `java-upgrade` (only when a JDK upgrade is explicitly requested): fall back to the target JDK's official migration guide.
- `java-diagnostics` (runtime or startup failures): read the full stack trace and `mvn dependency:tree` / `gradle dependencies` output yourself.
- `java-testcontainers` (Testcontainers 2.0 tests): see [testing](references/08-testing.md) and the Testcontainers 2 migration notes.
- `kotlin-springboot` (Kotlin specifics): see [Kotlin and Java build config](references/10-kotlin-and-java-build-config.md).
