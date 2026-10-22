# Observability, resilience, REST Client, scheduler, cache

All items below were exercised on Quarkus 3.40.1 and 3.27.6 unless marked "not verified".

## Health (`quarkus-smallrye-health`)

Endpoints: `/q/health`, `/q/health/live`, `/q/health/ready`, `/q/health/started`. Custom checks are CDI beans:

```java
@Readiness                       // or @Liveness / @Startup (org.eclipse.microprofile.health)
@ApplicationScoped
public class Ready implements HealthCheck {
    public HealthCheckResponse call() { return HealthCheckResponse.up("demo"); }
}
```

Verified: `/q/health/ready` returned 200 with the check name. Extensions such as the JDBC datasource add their own readiness checks. Keep liveness trivial (no dependency checks, or the platform restarts pods during outages); put dependency checks in readiness.

## Metrics (`quarkus-micrometer-registry-prometheus`)

Prometheus scrape at `/q/metrics`. Inject `MeterRegistry` for custom meters (`registry.counter("demo.fallback").increment()` appeared as `demo_fallback_total`, verified). HTTP server and JVM meters are on by default. Use `@Counted`/`@Timed` (Micrometer annotations) where they are enough. Expose `/q/metrics` and `/q/health` only to the cluster/monitoring network (a separate management interface: `quarkus.management.enabled=true`, not verified here).

## OpenTelemetry (`quarkus-opentelemetry`)

Only traces are on by default. Metrics and logs are tech preview and disabled at build time: set `quarkus.otel.metrics.enabled=true` and `quarkus.otel.logs.enabled=true` to export them (checked against the Quarkus OpenTelemetry guide). HTTP, REST Client, JDBC (with `quarkus.datasource.jdbc.telemetry=true`) and messaging are instrumented. Point it at a collector with `quarkus.otel.exporter.otlp.endpoint=http://collector:4317` (verified only that without a collector the app logs "Failed to export ... Connection refused" to `localhost:4317` but works). Add custom spans with `@WithSpan` or inject `Tracer`. In dev mode, Quarkus Dev Services for observability (Grafana LGTM, `quarkus-observability-devservices-lgtm`) can supply a backend; not verified here. Do not set both Micrometer and OTel metrics export without a reason.

## Fault tolerance (`quarkus-smallrye-fault-tolerance`)

```java
@Retry(maxRetries = 2) @Fallback(fallbackMethod = "fb")
public String flaky() { throw new IllegalStateException(); }
String fb() { return "fallback"; }
```

Verified: the method executed 3 times (1 + 2 retries) and the fallback value was returned. Also `@Timeout`, `@CircuitBreaker`, `@Bulkhead`, `@RateLimit` (SmallRye extension). They are CDI interceptors on bean methods; ArC also intercepts self-invocation. Works with `Uni` return types (asynchronous, non-blocking). Always set a `@Timeout` on remote calls; do not retry non-idempotent operations.

## REST Client (`quarkus-rest-client-jackson`)

```java
@RegisterRestClient(configKey = "echo")
@Path("/greetings")
public interface EchoClient {
    @GET @Path("/{n}") Greeting get(@PathParam("n") String n);
}
```

```properties
quarkus.rest-client.echo.url=${ECHO_URL:http://localhost:8081}
quarkus.rest-client.echo.read-timeout=5000
```

Inject with `@RestClient EchoClient echo;` (`org.eclipse.microprofile.rest.client.inject.RestClient`). Verified: bean injection and startup (the call itself was not exercised). Combine with `@Timeout`/`@Retry`; throw domain exceptions with `@ClientExceptionMapper`. In tests, stub the remote service with WireMock via a test resource (see `quarkus-dev-services-and-testing`).

## Scheduler (`quarkus-scheduler`)

`@Scheduled(every = "1s")` or `@Scheduled(cron = "{app.cron}")` on a bean method (verified: ticks incremented). Use `concurrentExecution = SKIP` to avoid overlaps. The scheduler is per instance; in a cluster use the `quarkus-quartz` extension with a shared JDBC store and `quarkus.quartz.clustered=true` (it defaults to `false`, so a JDBC store alone leaves schedulers uncoordinated), or a distributed lock, to run a job once. Scheduled methods run on a worker thread unless `@NonBlocking`/returns `Uni`; use `@RunOnVirtualThread` for blocking IO.

## Cache (`quarkus-cache`)

```java
@CacheResult(cacheName = "slow")
public String slow(String k) { ... }
```

Verified: two calls with the same key executed the method once. Configure with `quarkus.cache.caffeine."slow".maximum-size=10` and `expire-after-write=60S`. Also `@CacheInvalidate`, `@CacheInvalidateAll`, `@CacheKey`. Interceptor-based; ArC also intercepts self-invocation. Caches are per-instance in memory; use `quarkus-redis-cache` for shared caches (not verified here).
