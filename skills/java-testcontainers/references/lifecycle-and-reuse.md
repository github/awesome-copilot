# Lifecycle, singleton and reuse

## JUnit Jupiter extension

`@Testcontainers` on the class activates the extension; `@Container` fields are started/stopped by it.

- `static` field: started once before all tests of the class, stopped after.
- instance field: started/stopped around each test method.
- The extension does not start containers declared without `@Container`; call `start()` yourself.

`@Testcontainers(disabledWithoutDocker = true)` skips tests (instead of failing) when Docker is missing. Use it for optional local runs; in CI prefer failing loudly.

## Singleton container pattern (whole run)

Starting a container per class dominates test time. Share one instance across classes with a holder that starts in a static initializer. Ryuk (the cleanup sidecar) stops it when the JVM exits, so no explicit stop is needed.

```java
import org.testcontainers.postgresql.PostgreSQLContainer;

public final class SharedPostgres {

    public static final PostgreSQLContainer INSTANCE =
            new PostgreSQLContainer("postgres:17-alpine");

    static {
        INSTANCE.start();
    }

    private SharedPostgres() {}
}
```

Test classes read `SharedPostgres.INSTANCE.getJdbcUrl()` and do **not** annotate it with `@Container` (that would stop it after the first class). An abstract base class with the static block works equally well.

Isolate data instead of containers: truncate tables in `@BeforeEach`, roll back transactions, or create a schema/database per class.

## Reuse between runs (local dev only)

Reuse keeps containers alive after the JVM exits so the next run is instant.

1. Opt in on the developer machine in `~/.testcontainers.properties`: `testcontainers.reuse.enable=true`.
2. Mark the container: `new PostgreSQLContainer("postgres:17-alpine").withReuse(true)`, and start it manually (static block or `start()`). Do not annotate it with `@Container`: the JUnit extension stops it after the tests, so nothing is reused.

Caveats: reused containers are never stopped by Testcontainers (clean manually with `docker rm -f`); state persists, so tests must clean their own data; reuse is ignored unless both settings are present, so it is safe to leave `withReuse(true)` in code. Do not enable it in CI.

## Parallel execution

- JUnit parallel mode with a shared container is fine if tests do not share rows; give each test its own tenant/schema/key prefix.
- Do not parallelize tests that truncate shared tables.
- Resource-hungry containers (Kafka, Elasticsearch) should stay singletons.

## Manual lifecycle

Containers are `AutoCloseable`:

```java
try (var redis = new GenericContainer<>("redis:7.4-alpine").withExposedPorts(6379)) {
    redis.start();
    // use redis.getHost(), redis.getMappedPort(6379)
}
```

## Ports and addresses

Never bind fixed host ports. Use `getHost()` and `getMappedPort(containerPort)`; for modules prefer the typed getters (`getJdbcUrl()`, `getBootstrapServers()`). Mapped ports are random per start.
