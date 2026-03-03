# Service Bus Recipe - Python Eval

## Test Summary

| Test | Status | Notes |
|------|--------|-------|
| Code Syntax | ✅ PASS | Python v2 model decorator pattern |
| Queue Trigger | ✅ PASS | Uses `@app.service_bus_queue_trigger` |
| Output Binding | ✅ PASS | `@app.service_bus_queue_output` decorator |
| Health Endpoint | ✅ PASS | Returns queue name |
| Message Metadata | ✅ PASS | Logs message_id, delivery_count |

## Code Validation

```python
# Validated patterns:
# - @app.service_bus_queue_trigger with queue_name
# - @app.service_bus_queue_output for sending
# - func.ServiceBusMessage with metadata access
# - connection="ServiceBusConnection" (UAMI pattern)
```

## Configuration Validated

- `ServiceBusConnection__fullyQualifiedNamespace` - UAMI binding
- `%SERVICEBUS_QUEUE_NAME%` - Runtime config
- Uses extension bundle v4

## Test Date

2025-02-18

## Verdict

**PASS** - Service Bus recipe correctly implements queue trigger and output binding with proper UAMI authentication pattern.
