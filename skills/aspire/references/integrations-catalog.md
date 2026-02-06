# Integrations Catalog — Complete Reference

Aspire has **144+ integrations** across 13 categories, with **90+ NuGet packages**. Each integration typically provides two packages:

- **Hosting package** (`Aspire.Hosting.*`) — adds the resource to the AppHost
- **Client package** (`Aspire.*`) — configures the client SDK in your service with health checks, telemetry, and retries

---

## Integration pattern

```csharp
// === AppHost (hosting side) ===
var redis = builder.AddRedis("cache");  // Aspire.Hosting.Redis
var api = builder.AddProject<Projects.Api>("api")
    .WithReference(redis);

// === Service (client side) — in API's Program.cs ===
builder.AddRedisClient("cache");        // Aspire.Redis
// Automatically configures: connection string, health checks, OpenTelemetry, retries
```

---

## AI

| Integration | Hosting Package | Client Package |
|---|---|---|
| Azure OpenAI | `Aspire.Hosting.Azure.CognitiveServices` | `Aspire.Azure.AI.OpenAI` |
| OpenAI | — | `Aspire.OpenAI` |
| Ollama | `Aspire.Hosting.Ollama` | `Aspire.Ollama` |
| GitHub Models | — | `Aspire.GitHubModels` |

```csharp
// AppHost: Azure OpenAI
var openai = builder.AddAzureOpenAI("openai")
    .AddDeployment(new("gpt-4o", "gpt-4o", "2024-08-06"));

// AppHost: Ollama (local)
var ollama = builder.AddOllama("ollama")
    .AddModel("llama3.2")
    .WithDataVolume();
```

---

## Caching

| Integration | Hosting Package | Client Package |
|---|---|---|
| Redis | `Aspire.Hosting.Redis` | `Aspire.StackExchange.Redis` |
| Redis (output caching) | `Aspire.Hosting.Redis` | `Aspire.StackExchange.Redis.OutputCaching` |
| Redis (distributed cache) | `Aspire.Hosting.Redis` | `Aspire.StackExchange.Redis.DistributedCaching` |
| Garnet | `Aspire.Hosting.Garnet` | `Aspire.StackExchange.Redis` (wire-compatible) |
| Valkey | `Aspire.Hosting.Valkey` | `Aspire.StackExchange.Redis` (wire-compatible) |

```csharp
var redis = builder.AddRedis("cache")
    .WithRedisCommander()       // adds Redis Commander UI
    .WithRedisInsight()         // adds RedisInsight UI
    .WithDataVolume()           // persist data across restarts
    .WithPersistence();         // enable RDB snapshots
```

---

## Cloud / Azure (25+ integrations)

| Integration | Hosting Package | Client Package |
|---|---|---|
| AI Foundry | `Aspire.Hosting.Azure.AIFoundry` | `Aspire.Azure.AI.Foundry` |
| App Configuration | `Aspire.Hosting.Azure.AppConfiguration` | `Aspire.Azure.AppConfiguration` |
| Blob Storage | `Aspire.Hosting.Azure.Storage` | `Aspire.Azure.Storage.Blobs` |
| Queue Storage | `Aspire.Hosting.Azure.Storage` | `Aspire.Azure.Storage.Queues` |
| Table Storage | `Aspire.Hosting.Azure.Storage` | `Aspire.Azure.Storage.Tables` |
| Cosmos DB | `Aspire.Hosting.Azure.CosmosDB` | `Aspire.Microsoft.Azure.Cosmos` |
| Cosmos DB (EF Core) | `Aspire.Hosting.Azure.CosmosDB` | `Aspire.Microsoft.EntityFrameworkCore.Cosmos` |
| Event Hubs | `Aspire.Hosting.Azure.EventHubs` | `Aspire.Azure.Messaging.EventHubs` |
| Key Vault | `Aspire.Hosting.Azure.KeyVault` | `Aspire.Azure.Security.KeyVault` |
| Search (AI Search) | `Aspire.Hosting.Azure.Search` | `Aspire.Azure.Search.Documents` |
| Service Bus | `Aspire.Hosting.Azure.ServiceBus` | `Aspire.Azure.Messaging.ServiceBus` |
| SignalR | `Aspire.Hosting.Azure.SignalR` | `Aspire.Azure.SignalR` |
| Web PubSub | `Aspire.Hosting.Azure.WebPubSub` | `Aspire.Azure.Messaging.WebPubSub` |
| Azure Functions | `Aspire.Hosting.Azure.Functions` | — |
| Azure SQL | `Aspire.Hosting.Azure.Sql` | `Aspire.Azure.Sql` |
| Azure PostgreSQL | `Aspire.Hosting.Azure.PostgreSQL` | Built on `Aspire.Npgsql` |
| Azure Redis | `Aspire.Hosting.Azure.Redis` | Built on `Aspire.StackExchange.Redis` |

