# Containers, waiting, networks, Compose

## Modules vs GenericContainer

Prefer a dedicated module (`testcontainers-postgresql`, `-mysql`, `-mariadb`, `-kafka`, `-mongodb`, `-localstack`, ...) when one exists: it supplies the right wait strategy, credentials, and typed getters. Fall back to `GenericContainer` for anything else.

```java
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import java.time.Duration;

GenericContainer<?> app = new GenericContainer<>("my-registry/my-service:1.4.2")
        .withExposedPorts(8080)
        .withEnv("MODE", "test")
        .waitingFor(Wait.forHttp("/health").forStatusCode(200))
        .withStartupTimeout(Duration.ofMinutes(2));
```

## Wait strategies

Set via `waitingFor(...)`. Pick the signal that means "actually ready", not "process started".

| Strategy | Use |
| --- | --- |
| `Wait.forListeningPorts()` | Port open (may be before the app is ready) |
| `Wait.forHttp(path).forStatusCode(200)` | HTTP health endpoints |
| `Wait.forLogMessage(regex, times)` | Ready line in logs (regex must match the whole line, e.g. `.*ready.*\\n`) |
| `Wait.forHealthcheck()` | Image defines `HEALTHCHECK` |
| `Wait.forSuccessfulCommand("cmd")` | Probe via exec inside the container |
| `new WaitAllStrategy().withStrategy(a).withStrategy(b)` | Combine strategies (`org.testcontainers.containers.wait.strategy.WaitAllStrategy`) |

Raise `withStartupTimeout` on slow CI instead of adding sleeps. Never use `Thread.sleep`; poll with Awaitility for asynchronous outcomes in tests.

## Configuration and files

- `withEnv`, `withCommand`, `withLabel`, `withTmpFs(Map.of("/var/lib/postgresql/data", "rw"))` (RAM-backed data dir speeds DB tests).
- Classpath resources: `withCopyFileToContainer(MountableFile.forClasspathResource("conf.yml"), "/etc/app/conf.yml")` (preferred over bind mounts: works with remote Docker).
- Bind mounts (`withFileSystemBind`) break on remote daemons and some rootless setups; avoid.

## Init scripts

Database modules: `withInitScript("db/init.sql")` (classpath) runs once after start. Alternatively copy scripts into `/docker-entrypoint-initdb.d/` (official Postgres/MySQL images). For schema evolution, run your real migration tool (Flyway/Liquibase) against the container rather than duplicating DDL in init scripts.

## Networks and multi-container setups

Containers reach each other by network alias, not by mapped port.

```java
import org.testcontainers.containers.Network;

Network net = Network.newNetwork();   // cleaned up by Ryuk

var db = new PostgreSQLContainer("postgres:17-alpine")
        .withNetwork(net).withNetworkAliases("db");

var app = new GenericContainer<>("my-registry/my-service:1.4.2")
        .withNetwork(net)
        .withEnv("DB_URL", "jdbc:postgresql://db:5432/test")
        .dependsOn(db)
        .withExposedPorts(8080);
```

Inside the network use the container-internal port (5432); from the test JVM use `getMappedPort`.

## Docker Compose module

For stacks already described in a compose file, use `ComposeContainer` (requires the Docker Compose v2 CLI; class `org.testcontainers.containers.ComposeContainer`, in the core artifact).

```java
import org.testcontainers.containers.ComposeContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import java.io.File;

static ComposeContainer env = new ComposeContainer(new File("src/test/resources/compose-test.yml"))
        .withExposedService("api", 8080, Wait.forHttp("/health").forStatusCode(200))
        .withExposedService("db", 5432);

env.start(); // endpoints are only available after start
try {
    String host = env.getServiceHost("api", 8080);
    Integer port = env.getServicePort("api", 8080);
    // run the test against host:port
} finally {
    env.stop();
}
```

Do not publish fixed host ports in the compose file used for tests. Prefer individual containers for one or two services (faster, typed); use Compose to reuse a multi-service definition.

## Useful extras

- `container.followOutput(new Slf4jLogConsumer(log))` to stream logs; `getLogs()` on failure.
- `withCreateContainerCmdModifier(cmd -> cmd.getHostConfig().withMemory(512L * 1024 * 1024))` to cap resources.
- `DockerImageName.parse("mirror/postgres:17").asCompatibleSubstituteFor("postgres")` for mirrored or custom images with a module.
