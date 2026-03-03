# C# — Azure Functions Isolated Worker Model Triggers & Bindings

> **Model**: .NET isolated worker model (recommended). Uses attributes on methods/parameters.
> Import: `using Microsoft.Azure.Functions.Worker;`

## HTTP Trigger

```csharp
[Function("HttpFunction")]
public static HttpResponseData Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestData req,
    FunctionContext context)
{
    var response = req.CreateResponse(HttpStatusCode.OK);
    response.WriteString("Hello!");
    return response;
}
```

## Blob Storage

```csharp
// Trigger (EventGrid source)
[Function("BlobTrigger")]
public static void Run(
    [BlobTrigger("samples-workitems/{name}", Source = BlobTriggerSource.EventGrid,
     Connection = "AzureWebJobsStorage")] string blobContent,
    string name, FunctionContext context)
{
    context.GetLogger("BlobTrigger").LogInformation($"Blob: {name}");
}

// Input
[BlobInput("input/{name}", Connection = "AzureWebJobsStorage")] string inputBlob

// Output
[BlobOutput("output/{name}", Connection = "AzureWebJobsStorage")] out string outputBlob
```

## Queue Storage

```csharp
// Trigger
[Function("QueueTrigger")]
public static void Run(
    [QueueTrigger("myqueue-items", Connection = "AzureWebJobsStorage")] string message,
    FunctionContext context)
{
    context.GetLogger("Queue").LogInformation($"Message: {message}");
}

// Output (via return type)
[Function("QueueOutput")]
[QueueOutput("outqueue", Connection = "AzureWebJobsStorage")]
public static string Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
{
    return "queue message";
}
```

## Timer

```csharp
[Function("TimerFunction")]
public static void Run(
    [TimerTrigger("0 */5 * * * *")] TimerInfo timer,
    FunctionContext context)
{
    context.GetLogger("Timer").LogInformation($"Last: {timer.ScheduleStatus?.Last}");
}
```

## Event Grid

```csharp
// Trigger
[Function("EventGridTrigger")]
public static void Run(
    [EventGridTrigger] EventGridEvent eventGridEvent,
    FunctionContext context)
{
    context.GetLogger("EG").LogInformation($"Event: {eventGridEvent.Subject}");
}

// Output
[EventGridOutput(TopicEndpointUri = "MyTopicUri", TopicKeySetting = "MyTopicKey")]
```

## Cosmos DB

```csharp
// Trigger (Change Feed)
[Function("CosmosDBTrigger")]
public static void Run(
    [CosmosDBTrigger("mydb", "mycontainer",
     Connection = "CosmosDBConnection",
     CreateLeaseContainerIfNotExists = true)] IReadOnlyList<MyDocument> documents,
    FunctionContext context)
{
    foreach (var doc in documents)
        context.GetLogger("Cosmos").LogInformation($"Doc: {doc.Id}");
}

// Input
[CosmosDBInput("mydb", "mycontainer", Connection = "CosmosDBConnection",
 Id = "{id}", PartitionKey = "{partitionKey}")] MyDocument doc

// Output
[CosmosDBOutput("mydb", "mycontainer", Connection = "CosmosDBConnection")]
```

## Service Bus

```csharp
// Queue Trigger
[Function("SBQueueTrigger")]
public static void Run(
    [ServiceBusTrigger("myqueue", Connection = "ServiceBusConnection")] string message,
    FunctionContext context)
{
    context.GetLogger("SB").LogInformation($"Message: {message}");
}

// Topic Trigger
[Function("SBTopicTrigger")]
public static void Run(
    [ServiceBusTrigger("mytopic", "mysubscription",
     Connection = "ServiceBusConnection")] string message,
    FunctionContext context)
{
    context.GetLogger("SB").LogInformation($"Topic: {message}");
}

// Output
[ServiceBusOutput("outqueue", Connection = "ServiceBusConnection")]
```

## Event Hubs

```csharp
// Trigger
[Function("EventHubTrigger")]
public static void Run(
    [EventHubTrigger("myeventhub", Connection = "EventHubConnection")] EventData[] events,
    FunctionContext context)
{
    foreach (var e in events)
        context.GetLogger("EH").LogInformation($"Event: {e.EventBody}");
}

// Output
[EventHubOutput("outeventhub", Connection = "EventHubConnection")]
```

## Table Storage

```csharp
// Input
[TableInput("mytable", "{partitionKey}", "{rowKey}",
 Connection = "AzureWebJobsStorage")] TableEntity entity

// Output
[TableOutput("mytable", Connection = "AzureWebJobsStorage")]
```

## SQL

```csharp
// Trigger
[Function("SqlTrigger")]
public static void Run(
    [SqlTrigger("dbo.MyTable", "SqlConnection")] IReadOnlyList<SqlChange<MyItem>> changes,
    FunctionContext context)
{
    foreach (var change in changes)
        context.GetLogger("SQL").LogInformation($"Change: {change.Item.Id}");
}

// Input
[SqlInput("SELECT * FROM dbo.MyTable WHERE Id = @Id",
 "SqlConnection", parameters: "@Id={id}")] IEnumerable<MyItem> items

// Output
[SqlOutput("dbo.MyTable", "SqlConnection")]
```

## SignalR

```csharp
// Output
[SignalROutput(HubName = "myhub", ConnectionStringSetting = "AzureSignalRConnectionString")]
```

## SendGrid

```csharp
[SendGridOutput(ApiKey = "SendGridApiKey", From = "noreply@example.com")]
```

## Multiple Outputs

```csharp
// Use a custom return type for multiple outputs
public class MultiOutput
{
    [QueueOutput("outqueue", Connection = "AzureWebJobsStorage")]
    public string QueueMessage { get; set; }

    public HttpResponseData HttpResponse { get; set; }
}

[Function("MultiOutput")]
public static MultiOutput Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
{
    return new MultiOutput
    {
        QueueMessage = "new item",
        HttpResponse = req.CreateResponse(HttpStatusCode.OK)
    };
}
```

> Full reference: [Azure Functions C# isolated worker guide](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
