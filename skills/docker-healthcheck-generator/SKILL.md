---
name: docker-healthcheck-generator
description: 'Generate Docker HEALTHCHECK instructions and docker-compose healthcheck blocks tailored to the services detected in the project. Use when the user asks to add healthchecks to a Dockerfile or compose file, mentions container health, readiness of dependent services, or wants depends_on with service_healthy conditions.'
license: MIT
---

# Docker Healthcheck Generator

Generate correct, lightweight healthchecks for Dockerfiles and docker-compose services based on the technology detected in the repository.

## When to Use This Skill

Use this skill when you need to:
- Add a `HEALTHCHECK` instruction to an existing Dockerfile
- Add `healthcheck` blocks to services in `docker-compose.yml`
- Make `depends_on` wait for a dependency to be truly ready (`condition: service_healthy`)
- Diagnose containers stuck in `unhealthy` or `starting` state

## Workflow

1. **Detect the stack**: inspect Dockerfiles, compose files, and app code to identify each service (web app, database, cache, queue).
2. **Pick the lightest probe**: prefer a purpose-built client command over installing new tools; avoid `curl`/`wget` if the base image does not ship them.
3. **Generate the healthcheck** with sensible timings: `interval: 30s`, `timeout: 5s`, `retries: 3`, and `start_period` long enough for boot (10s for caches, 30-60s for JVM apps and databases).
4. **Wire dependencies**: update `depends_on` of consumers to use `condition: service_healthy`.
5. **Explain each choice** briefly so the user can tune values.

## Reference Probes by Service

| Service | Probe command |
|---|---|
| HTTP app (image has curl) | `curl -fsS http://localhost:PORT/health \|\| exit 1` |
| HTTP app (no curl, Node.js) | `node -e "fetch('http://localhost:PORT/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"` |
| HTTP app (no curl, Python) | `python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:PORT/health').status==200 else 1)"` |
| PostgreSQL | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` |
| MySQL/MariaDB | `mysqladmin ping -h localhost -p$MYSQL_ROOT_PASSWORD` |
| Redis | `redis-cli ping \| grep PONG` |
| MongoDB | `mongosh --quiet --eval "db.adminCommand('ping').ok" \| grep 1` |
| RabbitMQ | `rabbitmq-diagnostics -q ping` |
| Kafka | `kafka-broker-api-versions --bootstrap-server localhost:9092` |

## Usage Examples

### Example 1: Dockerfile for a Node.js API

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
```

### Example 2: Compose stack with a database dependency

```yaml
services:
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
```

## Guidelines

1. **The app must expose a real health endpoint** - if none exists, offer to create a `/health` route that checks critical dependencies.
2. **Keep probes cheap** - healthchecks run forever; avoid heavy queries or endpoints that cascade to external services.
3. **Use exec-form or CMD-SHELL consistently** - shell operators like `||` require `CMD-SHELL` (compose) or shell form (Dockerfile).
4. **Set start_period generously** - a failing check during boot marks the container unhealthy and can break `service_healthy` dependents.

## Limitations

- Healthchecks in Dockerfiles are ignored by Kubernetes; suggest liveness/readiness probes instead when K8s manifests are present.
- Distroless/scratch images cannot run shell probes; recommend a tiny healthcheck binary or a K8s-native probe.
