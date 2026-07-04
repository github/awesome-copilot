---
name: structured-logging-adopter
description: 'Convert ad-hoc print/console logging to structured JSON logging with consistent fields, levels, and correlation IDs. Use when the user wants to adopt structured logging, replace console.log or print statements, prepare logs for aggregation in ELK, Loki, or CloudWatch, or add request correlation to logs.'
license: MIT
---

# Structured Logging Adopter

Migrate a codebase from unstructured `print`/`console.log` statements to structured, machine-parseable logging that log aggregators can index.

## When to Use This Skill

Use this skill when you need to:
- Replace `console.log`/`print`/`System.out.println` scattered through a codebase
- Emit JSON logs consumable by ELK, Grafana Loki, CloudWatch, or Datadog
- Standardize log levels and event fields across services
- Add correlation/request IDs so one request can be traced across log lines

## Migration Workflow

1. **Inventory**: find all logging call sites (`console.*`, `print`, `fmt.Println`, `System.out`) and classify each as debug noise, operational event, or error.
2. **Pick the idiomatic library**: pino (Node), structlog or stdlib `logging` + JSON formatter (Python), slog (Go), Serilog (.NET), Logback + logstash-encoder (Java).
3. **Define the field contract**: `timestamp`, `level`, `message`, `service`, `env`, plus domain fields (`order_id`, `user_id`). Never interpolate values into the message string - put them in fields.
4. **Convert call sites**, deleting debug noise instead of porting it.
5. **Add correlation**: middleware generates/propagates a request ID and injects it into every log line in that request's scope.
6. **Configure output**: JSON to stdout in production (12-factor), pretty-print only in local dev.

## Usage Examples

### Example 1: Node.js with pino

```javascript
// Before
console.log("User " + userId + " placed order " + orderId);

// After
import pino from "pino";
const logger = pino({ base: { service: "orders-api" } });
logger.info({ userId, orderId }, "order placed");
```

### Example 2: Python with structlog

```python
# Before
print(f"payment failed for order {order_id}: {err}")

# After
import structlog
log = structlog.get_logger()
log.error("payment failed", order_id=order_id, error=str(err))
```

### Example 3: Request correlation middleware (Express)

```javascript
import { randomUUID } from "crypto";
app.use((req, res, next) => {
  req.log = logger.child({ requestId: req.get("x-request-id") ?? randomUUID() });
  next();
});
// handlers use req.log.info(...) so every line carries requestId
```

## Level Conventions

| Level | Use for |
|---|---|
| `error` | Failed operations needing attention; always include the error and context fields |
| `warn` | Degraded but handled: retries, fallbacks, deprecations |
| `info` | Business events: request completed, order created, job finished |
| `debug` | Developer diagnostics; disabled in production by default |

## Guidelines

1. **Log events, not sentences** - `"order placed"` + fields beats `"User 42 placed order 7 successfully!!"`.
2. **Never log secrets or PII** - redact tokens, passwords, card numbers; hash user identifiers when policy requires.
3. **One log per event** - avoid multi-line logs; stack traces go in an `error` field, not raw output.
4. **snake_case or camelCase, not both** - pick the aggregator-friendly convention and enforce it.
5. **Errors logged at the boundary** - log where the error is handled, not at every rethrow (avoids duplicates).

## Limitations

- Log-based metrics are a stopgap; suggest real metrics/tracing (OpenTelemetry) when the user needs latency percentiles.
- Retrofitting correlation IDs across async boundaries (queues, cron) requires message-level propagation the skill must implement per broker.
