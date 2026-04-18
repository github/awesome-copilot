# Architecture — Deep Dive

This reference covers Aspire's internal architecture: the DCP engine, resource model, service discovery, networking, telemetry, and the eventing system.

---

## Developer Control Plane (DCP)

The DCP is the **runtime engine** that Aspire uses in `aspire run` mode. Key facts:

- Written in **Go** (not .NET)
- Exposes a **Kubernetes-compatible API server** (local only, not a real K8s cluster)
- Manages resource lifecycle: create, start, health-check, stop, restart
- Runs containers via the local container runtime (Docker, Podman, Rancher)
- Runs executables as native OS processes
- Handles networking via a proxy layer with automatic port assignment
- Provides the foundation for the Aspire Dashboard's real-time data

### DCP vs Kubernetes

| Aspect | DCP (local dev) | Kubernetes (production) |
|---|---|---|
| API | Kubernetes-compatible | Full Kubernetes API |
| Scope | Single machine | Cluster |
| Networking | Local proxy, auto ports | Service mesh, ingress |
| Storage | Local volumes | PVCs, cloud storage |
| Purpose | Developer inner loop | Production deployment |

The Kubernetes-compatible API means Aspire understands the same resource abstractions, but DCP is **not** a Kubernetes distribution — it's a lightweight local runtime.

---

## Resource Model

Everything in Aspire is a **resource**. The resource model is hierarchical:

### Type hierarchy

```
IResource (interface)
└── Resource (abstract base)
    ├── ProjectResource          — .NET project reference
    ├── ContainerResource        — Docker/OCI container
    ├── ExecutableResource       — Native process (polyglot apps)
    ├── ParameterResource        — Config value or secret
    └── Infrastructure resources
        ├── RedisResource
        ├── PostgresServerResource
        ├── MongoDBServerResource
        ├── SqlServerResource
        ├── RabbitMQServerResource
        ├── KafkaServerResource
        └── ... (one per integration)
```

### Resource properties

Every resource has:
- **Name** — unique identifier within the AppHost
- **State** — lifecycle state (Starting, Running, FailedToStart, Stopping, Stopped, etc.)
- **Annotations** — metadata attached to the resource
- **Endpoints** — network endpoints exposed by the resource
- **Environment variables** — injected into the process/container

### Annotations

Annotations are metadata bags attached to resources. Common built-in annotations:

| Annotation | Purpose |
|---|---|
| `EndpointAnnotation` | Defines an HTTP/HTTPS/TCP endpoint |
| `EnvironmentCallbackAnnotation` | Deferred env var resolution |
| `HealthCheckAnnotation` | Health check configuration |
| `ContainerImageAnnotation` | Docker image details |
| `VolumeAnnotation` | Volume mount configuration |
| `CommandLineArgsCallbackAnnotation` | Dynamic CLI arguments |
| `ManifestPublishingCallbackAnnotation` | Custom publish behavior |

### Resource lifecycle states

```
NotStarted → Starting → Running → Stopping → Stopped
                 ↓                     ↓
          FailedToStart           RuntimeUnhealthy
                                       ↓
                                  Restarting → Running
```

### DAG (Directed Acyclic Graph)

Resources form a dependency graph. Aspire starts resources in topological order:

```
PostgreSQL ──→ API ──→ Frontend
Redis ────────↗
RabbitMQ ──→ Worker
```

1. PostgreSQL, Redis, and RabbitMQ start first (no dependencies)
2. API starts after PostgreSQL and Redis are healthy
3. Frontend starts after API is healthy
4. Worker starts after RabbitMQ is healthy

`.WaitFor()` adds a health-check gate to the dependency edge. Without it, the dependency starts but the downstream doesn't wait for health.

---

## Service Discovery

Aspire injects environment variables into each resource so services can find each other. No service registry or DNS is needed — it's pure environment variable injection.

### Connection strings

For databases, caches, and message brokers:

```
ConnectionStrings__<resource-name>=<connection-string>
```

Examples:
```
ConnectionStrings__cache=localhost:6379
ConnectionStrings__catalog=Host=localhost;Port=5432;Database=catalog;Username=postgres;Password=...
ConnectionStrings__messaging=amqp://guest:guest@localhost:5672
```

### Service endpoints

For HTTP/HTTPS services:

```
services__<resource-name>__<scheme>__0=<url>
```

Examples:
```
services__api__http__0=http://localhost:5234
services__api__https__0=https://localhost:7234
services__ml__http__0=http://localhost:8000
```

### How .WithReference() works

```csharp
var redis = builder.AddRedis("cache");
var api = builder.AddProject<Projects.Api>("api")
    .WithReference(redis);
```

This does:
1. Adds `ConnectionStrings__cache=localhost:<auto-port>` to the API's environment
2. Creates a dependency edge in the DAG (API depends on Redis)
3. In the API service, `builder.Configuration.GetConnectionString("cache")` returns the connection string

### Cross-language service discovery

All languages use the same env var pattern:

