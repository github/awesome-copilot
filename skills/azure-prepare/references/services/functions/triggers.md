# Function Triggers

## HTTP Trigger

```javascript
module.exports = async function (context, req) {
    context.res = { body: "Hello from Azure Functions" };
};
```

## Timer Trigger

```json
// function.json
{
  "bindings": [{
    "name": "timer",
    "type": "timerTrigger",
    "schedule": "0 */5 * * * *"
  }]
}
```

Cron format: `{second} {minute} {hour} {day} {month} {day-of-week}`

## Service Bus Trigger (Managed Identity)

### Python (v2 model)

```python
import azure.functions as func
import logging

app = func.FunctionApp()

@app.service_bus_queue_trigger(
    arg_name="msg",
    queue_name="orders",
    connection="SERVICEBUS"  # References SERVICEBUS__fullyQualifiedNamespace
)
def process_queue_message(msg: func.ServiceBusMessage):
    logging.info('Processing Service Bus message: %s', msg.get_body().decode('utf-8'))
    # Process the message
```

**Required app settings:**
- `SERVICEBUS__fullyQualifiedNamespace`: `<namespace>.servicebus.windows.net`
- Function App must have `Azure Service Bus Data Receiver` role on namespace

### Python (v1 model)

```json
// function.json
{
  "bindings": [{
    "name": "msg",
    "type": "serviceBusTrigger",
    "queueName": "orders",
    "connection": "SERVICEBUS"
  }]
}
```

```python
# __init__.py
import logging
import azure.functions as func

def main(msg: func.ServiceBusMessage):
    logging.info('Processing message: %s', msg.get_body().decode('utf-8'))
```

### Node.js

```json
// function.json
{
  "bindings": [{
    "name": "message",
    "type": "serviceBusTrigger",
    "queueName": "orders",
    "connection": "SERVICEBUS"
  }]
}
```

```javascript
// index.js
module.exports = async function (context, message) {
    context.log('Processing message:', message);
};
```

### .NET (Isolated)

```csharp
[Function("ServiceBusProcessor")]
public void Run(
    [ServiceBusTrigger("orders", Connection = "SERVICEBUS")] 
    ServiceBusReceivedMessage message,
    FunctionContext context)
{
    var logger = context.GetLogger("ServiceBusProcessor");
    logger.LogInformation($"Processing message: {message.Body}");
}
```

> 💡 **Managed Identity Configuration:**
> - Connection name (e.g., `SERVICEBUS`) maps to `<name>__fullyQualifiedNamespace` app setting
> - Use double underscore (`__`) to signal managed identity authentication
> - No connection strings needed when proper RBAC roles are assigned

## Service Bus Topic Trigger

```python
@app.service_bus_topic_trigger(
    arg_name="msg",
    topic_name="events",
    subscription_name="processor",
    connection="SERVICEBUS"
)
def process_topic_message(msg: func.ServiceBusMessage):
    logging.info('Processing topic message: %s', msg.get_body().decode('utf-8'))
```

## Queue Trigger (Legacy - Connection String)

```json
// function.json
{
  "bindings": [{
    "name": "queueItem",
    "type": "serviceBusTrigger",
    "queueName": "orders",
    "connection": "ServiceBusConnection"
  }]
}
```

**App setting:** `ServiceBusConnection`: `Endpoint=sb://...`

> ⚠️ **Use managed identity instead** for new deployments (see above)

## Blob Trigger

```json
// function.json
{
  "bindings": [{
    "name": "blob",
    "type": "blobTrigger",
    "path": "uploads/{name}",
    "connection": "StorageConnection"
  }]
}
```
