# Logging

Spring Boot logs with Logback through SLF4J by default. Code must depend only on the SLF4J API (`org.slf4j.Logger`), never on Logback or `System.out`.

```java
private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

logger.info("Order {} created for customer {}", order.id(), customerId);
logger.error("Payment failed for order {}", orderId, exception); // exception last, no placeholder
```

## Rules

- Parameterized messages, not string concatenation.
- Levels: `ERROR` = needs attention; `WARN` = recoverable anomaly; `INFO` = business events and lifecycle; `DEBUG`/`TRACE` = diagnostics (off in production).
- Never log secrets, tokens, passwords or personal data; log identifiers instead.
- Log an exception once, where it is handled, with the stack trace.
- Do not log inside tight loops.

## Configuration

```properties
logging.level.root=INFO
logging.level.com.example=INFO
# dev profile: logging.level.com.example=DEBUG
```

Prefer properties over a custom `logback-spring.xml`; add the XML only for needs properties cannot cover (appenders, rolling files).

## Structured logging (Spring Boot 3.4+)

For production and log aggregation, emit JSON without extra dependencies:

```properties
logging.structured.format.console=ecs
```

Other built-in formats: `logstash`, `gelf`. In containers, log to the console and let the platform collect it.

## Correlation

Use Micrometer Tracing / the `spring-observability` skill so trace and span ids appear in logs; use MDC for request-scoped values (`MDC.put("requestId", ...)`, always cleared in `finally`).
