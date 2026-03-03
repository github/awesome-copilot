# Python Service Bus Trigger

Replace `src/api/function_app.py` with this content.

## function_app.py

```python
import azure.functions as func
import logging
import json
import os

app = func.FunctionApp()

# Service Bus Queue Trigger
# Connection uses UAMI via ServiceBusConnection__fullyQualifiedNamespace + credential + clientId
@app.service_bus_queue_trigger(
    arg_name="msg",
    queue_name="%SERVICEBUS_QUEUE_NAME%",
    connection="ServiceBusConnection"
)
def servicebus_trigger(msg: func.ServiceBusMessage) -> None:
    """Process messages from Service Bus queue."""
    message_body = msg.get_body().decode('utf-8')
    logging.info(f"Service Bus trigger processed message: {message_body}")
    
    # Log message metadata
    logging.info(f"Message ID: {msg.message_id}")
    logging.info(f"Delivery count: {msg.delivery_count}")
    logging.info(f"Enqueued time: {msg.enqueued_time_utc}")


# HTTP endpoint to send messages to Service Bus (for testing)
@app.route(route="send", methods=["POST"])
@app.service_bus_queue_output(
    arg_name="message",
    queue_name="%SERVICEBUS_QUEUE_NAME%",
    connection="ServiceBusConnection"
)
def send_message(req: func.HttpRequest, message: func.Out[str]) -> func.HttpResponse:
    """Send a message to Service Bus queue via HTTP POST."""
    try:
        body = req.get_json()
        message_content = json.dumps(body)
        message.set(message_content)
        logging.info(f"Sent message to Service Bus: {message_content}")
        return func.HttpResponse(
            json.dumps({"status": "sent", "data": body}),
            mimetype="application/json",
            status_code=200
        )
    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON"}),
            mimetype="application/json",
            status_code=400
        )


# Health check endpoint
@app.route(route="health", methods=["GET"])
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint."""
    return func.HttpResponse(
        json.dumps({
            "status": "healthy",
            "queue": os.environ.get("SERVICEBUS_QUEUE_NAME", "not-set")
        }),
        mimetype="application/json",
        status_code=200
    )
```

## requirements.txt additions

```
azure-functions
azure-servicebus
```

## Files to Remove

- `src/api/http_trigger.py` (if separate from function_app.py)

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "ServiceBusConnection__fullyQualifiedNamespace": "<namespace>.servicebus.windows.net",
    "SERVICEBUS_QUEUE_NAME": "orders"
  }
}
```

> **Note:** For local development with UAMI, use Azure Identity `DefaultAzureCredential`
> which will use your `az login` credentials. See [auth-best-practices.md](../../../../../../auth-best-practices.md) for production guidance.

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
