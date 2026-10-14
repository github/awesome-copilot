# Observation API and tracing

## Observation API

One instrumentation point produces metrics and traces (Micrometer Observation).

```java
@Service
class OrderService {
    private final ObservationRegistry registry;
    OrderService(ObservationRegistry registry) { this.registry = registry; }

    Order place(Order o) {
        return Observation.createNotStarted("order.place", registry)
            .lowCardinalityKeyValue("channel", o.channel())      // metric + span tag
            .highCardinalityKeyValue("order.id", o.id())         // span tag only
            .observe(() -> doPlace(o));
    }
}
```

Or annotate with `@Observed(name = "order.place")` and register an `ObservedAspect` bean (needs `spring-boot-starter-aop`/AspectJ on the classpath; Boot 4 names it `spring-boot-starter-aspectj`). Customize via `ObservationFilter`, `ObservationPredicate`, and `ObservationConvention` beans.

## Tracing with OpenTelemetry

Boot 3.x (bridge to the OTel SDK):

- `io.micrometer:micrometer-tracing-bridge-otel` and `io.opentelemetry:opentelemetry-exporter-otlp` (versions managed by Boot).

Boot 4.x:

- `org.springframework.boot:spring-boot-starter-opentelemetry` (documented as the OpenTelemetry starter for traces, metrics, logs via OTLP). Zipkin: `spring-boot-starter-zipkin`.
- Modular artifacts exist (`spring-boot-micrometer-tracing-opentelemetry`, `spring-boot-opentelemetry`), but prefer starters. Verify names against your Boot version's reference docs.

```yaml
management:
  tracing:
    sampling:
      probability: 1.0        # default 0.1; use 1.0 only in dev/test
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces
spring:
  application:
    name: orders               # becomes service.name
```

- Propagation defaults to W3C `traceparent`; `management.tracing.propagation.type` can add B3.
- Auto-instrumented: Spring MVC/WebFlux, `RestClient`, `RestTemplate`, `WebClient` (built from the injected builders), JDBC (with datasource-micrometer or similar), messaging templates.
- Local backends: Zipkin, Jaeger, or Grafana LGTM via Testcontainers/`spring-boot-docker-compose` in dev only.
- Do not put PII or secrets in span attributes.
