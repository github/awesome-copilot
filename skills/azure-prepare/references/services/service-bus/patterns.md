# Service Bus - Messaging Patterns

## Point-to-Point (Queue)

```
Producer → Queue → Consumer
```

Use for: Work distribution, command processing

## Pub/Sub (Topic + Subscriptions)

```
Publisher → Topic → Subscription A → Consumer A
                 → Subscription B → Consumer B
```

Use for: Event broadcasting, multiple consumers

## SDK Patterns

### Managed Identity (Recommended)

#### Node.js

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../../auth-best-practices.md) for production patterns.

```javascript
const { ServiceBusClient } = require("@azure/service-bus");
const { DefaultAzureCredential } = require("@azure/identity");

const credential = new DefaultAzureCredential();
const fullyQualifiedNamespace = process.env.SERVICEBUS_NAMESPACE + ".servicebus.windows.net";
const client = new ServiceBusClient(fullyQualifiedNamespace, credential);

// Send
const sender = client.createSender("orders");
await sender.sendMessages({ body: { orderId: "123" } });

// Receive
const receiver = client.createReceiver("orders");
const messages = await receiver.receiveMessages(10);
for (const message of messages) {
  await receiver.completeMessage(message);
}
```

#### Python

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../../auth-best-practices.md) for production patterns.

```python
from azure.servicebus import ServiceBusClient, ServiceBusMessage
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
fully_qualified_namespace = f"{os.environ['SERVICEBUS_NAMESPACE']}.servicebus.windows.net"
client = ServiceBusClient(fully_qualified_namespace, credential)

# Send
sender = client.get_queue_sender("orders")
with sender:
    sender.send_messages(ServiceBusMessage('{"orderId": "123"}'))

# Receive
receiver = client.get_queue_receiver("orders")
with receiver:
    messages = receiver.receive_messages(max_message_count=10, max_wait_time=5)
    for message in messages:
        print(message)
        receiver.complete_message(message)
```

#### .NET

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../../auth-best-practices.md) for production patterns.

```csharp
using Azure.Identity;
using Azure.Messaging.ServiceBus;

var credential = new DefaultAzureCredential();
var fullyQualifiedNamespace = $"{Environment.GetEnvironmentVariable("SERVICEBUS_NAMESPACE")}.servicebus.windows.net";
var client = new ServiceBusClient(fullyQualifiedNamespace, credential);

// Send
var sender = client.CreateSender("orders");
await sender.SendMessageAsync(new ServiceBusMessage("{\"orderId\": \"123\"}"));

// Receive
var receiver = client.CreateReceiver("orders");
var messages = await receiver.ReceiveMessagesAsync(maxMessages: 10);
foreach (var message in messages)
{
    await receiver.CompleteMessageAsync(message);
}
```

> 💡 **Required Permissions:**
> - `Azure Service Bus Data Sender` (69a216fc-b8fb-44d8-bc22-1f3c2cd27a39) - for sending
> - `Azure Service Bus Data Receiver` (4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0) - for receiving

### Connection String (Legacy)

#### Node.js

```javascript
const { ServiceBusClient } = require("@azure/service-bus");

const client = new ServiceBusClient(process.env.SERVICEBUS_CONNECTION_STRING);

// Send
const sender = client.createSender("orders");
await sender.sendMessages({ body: { orderId: "123" } });

// Receive
const receiver = client.createReceiver("orders");
const messages = await receiver.receiveMessages(10);
for (const message of messages) {
  await receiver.completeMessage(message);
}
```

#### Python

```python
from azure.servicebus import ServiceBusClient, ServiceBusMessage

client = ServiceBusClient.from_connection_string(
    os.environ["SERVICEBUS_CONNECTION_STRING"]
)
sender = client.get_queue_sender("orders")

with sender:
    sender.send_messages(ServiceBusMessage('{"orderId": "123"}'))
```

#### .NET

```csharp
var client = new ServiceBusClient(
    Environment.GetEnvironmentVariable("SERVICEBUS_CONNECTION_STRING")
);
var sender = client.CreateSender("orders");

await sender.SendMessageAsync(new ServiceBusMessage("{\"orderId\": \"123\"}"));
```

## Dead Letter Handling

```javascript
const dlqReceiver = client.createReceiver("orders", {
    subQueueType: "deadLetter"
});
```
