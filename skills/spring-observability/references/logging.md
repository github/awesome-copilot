# Logging

## Structured logging (Boot 3.4+)

Built in; no extra dependency for ECS, Logstash and GELF formats.

```yaml
logging:
  structured:
    format:
      console: ecs        # also: logstash, gelf
      file: ecs
    ecs:
      service:
        name: orders
        version: 1.4.0
        environment: prod
```

- Customize JSON with `logging.structured.json.include/exclude/rename/add.*` or a `StructuredLoggingJsonMembersCustomizer` bean (`logging.structured.json.customizer`).
- Custom format: implement `StructuredLogFormatter<E>` and set `logging.structured.format.console` to its class name.
- Use plain text locally and JSON in production profiles (`application-prod.yml`).
- Stack trace shaping: `logging.structured.json.stacktrace.*`.

## Correlation ids

- With tracing on the classpath, `traceId` and `spanId` are put in the MDC and appear in the default log pattern and in structured output.
- Without tracing, set a correlation id yourself (servlet filter putting a header value into `MDC`, cleared in `finally`).
- Customize the pattern: `logging.pattern.correlation=[%X{traceId:-},%X{spanId:-}] `; include with `logging.include-application-name`/`logging.include-application-group` (Boot 3.4+).
- Propagate the id to downstream calls (automatic for tracing-enabled clients).

## Practices

- Use SLF4J parameterized logging (`log.info("order {} placed", id)`), no string concatenation.
- Never log secrets, tokens, passwords, or full personal data. Mask at the source.
- Change levels at runtime only via a secured `loggers` endpoint.
- Levels: `logging.level.root=INFO`, `logging.level.com.example=DEBUG` for focused debugging; use logging groups for related packages.
