# Environment, CI, troubleshooting, migration

## Docker availability

Testcontainers needs a Docker-API-compatible daemon. Check with `docker info`.

- Docker Desktop, Rancher Desktop, Colima, OrbStack, and Podman (Docker-compatible socket) work. When the socket is non-standard, set `DOCKER_HOST` (e.g. `unix:///run/user/1000/podman/podman.sock`); with rootless Podman, `TESTCONTAINERS_RYUK_DISABLED=true` may be needed if the Ryuk sidecar cannot mount the socket (then clean up containers yourself).
- Settings can live in `~/.testcontainers.properties` (`docker.host=...`) or `TESTCONTAINERS_*` environment variables.
- Colima on macOS: `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`.
- Without Docker, tests fail with "Could not find a valid Docker environment". Fix the environment, or gate optional local runs with `@Testcontainers(disabledWithoutDocker = true)`.

## CI

- GitHub Actions `ubuntu-*` runners ship Docker; no setup needed. Self-hosted runners must expose the socket to the job user.
- Docker-in-Docker CI (GitLab, containerized Jenkins agents): mount the host socket or use a DinD service and set `DOCKER_HOST`; set `TESTCONTAINERS_HOST_OVERRIDE` if the daemon host is not localhost.
- Cache images between runs and avoid Docker Hub rate limits with a registry mirror (`hub.image.name.prefix` in properties or `TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX`).
- Private registries: `docker login` (credential helpers in `~/.docker/config.json` are honored).
- Do not enable container reuse in CI.
- Print container logs on failure and keep timeouts generous (2 minutes for heavy images).
- Separate unit and integration phases (`maven-failsafe-plugin` with `*IT`, or a Gradle `integrationTest` task).

## Performance checklist

1. Singleton containers across classes (see `lifecycle-and-reuse.md`).
2. Small images (`-alpine`, slim) pinned by tag; pre-pull in CI.
3. `withTmpFs` for database data dirs.
4. Truncate/rollback instead of restarting.
5. Start independent containers in parallel (`Startables.deepStart(a, b, c).join()`, `org.testcontainers.lifecycle.Startables`).
6. Avoid heavyweight services if a lighter equivalent preserves the behavior under test.

## Common errors

| Symptom | Likely cause / fix |
| --- | --- |
| `Could not find a valid Docker environment` | Daemon down or wrong socket; set `DOCKER_HOST`. |
| Container startup timeout | Wrong wait strategy, image crash (read `getLogs()`), low resources; raise timeout. |
| Connection refused right after start | Port open but app not ready; use HTTP/log/healthcheck wait. |
| Works for first class, fails for next | `@Container` on a singleton stopped after first class; remove the annotation. |
| Container cannot reach another | Mapped port used inside a network; use alias + internal port. |
| `ClassNotFoundException: ...containers.PostgreSQLContainer` | 2.x package move, see below. |
| Ryuk errors | Rootless/Podman socket mount; see Docker availability. |
| Surefire `The exit has elapsed 30 seconds after System.exit(0)` / `going to kill self fork JVM` | A JVM shutdown hook hangs after the tests (not a Testcontainers-specific message). Not reproduced with Testcontainers 2.0.5 + Surefire 3.5.5/3.5.6 + Docker Desktop 29.8 on JDK 21/25/27, with static `@Container`, `@ServiceConnection` and a Spring-managed container bean (all exit in a second), so Docker Desktop, Ryuk and Testcontainers 2.x are not the cause by themselves. Diagnose: run `jstack <fork pid>` (or `jcmd Thread.print`) during the 30 s and read which hook thread is blocked (typically an application or Spring context hook closing a pool or client against a container that is already gone, or a user-registered hook); close such resources before the container stops, or set `-Dsurefire.exitTimeout=<seconds>` lower to fail fast. |

## 1.x to 2.x migration

| 1.x | 2.x |
| --- | --- |
| `org.testcontainers:junit-jupiter` | `org.testcontainers:testcontainers-junit-jupiter` |
| `org.testcontainers:postgresql` (and other modules) | `org.testcontainers:testcontainers-postgresql` (same prefix rule) |
| `org.testcontainers.containers.PostgreSQLContainer<?>` | `org.testcontainers.postgresql.PostgreSQLContainer` (non-generic) |
| JUnit 4 `@Rule`/`@ClassRule` | Removed; migrate tests to JUnit Jupiter |
| `DockerComposeContainer` | `ComposeContainer` (Compose v2) |
| Per-module versions | `testcontainers-bom` |

Steps: import the BOM, rename artifacts, fix imports module by module (the compiler flags each moved class), remove `<?>` from module container types, convert JUnit 4 tests. Check the release notes for the modules you use; each module's package follows `org.testcontainers.<module>`.

Docs: <https://java.testcontainers.org/>; releases: <https://github.com/testcontainers/testcontainers-java/releases>
