# Configuration

Formats, profiles, `.env` and secret basics, and the short `@ConfigurationProperties` example already live in `create-spring-boot-java-project` (`references/configuration.md`); read it for those and keep one format (properties or YAML) as the project already does. This file adds what is needed when changing an existing application. Verified on Boot 4.1.1.

## Type-safe properties (records)

```java
@ConfigurationProperties(prefix = "app.mail")
@Validated
public record MailProperties(@NotBlank String from, @DefaultValue("3") @Positive int retries,
		@DefaultValue("5s") Duration timeout) {}
```

```properties
app.mail.from=noreply@example.com
```

- Records bind through their canonical constructor (constructor binding is the default for records). Use `@DefaultValue` (`org.springframework.boot.context.properties.bind.DefaultValue`) for optional values; `Duration`, `DataSize`, enums and `List`/`Map` bind natively (`5s`, `PT5S`, `10MB`).
- Register with `@ConfigurationPropertiesScan` on the application class (or `@EnableConfigurationProperties(MailProperties.class)`). Verified: the record is a bean with `retries == 3` and `timeout == 5s` when only `from` is set.
- `@Validated` + `jakarta.validation` constraints make the application fail at startup on invalid configuration, which is what you want. Validation needs the validation starter (`spring-boot-starter-validation`).
- Prefer `@ConfigurationProperties` to scattered `@Value`; use `@Value` only for one-off values. Add `spring-boot-configuration-processor` (optional/annotation-processor path, as start.spring.io does) for IDE metadata.
- Immutability: no setters; nested config as nested records.
- Inject the record where needed; do not read `Environment` directly in business code.

## Profiles

- Keep production-safe defaults in `application.properties`; profile files (`application-dev.properties`) only override what differs. Activate with `SPRING_PROFILES_ACTIVE`.
- Group related profiles with `spring.profiles.group.prod=prod-db,prod-observability` when a deployment needs several.
- Use `@Profile` sparingly for beans; do not branch application logic on profile names.
- Do not ship a `test` profile in `src/main`; tests use `src/test/resources` or `@TestPropertySource` (see `spring-boot-testing`).

## Config import and secrets

```properties
spring.config.import=optional:file:.env[.properties],optional:configtree:/run/secrets/
```

- `optional:` prevents startup failure when the file is absent (local development); drop it for values that must exist in production.
- Kubernetes/Docker secrets mounted as files: `configtree:` maps each file to a property (file name = key).
- Environment variables override files through relaxed binding (`APP_MAIL_FROM` -> `app.mail.from`).
- Never commit `.env` or real credentials; commit `.env.sample`. Do not log property values holding secrets, and do not expose `/actuator/env` and `/actuator/configprops` publicly (`spring-observability`, `spring-security`).
- Externalized config sources like Vault or Spring Cloud Config are out of scope unless the project already uses them; follow its existing import setup.

## Dev-time services

### Docker Compose

Add `spring-boot-docker-compose` (start.spring.io adds it, optional/development-only). With a `compose.yaml` at the project root, `./mvnw spring-boot:run` starts the services and wires connection details automatically. Pin image tags (start.spring.io generates `postgres:latest`; replace it, see `create-spring-boot-java-project` `references/database.md`). Not executed in this skill's verification: only the generated files were inspected.

### Testcontainers at dev time

start.spring.io (with the `testcontainers` dependency) generates `TestcontainersConfiguration` and a `TestDemoApplication` in `src/test`:

```java
public class TestDemoApplication {
	public static void main(String[] args) {
		SpringApplication.from(DemoApplication::main).with(TestcontainersConfiguration.class).run(args);
	}
}
```

Run it with `./mvnw spring-boot:test-run` (Gradle: `./gradlew bootTestRun`). Verified on Boot 4.1.1: PostgreSQL and Kafka containers started from the `@ServiceConnection` beans, the app reached `UP` on `/actuator/health`, and stopping the app removed the containers (Ryuk). Make `TestcontainersConfiguration` `public` if it is used from other packages (see `create-spring-boot-java-project` `references/spring-boot-4.md`). Choose either Compose or Testcontainers for dev-time services, not both, to avoid two databases fighting over the same properties.

## Boot 3 vs 4

Same property binding rules. Boot 4 changes that touch configuration: Jackson properties continue under `spring.jackson.*` for Jackson 3 (Jackson 2 compatibility lives in a separate module; consult the migration guide), modular auto-configuration (classes moved to `org.springframework.boot.<technology>.autoconfigure`, which matters only if you reference or exclude auto-configurations by class name: `spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration`). Use the `spring-boot-4-migration` skill for the move itself.
