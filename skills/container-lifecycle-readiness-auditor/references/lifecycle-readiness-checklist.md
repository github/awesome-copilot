# Lifecycle Readiness Checklist

Use this checklist when auditing a containerized application for startup, health checking, dependency readiness, graceful shutdown, and restart/recovery behavior.

## Dockerfile

- Use exec-form `CMD` or `ENTRYPOINT` so the application process receives signals directly.
- If a wrapper script is required, ensure it uses `exec "$@"` or forwards `SIGTERM` and waits for the child process.
- Confirm the main process can start without interactive prompts, missing environment defaults, or backgrounding itself and exiting PID 1.
- Add a Docker `HEALTHCHECK` only when it can test meaningful readiness with a stable, low-cost command.
- Tune `HEALTHCHECK --start-period`, `--interval`, `--timeout`, and `--retries` to match the application's realistic startup and dependency behavior.
- Avoid health checks that expose secrets, require privileged credentials, or depend on external systems in a way that creates noisy false negatives.

## Docker Compose

- Use service `healthcheck` entries for dependencies that downstream services must wait for.
- Treat `depends_on` startup ordering as insufficient unless it is health-gated by the Compose version and syntax in use.
- Set restart behavior intentionally, such as `restart: unless-stopped` for local services or a policy that matches the operational expectation.
- Configure `stop_grace_period` when the application needs more than the default stop window to drain requests or flush state.
- Prefer application retry/backoff for dependencies that may be unavailable after the container starts.
- Validate rendered configuration with `docker compose config` before relying on it.

## Kubernetes

- Use `startupProbe` for slow-starting applications so liveness checks do not kill valid startups.
- Use `readinessProbe` to keep traffic away until the application can serve real requests.
- Use `livenessProbe` for deadlock or unrecoverable process detection, not for temporary dependency outages.
- Align `terminationGracePeriodSeconds` with the application's graceful shutdown budget.
- Include a preStop hook only when the application or platform needs it; do not use arbitrary sleeps as a substitute for readiness/drain behavior.
- Confirm rolling update settings leave enough ready replicas during restarts.
- Validate manifests with `kubectl apply --dry-run=client -f <path>` or a schema tool when available.

## Application Behavior

- Log lifecycle milestones: startup begin, dependency wait, readiness true/false, signal received, drain begin, shutdown complete, and fatal startup failure.
- Implement bounded retry/backoff for dependencies that may come up after the app process starts.
- Make readiness reflect the ability to serve useful traffic, not only that the process exists.
- Make liveness independent from transient dependency failures where possible.
- Stop accepting new work on shutdown, drain in-flight work, close connections, and exit before the orchestrator's grace period expires.
- Provide tests or smoke checks for health endpoints, signal handling, and dependency-unavailable startup behavior when practical.

## Weak vs Improved Example

Weak lifecycle configuration:

```yaml
services:
  api:
    build: .
    command: sh -c "node server.js"
    depends_on:
      - db
    restart: always
  db:
    image: postgres:16
```

Problems:

- The shell-form command can hide signal handling unless it `exec`s the application.
- `depends_on` only orders startup in many Compose configurations; it does not prove the database is ready.
- There is no health signal for the API or database.
- There is no explicit shutdown grace budget.

Improved lifecycle configuration:

```yaml
services:
  api:
    build: .
    command: ["node", "server.js"]
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/readyz"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 20s
    restart: unless-stopped
    stop_grace_period: 30s
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$${POSTGRES_USER}\""]
      interval: 5s
      timeout: 3s
      retries: 12
```

Why this is better:

- The API process is PID 1 and can receive `SIGTERM`.
- The API waits for the database health signal instead of mere container creation.
- Health checks use meaningful local readiness checks with explicit timing.
- The shutdown grace period is visible and reviewable.

## Safe Generic Validation Commands

Run only commands that fit the repository and local environment:

```bash
docker compose config
docker compose ps
docker inspect --format '{{json .State.Health}}' <container>
kubectl apply --dry-run=client -f <manifest-or-directory>
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
helm template <release-name> <chart-path>
```

Health checks should validate meaningful service readiness rather than only process existence. A command such as `pgrep app` may show that a process exists, but it does not prove the service can accept traffic, reach required local dependencies, or complete startup.
