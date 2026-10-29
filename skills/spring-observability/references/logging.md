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

- Customize JSON with `logging.structured.json.include/exclude/rename/add.*`. For code-based customization, implement `StructuredLoggingJsonMembersCustomizer` and register its fully qualified class name with `logging.structured.json.customizer`, or list the implementation under `org.springframework.boot.logging.structured.StructuredLoggingJsonMembersCustomizer` in `META-INF/spring.factories`. A Spring `@Bean` alone is not discovered: logging initializes before the application context.
- Custom format: implement `StructuredLogFormatter<E>` and set `logging.structured.format.console` to its class name.
- Use plain text locally and JSON in production profiles (`application-prod.yml`).
- Stack trace shaping: `logging.structured.json.stacktrace.*`.

## Correlation ids

- With tracing on the classpath, `traceId` and `spanId` are put in the MDC and appear in the default log pattern and in structured output.
- Without tracing, set a correlation id yourself (servlet filter putting a header value into `MDC`, cleared in `finally`).
- Customize the pattern: `logging.pattern.correlation=[%X{traceId:-},%X{spanId:-}] `; include with `logging.include-application-name`/`logging.include-application-group` (Boot 3.4+).
- Propagate the id to downstream calls (automatic for tracing-enabled clients).

## Practices

- Never log secrets, tokens, passwords, or full personal data.
- Change levels at runtime only via a secured `loggers` endpoint.