```csharp
// Azure Storage (Blob + Queue + Table)
var storage = builder.AddAzureStorage("storage")
    .RunAsEmulator();  // use Azurite locally
var blobs = storage.AddBlobs("blobs");
var queues = storage.AddQueues("queues");

// Cosmos DB with emulator for local dev
var cosmos = builder.AddAzureCosmosDB("cosmos")
    .RunAsEmulator()
    .AddDatabase("mydb");

// Service Bus
var sb = builder.AddAzureServiceBus("messaging")
    .AddQueue("orders")
    .AddTopic("events", topic => topic.AddSubscription("processor"));
```

---

## Databases

| Integration | Hosting Package | Client Package |
|---|---|---|
| PostgreSQL | `Aspire.Hosting.PostgreSQL` | `Aspire.Npgsql` |
| PostgreSQL (EF Core) | `Aspire.Hosting.PostgreSQL` | `Aspire.Npgsql.EntityFrameworkCore.PostgreSQL` |
| SQL Server | `Aspire.Hosting.SqlServer` | `Aspire.Microsoft.Data.SqlClient` |
| SQL Server (EF Core) | `Aspire.Hosting.SqlServer` | `Aspire.Microsoft.EntityFrameworkCore.SqlServer` |
| MongoDB | `Aspire.Hosting.MongoDB` | `Aspire.MongoDB.Driver` |
| MySQL / MariaDB | `Aspire.Hosting.MySql` | `Aspire.MySqlConnector` |
| MySQL (EF Core) | `Aspire.Hosting.MySql` | `Aspire.Pomelo.EntityFrameworkCore.MySql` |
| Oracle (EF Core) | `Aspire.Hosting.Oracle` | `Aspire.Oracle.EntityFrameworkCore` |
| Elasticsearch | `Aspire.Hosting.Elasticsearch` | `Aspire.Elastic.Clients.Elasticsearch` |
| Milvus (vector DB) | `Aspire.Hosting.Milvus` | `Aspire.Milvus.Client` |
| Qdrant (vector DB) | `Aspire.Hosting.Qdrant` | `Aspire.Qdrant.Client` |
| SurrealDB | `CommunityToolkit.Aspire.Hosting.SurrealDb` | Community |
| RavenDB | `CommunityToolkit.Aspire.Hosting.RavenDB` | Community |
| KurrentDB | `CommunityToolkit.Aspire.Hosting.KurrentDB` | Community |
| SQLite (EF Core) | — | `Aspire.Microsoft.EntityFrameworkCore.Sqlite` |

```csharp
// PostgreSQL with pgAdmin and pgWeb UIs
var postgres = builder.AddPostgres("pg")
    .WithPgAdmin()
    .WithPgWeb()
    .WithDataVolume()
    .AddDatabase("catalog");

// MongoDB with Mongo Express UI
var mongo = builder.AddMongoDB("mongo")
    .WithMongoExpress()
    .WithDataVolume()
    .AddDatabase("analytics");

// SQL Server
var sql = builder.AddSqlServer("sql")
    .WithDataVolume()
    .AddDatabase("orders");
```

---

## DevTools

