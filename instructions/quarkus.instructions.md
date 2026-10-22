---
applyTo: '**/*.java, **/application*.properties, **/application*.yml, **/application*.yaml, **/pom.xml, **/build.gradle, **/build.gradle.kts'
description: 'Quarkus development standards and instructions'
---

- Apply these instructions only when the project uses Quarkus (`io.quarkus` dependencies or the Quarkus Maven/Gradle plugin).
- Check the project's existing Quarkus and Java versions (pom.xml, build.gradle, `quarkus.platform.version`) before suggesting changes; keep them unless asked to upgrade. For new projects target the recommended stream from https://code.quarkus.io/api/streams (3.40 at the time of testing; 4.0 is still beta) and Java 21+ (Java 17 minimum). Never hard-code a patch version in advice; use the Quarkus BOM.

## Dependencies and build

- Add features through Quarkus extensions (`./mvnw quarkus:add-extension -Dextensions=...` or `quarkus extension add`), versions managed by the platform BOM.
- Use Quarkus REST (`quarkus-rest`, `quarkus-rest-jackson`) for new projects and explicit migrations. In an existing RESTEasy Classic (`quarkus-resteasy*`) project keep that stack: the two are incompatible and mixing them fails the build.
- Use `./mvnw quarkus:dev` (or `./gradlew quarkusDev`) for development; keep the Maven/Gradle wrapper.

## CDI and code

- Use constructor injection; `@Inject` is optional on a single constructor. Avoid field injection in production code.
- Prefer `@ApplicationScoped` beans; use `jakarta.*` imports only.
- Use records for DTOs. Keep REST resources thin and delegate to services.
- Use `@ConfigMapping` interfaces for grouped, typed configuration; `@ConfigProperty` for single values. Never hard-code secrets; use env vars or a secret store, and profiles (`%dev`, `%test`, `%prod`).
- Use `quarkus.log.*` and JBoss Logging (or SLF4J) for logging.

## REST and validation

- Return explicit status codes and map errors centrally rather than try/catch in each resource. In Quarkus REST projects use `RestResponse`/`Response`, `@ResponseStatus` and `@ServerExceptionMapper`; in RESTEasy Classic projects these are unavailable, so use Jakarta REST `Response` and an `ExceptionMapper` annotated `@Provider`.
- Validate input with Hibernate Validator (`quarkus-hibernate-validator`, `@Valid`).
- Add `quarkus-smallrye-health` and metrics (`quarkus-micrometer-registry-prometheus`, or another Micrometer registry extension; `quarkus-micrometer` alone exports nothing) for production services; expose them only to trusted networks.

## Data

- Use Hibernate ORM with Panache (`quarkus-hibernate-orm-panache`); prefer the repository pattern (`PanacheRepository<T>`) for non-trivial domains, active record for simple ones.
- Put `@Transactional` on service or resource methods that modify data; paginate list queries.
- Manage schema with Flyway or Liquibase in production, not `drop-and-create`.
- Rely on Dev Services for databases and brokers in dev/test; do not configure URLs for them in `%dev`/`%test`.

## Security

- Use `quarkus-oidc` (or `quarkus-smallrye-jwt`) for authentication, and `@RolesAllowed`/`quarkus.http.auth.permission.*` for authorization. Secure endpoints by default.

## Testing

- Use `@QuarkusTest` with RestAssured for application tests, `@QuarkusIntegrationTest` for packaged jar/native/container tests, and `@InjectMock` for CDI mocks.
- Use Dev Services and `QuarkusTestResourceLifecycleManager` for external dependencies; use continuous testing in dev mode.
- Run `*IT` tests with `./mvnw verify -DskipITs=false` (Failsafe; the generated pom sets `skipITs=true`), not `test`. Test artifacts are `quarkus-junit` (3.31+) or `quarkus-junit5` (older); keep what the project uses.

## Avoid

- Reflection-heavy libraries without `@RegisterForReflection` when targeting native.
- Blocking calls on the event loop (use `@Blocking` or virtual threads with `@RunOnVirtualThread`).
- Swallowing exceptions or hard-coding configuration values.

Upgrading Quarkus: run `quarkus update` (<https://quarkus.io/guides/update-quarkus>) and read the version's migration guide at <https://github.com/quarkusio/quarkus/wiki/Migration-Guide-3.20> (change the version) before editing.
