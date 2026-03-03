# Event Grid - Bicep Patterns

## Custom Topic

```bicep
resource eventGridTopic 'Microsoft.EventGrid/topics@2023-12-15-preview' = {
  name: '${resourcePrefix}-egt-${uniqueHash}'
  location: location
  properties: {
    inputSchema: 'EventGridSchema'
    publicNetworkAccess: 'Enabled'
  }
}
```

## System Topic (Azure Resource Events)

```bicep
resource storageSystemTopic 'Microsoft.EventGrid/systemTopics@2023-12-15-preview' = {
  name: '${resourcePrefix}-storage-topic'
  location: location
  properties: {
    source: storageAccount.id
    topicType: 'Microsoft.Storage.StorageAccounts'
  }
}
```

## Event Domain

```bicep
resource eventDomain 'Microsoft.EventGrid/domains@2023-12-15-preview' = {
  name: '${resourcePrefix}-domain'
  location: location
  properties: {
    inputSchema: 'EventGridSchema'
  }
}
```

## Publishing Events

### Node.js

```javascript
const { EventGridPublisherClient, AzureKeyCredential } = require("@azure/eventgrid");

const client = new EventGridPublisherClient(
  process.env.EVENTGRID_TOPIC_ENDPOINT,
  "EventGrid",
  new AzureKeyCredential(process.env.EVENTGRID_TOPIC_KEY)
);

await client.send([{
  eventType: "Order.Created",
  subject: "/orders/12345",
  dataVersion: "1.0",
  data: { orderId: "12345" }
}]);
```

### Python

```python
from azure.eventgrid import EventGridPublisherClient, EventGridEvent
from azure.core.credentials import AzureKeyCredential

client = EventGridPublisherClient(
    os.environ["EVENTGRID_TOPIC_ENDPOINT"],
    AzureKeyCredential(os.environ["EVENTGRID_TOPIC_KEY"])
)

client.send([EventGridEvent(
    event_type="Order.Created",
    subject="/orders/12345",
    data={"orderId": "12345"},
    data_version="1.0"
)])
```
