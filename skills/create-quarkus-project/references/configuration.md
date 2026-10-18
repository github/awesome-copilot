# Configuration

Quarkus reads (highest priority first): system properties, environment variables, `.env`, `config/application.properties`, `src/main/resources/application.properties` (or `.yaml` with `quarkus-config-yaml`).

## Profiles

Built-in profiles: `dev` (`quarkus:dev`), `test`, `prod` (packaged app).

```properties
quarkus.http.port=8080
%dev.quarkus.log.level=DEBUG
%prod.quarkus.http.cors.enabled=false
```

Env var mapping: `quarkus.http.port` -> `QUARKUS_HTTP_PORT`. Activate a profile with `-Dquarkus.profile=staging` or `QUARKUS_PROFILE`.

## Type-safe config

```java
@ConfigMapping(prefix = "app.mail")
public interface MailConfig {
    String from();
    @WithDefault("25") int port();
    Optional<String> replyTo();
}
```

Inject it via the constructor. Use `@ConfigProperty(name = "app.name")` only for single values. Validate with Bean Validation annotations on mapping methods (requires `hibernate-validator`).

## Secrets

Never commit secrets. Use `${DB_PASSWORD}` expressions, env vars, Kubernetes secrets, or a vault extension. Keep a `.env` file (git-ignored) for local overrides; Quarkus also loads it from the working directory of a packaged app, so never deploy it.
