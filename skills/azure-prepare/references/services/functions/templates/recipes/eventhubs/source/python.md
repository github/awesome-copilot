# Python Event Hub Trigger

## Source Code

Replace `function_app.py` with:

```python
import azure.functions as func
import json
import logging
from typing import List

app = func.FunctionApp()


@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="%EVENTHUB_NAME%",
    connection="EventHubConnection",
    consumer_group="%EVENTHUB_CONSUMER_GROUP%",
    cardinality=func.Cardinality.MANY
)
def eventhub_trigger(events: List[func.EventHubEvent]):
    """Process batch of events from Event Hub."""
    for event in events:
        body = event.get_body().decode('utf-8')
        logging.info(f"Event Hub trigger processed event: {body}")
        logging.info(f"  Partition: {event.partition_key}")
        logging.info(f"  EnqueuedTime: {event.enqueued_time}")
        logging.info(f"  SequenceNumber: {event.sequence_number}")


@app.function_name("send_event")
@app.route(route="send", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
@app.event_hub_output(
    arg_name="outputEvent",
    event_hub_name="%EVENTHUB_NAME%",
    connection="EventHubConnection"
)
def send_event(req: func.HttpRequest, outputEvent: func.Out[str]) -> func.HttpResponse:
    """HTTP endpoint to send events to Event Hub."""
    try:
        body = req.get_json()
    except ValueError:
        body = {"message": req.get_body().decode('utf-8') or "Hello Event Hub!"}
    
    event_data = json.dumps(body)
    outputEvent.set(event_data)
    
    logging.info(f"Sent event to Event Hub: {event_data}")
    return func.HttpResponse(
        json.dumps({"status": "sent", "data": body}),
        mimetype="application/json",
        status_code=200
    )


@app.route(route="health", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint."""
    return func.HttpResponse("OK", status_code=200)
```

## Files to Remove

- Any existing HTTP trigger functions (from base template)

## Package Dependencies

No additional packages required - Event Hubs bindings are included in the extension bundle.

## Configuration Notes

- `%EVENTHUB_NAME%` - Reads from app setting at runtime
- `%EVENTHUB_CONSUMER_GROUP%` - Reads from app setting at runtime
- `connection="EventHubConnection"` - Uses settings prefixed with `EventHubConnection__`
- `cardinality=func.Cardinality.MANY` - Batch processing for better throughput

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