| Integration | Hosting Package | Purpose |
|---|---|---|
| Data API Builder (DAB) | `Aspire.Hosting.DataAPIBuilder` | REST/GraphQL over databases |
| Dev Tunnels | `Aspire.Hosting.DevTunnels` | Public URL tunnels for local dev |
| Flagd | `CommunityToolkit.Aspire.Hosting.Flagd` | Feature flags (OpenFeature) |
| k6 | `CommunityToolkit.Aspire.Hosting.k6` | Load testing |
| Mailpit | `CommunityToolkit.Aspire.Hosting.Mailpit` | Email testing |
| SQL Database Projects | `Aspire.Hosting.SqlDatabaseProjects` | SQL schema deployment |

---

## Messaging

| Integration | Hosting Package | Client Package |
|---|---|---|
| RabbitMQ | `Aspire.Hosting.RabbitMQ` | `Aspire.RabbitMQ.Client` |
| Kafka | `Aspire.Hosting.Kafka` | `Aspire.Confluent.Kafka` |
| NATS | `Aspire.Hosting.Nats` | `Aspire.NATS.Net` |
| LavinMQ | `CommunityToolkit.Aspire.Hosting.LavinMQ` | `Aspire.RabbitMQ.Client` (AMQP-compat) |

```csharp
var rabbit = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin()     // adds management UI
    .WithDataVolume();

var kafka = builder.AddKafka("kafka")
    .WithKafkaUI();             // adds Kafka UI
```

---

## Observability

| Integration | Package | Purpose |
|---|---|---|
| OpenTelemetry | Built-in | Traces, metrics, logs (auto-configured) |
| Seq | `Aspire.Hosting.Seq` | Structured log aggregation |
| Grafana + Prometheus | Community | Metrics dashboards |

---

## Reverse Proxies

| Integration | Package |
|---|---|
| YARP | `Aspire.Hosting.Yarp` |

---

## Security

| Integration | Package |
|---|---|
| Keycloak | `CommunityToolkit.Aspire.Hosting.Keycloak` |

---

## Frameworks (Polyglot)

See [Polyglot APIs](polyglot-apis.md) for complete method signatures.

| Framework | Package | Type |
|---|---|---|
| JavaScript | `Aspire.Hosting.JavaScript` | Official |
| Python | `Aspire.Hosting.Python` | Official |
| Go | `CommunityToolkit.Aspire.Hosting.Golang` | Community |
| Java | `CommunityToolkit.Aspire.Hosting.Java` | Community |
| Rust | `CommunityToolkit.Aspire.Hosting.Rust` | Community |
| Bun | `CommunityToolkit.Aspire.Hosting.Bun` | Community |
| Deno | `CommunityToolkit.Aspire.Hosting.Deno` | Community |
| Dapr | `Aspire.Hosting.Dapr` | Official |
| Orleans | `Aspire.Hosting.Orleans` | Official |
| MAUI | `Aspire.Hosting.Maui` | Official |

---

## Custom integrations

### Custom hosting integration

```csharp
public static class MyServiceExtensions
{
    public static IResourceBuilder<ContainerResource> AddMyService(
        this IDistributedApplicationBuilder builder, string name)
    {
        return builder.AddContainer(name, "my-registry/my-service")
            .WithHttpEndpoint(targetPort: 8080, name: "http")
            .WithEnvironment("MODE", "production");
    }
}
```

### Custom client integration

```csharp
public static class MyServiceClientExtensions
{
    public static IHostApplicationBuilder AddMyServiceClient(
        this IHostApplicationBuilder builder, string connectionName)
    {
        // Register client with DI
        builder.Services.AddHttpClient<MyServiceClient>(client =>
        {
            var conn = builder.Configuration.GetConnectionString(connectionName);
            client.BaseAddress = new Uri(conn!);
        });

        // Add health check
        builder.Services.AddHealthChecks()
            .AddUrlGroup(new Uri($"{connectionName}/health"), name: connectionName);

        return builder;
    }
}
```

### Secure communication between integrations

```csharp
// Enable TLS between services
var api = builder.AddProject<Projects.Api>("api")
    .WithHttpsEndpoint()
    .WithReference(redis)
    .WithTransport("https");
```
