# Microsoft Graph SDK for .NET

Use this reference when the target project is written in C# or another .NET language.

## Authoritative sources

- SDK repository: <https://github.com/microsoftgraph/msgraph-sdk-dotnet>
- Samples: <https://github.com/microsoftgraph/msgraph-training-dotnet>
- SDK changelog: <https://github.com/microsoftgraph/msgraph-sdk-dotnet/blob/main/CHANGELOG.md>

## Packages

```xml
<!-- Microsoft Graph SDK v5 (current) -->
<PackageReference Include="Microsoft.Graph" Version="5.*" />

<!-- Azure Identity for credential providers -->
<PackageReference Include="Azure.Identity" Version="1.*" />
```

Install via CLI:
```bash
dotnet add package Microsoft.Graph
dotnet add package Azure.Identity
```

## Client setup

### Managed Identity (Azure-hosted apps — preferred)

```csharp
using Azure.Identity;
using Microsoft.Graph;

var credential = new DefaultAzureCredential();
var graphClient = new GraphServiceClient(credential);
```

### Client credentials (app-only / daemon)

```csharp
var credential = new ClientSecretCredential(
    tenantId: Environment.GetEnvironmentVariable("AZURE_TENANT_ID"),
    clientId: Environment.GetEnvironmentVariable("AZURE_CLIENT_ID"),
    clientSecret: Environment.GetEnvironmentVariable("AZURE_CLIENT_SECRET")
);
var graphClient = new GraphServiceClient(credential);
```

Prefer `ClientCertificateCredential` over `ClientSecretCredential` in production.

### On-Behalf-Of (OBO) — agent / API acting as the signed-in user

```csharp
// incomingToken is the bearer token received from the caller
var credential = new OnBehalfOfCredential(
    tenantId: Environment.GetEnvironmentVariable("AZURE_TENANT_ID"),
    clientId: Environment.GetEnvironmentVariable("AZURE_CLIENT_ID"),
    clientSecret: Environment.GetEnvironmentVariable("AZURE_CLIENT_SECRET"),
    userAssertion: new UserAssertion(incomingToken)
);
var graphClient = new GraphServiceClient(credential);
```

### Interactive (local dev / CLI)

```csharp
var credential = new InteractiveBrowserCredential();
var graphClient = new GraphServiceClient(credential);
```

## Common call patterns

### Get a resource with field selection

```csharp
var user = await graphClient.Me.GetAsync(config =>
{
    config.QueryParameters.Select = ["displayName", "mail", "jobTitle"];
});
```

### List with filter and select

```csharp
var messages = await graphClient.Me.Messages.GetAsync(config =>
{
    config.QueryParameters.Filter = "isRead eq false";
    config.QueryParameters.Select = ["subject", "from", "receivedDateTime"];
    config.QueryParameters.Top = 25;
    config.QueryParameters.Orderby = ["receivedDateTime desc"];
});
```

### Pagination with PageIterator

```csharp
var messages = await graphClient.Me.Messages.GetAsync();

var allMessages = new List<Message>();
var pageIterator = PageIterator<Message, MessageCollectionResponse>
    .CreatePageIterator(graphClient, messages, (msg) =>
    {
        allMessages.Add(msg);
        return true; // return false to stop early
    });

await pageIterator.IterateAsync();
```

### Send an email

```csharp
await graphClient.Me.SendMail.PostAsync(new SendMailPostRequestBody
{
    Message = new Message
    {
        Subject = "Hello from Graph",
        Body = new ItemBody { ContentType = BodyType.Text, Content = "Test message" },
        ToRecipients = [new Recipient { EmailAddress = new EmailAddress { Address = "user@contoso.com" } }]
    }
});
```

### Post a Teams channel message

```csharp
await graphClient.Teams[teamId].Channels[channelId].Messages.PostAsync(new ChatMessage
{
    Body = new ItemBody { ContentType = BodyType.Html, Content = "<b>Hello from Graph!</b>" }
});
```

## Batch requests

```csharp
using Microsoft.Graph.Models;

var batchRequestContent = new BatchRequestContentCollection(graphClient);

var meRequest = await batchRequestContent.AddBatchRequestStepAsync(
    graphClient.Me.ToGetRequestInformation());
var messagesRequest = await batchRequestContent.AddBatchRequestStepAsync(
    graphClient.Me.Messages.ToGetRequestInformation());

var batchResponse = await graphClient.Batch.PostAsync(batchRequestContent);

var me = await batchResponse.GetResponseByIdAsync<User>(meRequest);
var msgs = await batchResponse.GetResponseByIdAsync<MessageCollectionResponse>(messagesRequest);
```

## Delta queries

```csharp
// First sync — get all + deltaLink
var deltaResponse = await graphClient.Users.Delta.GetAsDeltaGetResponseAsync();
string? deltaLink = null;

var pageIterator = PageIterator<User, Microsoft.Graph.Users.Delta.DeltaGetResponse>
    .CreatePageIterator(graphClient, deltaResponse, (user) => { /* process */ return true; },
        (req) => { deltaLink = /* extract from response */; return req; });

await pageIterator.IterateAsync();
// Store deltaLink for next run

// Subsequent sync — only changes
// Use the stored deltaLink directly as the next request URL
```

## Throttling / retry middleware

The SDK includes retry middleware enabled by default. For explicit control:

```csharp
var handlers = GraphClientFactory.CreateDefaultHandlers();
// RetryHandler is included; configure max retries if needed
var httpClient = GraphClientFactory.Create(handlers);
var graphClient = new GraphServiceClient(httpClient, credential);
```

Always check `Retry-After` if building custom retry logic — do not use fixed exponential backoff.

## Dependency injection (ASP.NET Core / .NET Worker)

```csharp
// Program.cs
builder.Services.AddSingleton<GraphServiceClient>(_ =>
{
    var credential = new DefaultAzureCredential();
    return new GraphServiceClient(credential);
});
```

## .NET-specific guidance

- Target .NET 8+ for new projects.
- Use `async`/`await` throughout — all Graph SDK calls are async.
- Register `GraphServiceClient` as a singleton (it caches tokens internally).
- Use `ILogger` to log Graph exceptions — catch `ODataError` for Graph-specific error details.
- For ASP.NET Core APIs using OBO, inject the incoming token from `IHttpContextAccessor` and construct the credential per-request (not as a singleton).

```csharp
// Catching Graph errors
try
{
    var user = await graphClient.Me.GetAsync();
}
catch (ODataError odataError)
{
    Console.WriteLine($"Graph error: {odataError.Error?.Code} - {odataError.Error?.Message}");
}
```
