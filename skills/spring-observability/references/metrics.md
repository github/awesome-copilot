# Micrometer metrics

Boot auto-configures a composite `MeterRegistry` plus a registry for each `micrometer-registry-*` found on the classpath.

## Export

- Prometheus scrape: add `io.micrometer:micrometer-registry-prometheus` (version managed by Boot) and expose `prometheus`. Endpoint: `/actuator/prometheus`.
- OTLP push: `io.micrometer:micrometer-registry-otlp`, then `management.otlp.metrics.export.url=http://collector:4318/v1/metrics`. With Boot 4 `spring-boot-starter-opentelemetry` also provides OTLP export of metrics, traces and logs, check the Boot reference for current properties.
- Disable all exporters in tests: `management.defaults.metrics.export.enabled=false`.

## Common tags

```java
@Bean
MeterRegistryCustomizer<MeterRegistry> commonTags(@Value("${spring.application.name}") String app) {
    return r -> r.config().commonTags("application", app);
}
```

(Package: Boot 3.x `org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer`; Boot 4.x `org.springframework.boot.micrometer.metrics.autoconfigure.MeterRegistryCustomizer`.) Alternatively `management.metrics.tags.application=${spring.application.name}`.

## Custom metrics

```java
Counter.builder("orders.created").tag("channel", "web").register(registry).increment();
Timer.builder("orders.processing").publishPercentileHistogram().register(registry).record(() -> process());
Gauge.builder("orders.queue.size", queue, Queue::size).register(registry);
```

- Use `@Timed`/`@Counted` only with the `TimedAspect`/`CountedAspect` beans and AOP present.
- Keep tag cardinality bounded (never user ids, raw URLs, exception messages).
- HTTP server metrics: `http.server.requests` is on by default; enable histograms with `management.metrics.distribution.percentiles-histogram.http.server.requests=true`.
- JVM, DB pool (HikariCP), cache, Kafka and executor metrics are automatic when present.

## Testing

Use `SimpleMeterRegistry` in unit tests, and `@AutoConfigureObservability` (or enable export explicitly) in slices that disable metrics by default.
