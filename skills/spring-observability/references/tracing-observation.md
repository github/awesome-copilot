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
  # Boot 3.5:
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces
  # Boot 4.0 (replaces the block above):
  # opentelemetry:
  #   tracing:
  #     export:
  #       otlp:
  #         endpoint: http://localhost:4318/v1/traces
spring:
  application:
    name: orders               # becomes service.name
```

- Propagation defaults to W3C `traceparent`; `management.tracing.propagation.type` can add B3.
- Auto-instrumented: Spring MVC/WebFlux and `RestClient`, `RestTemplate`, `WebClient` built from the injected builders. JDBC needs additional instrumentation such as datasource-micrometer.
- Messaging observations require an explicit opt-in. For Kafka, enable both `spring.kafka.template.observation-enabled=true` and `spring.kafka.listener.observation-enabled=true` (both default to false) to create producer/listener spans and propagate tracing context. For RabbitMQ or another messaging technology, check its version-specific template/listener observation settings rather than assuming tracing dependencies enable them.
- Local backends: Zipkin, Jaeger, or Grafana LGTM via Testcontainers/`spring-boot-docker-compose` in dev only.
- Do not put PII or secrets in span attributes.
