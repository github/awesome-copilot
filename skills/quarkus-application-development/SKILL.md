---
name: quarkus-application-development
description: 'Write Quarkus application code: REST with Quarkus REST, validation, exception mappers, OpenAPI, configuration, CDI (ArC), Hibernate ORM with Panache, Mutiny and virtual threads, Reactive Messaging with Kafka, OIDC security, health, metrics, OpenTelemetry, fault tolerance, REST Client, scheduler and cache. Use when implementing or changing features in an existing Quarkus project.'
---

# Quarkus Application Development

Scope: application code inside an existing Quarkus project. Project creation is `create-quarkus-project`; Dev Services and tests are `quarkus-dev-services-and-testing`; native and container images are `quarkus-native-and-container`; core JPA mapping and query design can use the optional `java-hibernate-jpa` skill if installed (otherwise see the Hibernate ORM guide, <https://quarkus.io/guides/hibernate-orm>, and the Jakarta Persistence docs).

## Agent rules

1. Detect first: read `pom.xml`/`build.gradle` for `quarkus.platform.version`, the Java release, and the extensions already present. Keep the version; use what the project already uses (for example `quarkus-resteasy*` stays if present).
2. Add extensions with `quarkus extension add <name>` or `./mvnw quarkus:add-extension -Dextensions=<name>`; never guess artifact ids or versions by hand (the platform BOM manages them). List candidates with `quarkus extension list --installable --search=<text>`.
3. Ask the user before adding Kafka, OIDC/Keycloak or any new infrastructure dependency (they start containers in dev/test and change deployment needs).
4. Never use the Spring compatibility extensions (`quarkus-spring-*`) unless the project already does.
5. Verify with dev mode (`./mvnw quarkus:dev`, then `/q/dev-ui`) and `./mvnw verify`; write a `@QuarkusTest` per feature. Do not claim something works without running it.
6. Use `jakarta.*` imports, records for DTOs, thin resources delegating to services.
7. Never hard-code secrets or add credentials to `application.properties`; see `references/config-cdi.md`.

## Quick decisions

| Need | Use | Details |
|---|---|---|
| JSON REST API | `quarkus-rest-jackson`, `quarkus-hibernate-validator`, `quarkus-smallrye-openapi` | `references/rest.md` |
| Typed config | `@ConfigMapping`; `@ConfigProperty` for single values | `references/config-cdi.md` |
| Beans | `@ApplicationScoped` (default), `@Singleton` only for plain stateless holders | `references/config-cdi.md` |
| Database | `quarkus-hibernate-orm-panache` + JDBC driver, repository pattern | `references/persistence.md` |
| Async / blocking | Imperative by default; `@RunOnVirtualThread` or `Uni` when needed | `references/reactive-messaging.md` |
| Messaging | `quarkus-messaging-kafka` (SmallRye Reactive Messaging) | `references/reactive-messaging.md` |
| AuthN/AuthZ | `quarkus-oidc`, `@RolesAllowed` | `references/security-oidc.md` |
| Ops | `quarkus-smallrye-health`, `quarkus-micrometer-registry-prometheus`, `quarkus-opentelemetry`, `quarkus-smallrye-fault-tolerance` | `references/observability-resilience.md` |
| Outbound HTTP, scheduling, caching | `quarkus-rest-client-jackson`, `quarkus-scheduler`, `quarkus-cache` | `references/observability-resilience.md` |

## Pitfalls that cost time

- Quarkus resolves CDI at build time: an unused bean may be removed. Beans only looked up programmatically need `@Unremovable`.
- Do not read or write public fields of a normal-scoped bean (`@ApplicationScoped`) from another bean or test: you hit the client proxy, not the instance (verified: a counter field read through the proxy returned 0). Use methods.
- Do not block on the event loop (`@NonBlocking` methods, `Uni`/`Multi` return types running on I/O threads). Remove any existing `@NonBlocking` from the method (combining it with `@Blocking` or `@RunOnVirtualThread` fails the build), then add `@Blocking` or `@RunOnVirtualThread` (see `references/reactive-messaging.md`).
- Changes to build-time properties need a rebuild; run-time properties can be overridden by env vars (`QUARKUS_DATASOURCE_JDBC_URL`).
- Do not configure URLs for databases/brokers/Keycloak in `%dev`/`%test`: that disables Dev Services.
- `drop-and-create` schema management is for dev/test only; use Flyway or Liquibase for production.

Verified on Quarkus 3.40.1 and 3.27.6 (Java 21 target, Maven) with a scaffolded app and `mvn verify` (15 tests: REST+validation+mapper, OpenAPI, config mapping, Panache on PostgreSQL Dev Services, Kafka Dev Service round trip, Keycloak Dev Service tokens, health, metrics, fault tolerance, cache, scheduler). Re-check names against the project's version.
