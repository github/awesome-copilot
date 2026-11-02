---
name: java-springboot
description: 'Write and review application code in an existing Spring Boot 3/4 project: controllers, validation and ProblemDetail errors, Spring Data JPA/JDBC, RestClient and HTTP interfaces, configuration properties, Kafka/AMQP, caching, scheduling, virtual threads, AOT and startup tuning. Use when adding or changing features. To scaffold a new project use create-spring-boot-java-project instead.'
---

# Spring Boot application development

Opinionated rules plus a router to deeper references. Code samples in the references were compiled and run on Spring Boot 4.1.1 (Spring Framework 7) and, where they differ, on Boot 3.5.16 (Framework 6.2). Boot 3 vs 4 differences are marked "Boot 3" / "Boot 4" in each reference.

## Before writing code

1. **Detect, do not assume:** read `pom.xml`/`build.gradle(.kts)` for the Spring Boot version, Java version, starters in use (`spring-boot-starter-web` is Boot 3, `spring-boot-starter-webmvc` is Boot 4), persistence (JPA, JDBC), the migration tool, the test setup, and the package layout and naming conventions of the existing code. Match them.
2. **Never upgrade Spring Boot, Java or dependencies implicitly.** A Boot 3 -> 4 move is a deliberate task (`spring-boot-4-migration`).
3. **Ask before adding infrastructure:** a broker (Kafka, RabbitMQ), a cache provider, a new database, or a scheduler/async setup. Add only what the user requested, with the Boot-managed version (no explicit version for BOM-managed artifacts, never `latest`).
4. **Verify every change** with the project's own build: `./mvnw verify` or `./gradlew build` (plain `mvn`/`gradle` if no wrapper). Integration tests need Docker when they use Testcontainers.

## Router

| Task | Read |
| --- | --- |
| Repositories, projections, pagination, N+1, `@Transactional`, auditing, Flyway/Liquibase, Spring Data JDBC | `references/data.md` |
| Controllers, validation, `ProblemDetail`, `RestClient`, `@HttpExchange`, API versioning, OpenAPI, JSpecify | `references/rest-api.md` |
| Kafka/AMQP, `@Cacheable`/Caffeine, `@Scheduled`, `@Async`, virtual threads, outbox | `references/messaging-caching.md` |
| `@ConfigurationProperties`, profiles, secrets, config import, Docker Compose / Testcontainers at dev time | `references/configuration.md` |
| AOT, CDS/AppCDS, lazy initialization, native image | `references/aot-and-startup.md` |

If these standalone skills are installed, also use them for their topic; otherwise rely on the official docs: `java-hibernate-jpa` (JPA mapping), `spring-boot-testing` (tests), `spring-security` (authentication, authorization, CSRF/CORS), `spring-observability` (metrics, tracing, Actuator, logs), `create-spring-boot-java-project` (project defaults, Boot 3 vs 4 build changes), `java-add-graalvm-native-image-support` (native executable).

## Core rules

- **Structure and layers:** package by feature; constructor injection; controllers return DTOs/records, never entities; services own the transaction.
- **Validation and errors:** Bean Validation on request records with `@Valid`; one `@RestControllerAdvice` returning `ProblemDetail`. JSpecify annotations document nullability only and do not validate.
- **Jackson:** Boot 4 uses Jackson 3 (`tools.jackson.databind.*`, `JsonMapper`; annotations stay in `com.fasterxml.jackson.annotation`); Boot 3 uses Jackson 2 (`com.fasterxml.jackson.databind.*`, `ObjectMapper`).
- **Slice-test gotcha:** put `@EnableJpaAuditing`, `@EnableCaching`, `@EnableAsync`, `@EnableScheduling` on dedicated `@Configuration` classes, not on the `@SpringBootApplication` class, or slices such as `@DataJpaTest` fail to start (for example, no `CacheManager`). Slices do not scan `@Configuration` classes: `@Import` the one a test needs.
- **Proxied beans:** `@Cacheable`, `@Async` and `@Transactional` work through proxies: they do nothing on self-invocation or on `private`/`final` methods; test them through the injected bean.

## Checklist

- [ ] Versions, build tool and conventions detected; starters match the Boot major
- [ ] No new infrastructure or dependency without the user's agreement
- [ ] `./mvnw verify` / `./gradlew build` passes; secrets absent from code, properties and logs

See also: Spring Boot reference <https://docs.spring.io/spring-boot/reference/>, Spring Framework reference <https://docs.spring.io/spring-framework/reference/>, Spring Data <https://docs.spring.io/spring-data/commons/reference/>.