| Language | How to read |
|---|---|
| C# | `builder.Configuration.GetConnectionString("cache")` |
| Python | `os.environ["ConnectionStrings__cache"]` |
| JavaScript | `process.env.ConnectionStrings__cache` |
| Go | `os.Getenv("ConnectionStrings__cache")` |
| Java | `System.getenv("ConnectionStrings__cache")` |
| Rust | `std::env::var("ConnectionStrings__cache")` |

---

## Networking

### Proxy architecture

In `aspire run` mode, DCP runs a reverse proxy for each exposed endpoint:

```
Browser → Proxy (auto-assigned port) → Actual Service (target port)
```

- **port** (the external port) — auto-assigned by DCP unless overridden
- **targetPort** — the port your service actually listens on
- All inter-service traffic goes through the proxy for observability

```csharp
// Let DCP auto-assign the external port, service listens on 8000
builder.AddPythonApp("ml", "../ml", "main.py")
    .WithHttpEndpoint(targetPort: 8000);

// Fix the external port to 3000
builder.AddViteApp("web", "../frontend")
    .WithHttpEndpoint(port: 3000, targetPort: 5173);
```

### Endpoint types

```csharp
// HTTP endpoint
.WithHttpEndpoint(port?, targetPort?, name?)

// HTTPS endpoint
.WithHttpsEndpoint(port?, targetPort?, name?)

// Generic endpoint (TCP, custom schemes)
.WithEndpoint(port?, targetPort?, scheme?, name?, isExternal?)

// Mark endpoints as externally accessible (for deployment)
.WithExternalHttpEndpoints()
```

---

## Telemetry (OpenTelemetry)

Aspire configures OpenTelemetry automatically for .NET services. For non-.NET services, you configure OpenTelemetry manually, pointing at the DCP collector.

### What's auto-configured (.NET services)

- **Distributed tracing** — HTTP client/server spans, database spans, messaging spans
- **Metrics** — Runtime metrics, HTTP metrics, custom metrics
- **Structured logging** — Logs correlated with trace context
- **Exporter** — OTLP exporter pointing at the Aspire Dashboard

### Configuring non-.NET services

The DCP exposes an OTLP endpoint. Set these env vars in your non-.NET service:

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=<your-service-name>
```

Aspire auto-injects `OTEL_EXPORTER_OTLP_ENDPOINT` via `.WithReference()` for the dashboard collector.

### ServiceDefaults pattern

The `ServiceDefaults` project is a shared configuration library that standardizes:
- OpenTelemetry setup (tracing, metrics, logging)
- Health check endpoints (`/health`, `/alive`)
- Resilience policies (retries, circuit breakers via Polly)

```csharp
// In each .NET service's Program.cs
builder.AddServiceDefaults();   // adds OTel, health checks, resilience
// ... other service config ...
app.MapDefaultEndpoints();      // maps /health and /alive
```

---

## Health Checks

### Built-in health checks

Every integration adds health checks automatically on the client side:
- Redis: `PING` command
- PostgreSQL: `SELECT 1`
- MongoDB: `ping` command
- RabbitMQ: Connection check
- etc.

### WaitFor vs WithReference

```csharp
// WithReference: wires connection string + creates dependency edge
// (downstream may start before dependency is healthy)
.WithReference(db)

// WaitFor: gates on health check — downstream won't start until healthy
.WaitFor(db)

// Typical pattern: both
.WithReference(db).WaitFor(db)
```

### Custom health checks

```csharp
var api = builder.AddProject<Projects.Api>("api")
    .WithHealthCheck("ready", "/health/ready")
    .WithHealthCheck("live", "/health/live");
```

---

## Eventing System

The AppHost supports lifecycle events for reacting to resource state changes:

```csharp
builder.Eventing.Subscribe<ResourceReadyEvent>("api", (evt, ct) =>
{
    // Fires when "api" resource becomes healthy
    Console.WriteLine($"API is ready at {evt.Resource.Name}");
    return Task.CompletedTask;
});

builder.Eventing.Subscribe<BeforeResourceStartedEvent>("db", async (evt, ct) =>
{
    // Run database migrations before the DB resource is marked as started
    await RunMigrations();
});
```

### Available events

| Event | When |
|---|---|
| `BeforeResourceStartedEvent` | Before a resource starts |
| `ResourceReadyEvent` | Resource is healthy and ready |
| `ResourceStateChangedEvent` | Any state transition |
| `BeforeStartEvent` | Before the entire application starts |
| `AfterEndpointsAllocatedEvent` | After all ports are assigned |

---

## Configuration

### Parameters

```csharp
// Plain parameter
var apiKey = builder.AddParameter("api-key");

// Secret parameter (prompted at run, not logged)
var dbPassword = builder.AddParameter("db-password", secret: true);

// Use in resources
var api = builder.AddProject<Projects.Api>("api")
    .WithEnvironment("API_KEY", apiKey);

var db = builder.AddPostgres("db", password: dbPassword);
```

### Configuration sources

Parameters are resolved from (in priority order):
1. Command-line arguments
2. Environment variables
3. User secrets (`dotnet user-secrets`)
4. `appsettings.json` / `appsettings.{Environment}.json`
5. Interactive prompt (for secrets during `aspire run`)
