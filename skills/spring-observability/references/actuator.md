# Actuator

Dependency: `spring-boot-starter-actuator`.

## Exposure

- Web exposure defaults to `health` only (Boot 3/4). Allow-list explicitly: `management.endpoints.web.exposure.include=health,info,metrics,prometheus`.
- Disable the rest: `management.endpoints.access.default=none` then enable chosen ones (`management.endpoint.<id>.access=read-only`) on Boot 3.4+; older `management.endpoint.<id>.enabled` still works on 3.3 and earlier.
- Move to an internal port: `management.server.port=9090` (and `management.server.address`).
- Secure with Spring Security: see `spring-security` skill, `references/actuator-protection.md` in that skill.
- Info: `management.info.env.enabled=true`, `management.info.git.mode=simple`, `management.info.build` via the build plugin's `build-info` goal.

## Health

```yaml
management:
  endpoint:
    health:
      show-details: when-authorized
      roles: ACTUATOR_ADMIN
      probes:
        enabled: true
      group:
        readiness:
          include: readinessState,db
        liveness:
          include: livenessState
```

- Probes (`/actuator/health/liveness`, `/readiness`) are enabled automatically on Kubernetes; enabling them elsewhere requires `probes.enabled=true` (Boot 4 enables them by default).
- Liveness must not depend on external systems (a failing DB must not restart the pod). Put DB, broker, etc. only in readiness if at all.
- Custom indicators: implement `HealthIndicator` (or `ReactiveHealthIndicator`); keep checks fast with timeouts.
- Graceful shutdown: `server.shutdown=graceful` and `spring.lifecycle.timeout-per-shutdown-phase=30s`.

## Other useful endpoints

`metrics`, `prometheus`, `loggers` (change levels at runtime; protect), `httpexchanges` (needs an `HttpExchangeRepository` bean), `scheduledtasks`, `caches`, `startup` (needs `BufferingApplicationStartup`). Treat `env`, `configprops`, `beans`, `mappings` as sensitive.
