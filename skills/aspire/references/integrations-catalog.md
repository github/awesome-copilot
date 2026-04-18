# Integrations Catalog

Aspire has **144+ integrations** across 13 categories. Rather than maintaining a static list, use the MCP tools to get live, up-to-date integration data.

---

## Discovering integrations (MCP tools)

The Aspire MCP server provides two tools for integration discovery — these work on **all CLI versions** (13.1+) and do **not** require a running AppHost.

| Tool                   | What it does                                                                                             | When to use                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `list_integrations`    | Returns all available Aspire hosting integrations with their NuGet package IDs                           | "What integrations are available for databases?" / "Show me all Redis-related integrations" |
| `get_integration_docs` | Retrieves detailed documentation for a specific integration package (setup, configuration, code samples) | "How do I configure PostgreSQL?" / "Show me the docs for `Aspire.Hosting.Redis`"            |

### Workflow

1. **Browse** — Call `list_integrations` to see what's available. Filter results by category or keyword.
2. **Deep dive** — Call `get_integration_docs` with the package ID (e.g., `Aspire.Hosting.Redis`) and version (e.g., `9.0.0`) to get full setup instructions.
3. **Add** — Run `aspire add <integration>` to install the hosting package into your AppHost.

> **Tip:** These tools return the same data as the [official integrations gallery](https://aspire.dev/integrations/gallery/). Prefer them over static docs — integrations are added frequently.

---

## Integration pattern

Every integration follows a two-package pattern:

- **Hosting package** (`Aspire.Hosting.*`) — adds the resource to the AppHost
- **Client package** (`Aspire.*`) — configures the client SDK in your service with health checks, telemetry, and retries
- **Community Toolkit** (`CommunityToolkit.Aspire.*`) — community-maintained integrations from [Aspire Community Toolkit](https://github.com/CommunityToolkit/Aspire)

```csharp
// === AppHost (hosting side) ===
var redis = builder.AddRedis("cache");  // Aspire.Hosting.Redis
var api = builder.AddProject<Projects.Api>("api")
    .WithReference(redis);

// === Service (client side) — in API's Program.cs ===
builder.AddRedisClient("cache");        // Aspire.StackExchange.Redis
// Automatically configures: connection string, health checks, OpenTelemetry, retries
```

---

## Categories at a glance

Use `list_integrations` for the full live list. This summary covers the major categories:

| Category            | Key integrations                                                                      | Example hosting package                  |
| ------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| **AI**              | Azure OpenAI, OpenAI, GitHub Models, Ollama                                           | `Aspire.Hosting.Azure.CognitiveServices` |
| **Caching**         | Redis, Garnet, Valkey, Azure Cache for Redis                                          | `Aspire.Hosting.Redis`                   |
| **Cloud / Azure**   | Storage, Cosmos DB, Service Bus, Key Vault, Event Hubs, Functions, SQL, SignalR (25+) | `Aspire.Hosting.Azure.Storage`           |
| **Cloud / AWS**     | AWS SDK integration                                                                   | `Aspire.Hosting.AWS`                     |
| **Databases**       | PostgreSQL, SQL Server, MongoDB, MySQL, Oracle, Elasticsearch, Milvus, Qdrant, SQLite | `Aspire.Hosting.PostgreSQL`              |
| **DevTools**        | Data API Builder, Dev Tunnels, Mailpit, k6, Flagd, Ngrok, Stripe                      | `Aspire.Hosting.DevTunnels`              |
| **Messaging**       | RabbitMQ, Kafka, NATS, ActiveMQ, LavinMQ                                              | `Aspire.Hosting.RabbitMQ`                |
| **Observability**   | OpenTelemetry (built-in), Seq, OTel Collector                                         | `Aspire.Hosting.Seq`                     |
| **Compute**         | Docker Compose, Kubernetes                                                            | `Aspire.Hosting.Docker`                  |
| **Reverse Proxies** | YARP                                                                                  | `Aspire.Hosting.Yarp`                    |
| **Security**        | Keycloak                                                                              | `Aspire.Hosting.Keycloak`                |
| **Frameworks**      | JavaScript, Python, Go, Java, Rust, Bun, Deno, Orleans, MAUI, Dapr, PowerShell        | `Aspire.Hosting.Python`                  |

For polyglot framework method signatures, see [Polyglot APIs](polyglot-apis.md).

---
