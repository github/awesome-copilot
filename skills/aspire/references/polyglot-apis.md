# Polyglot APIs — Complete Reference

Aspire supports 10+ languages/runtimes. The AppHost is always .NET, but orchestrated workloads can be any language. Each language has a hosting method that returns a resource you wire into the dependency graph.

---

## Hosting model differences

| Model | Resource type | How it runs | Examples |
|---|---|---|---|
| **Project** | `ProjectResource` | .NET project reference, built by SDK | `AddProject<T>()` |
| **Container** | `ContainerResource` | Docker/OCI image | `AddContainer()`, `AddRedis()`, `AddPostgres()` |
| **Executable** | `ExecutableResource` | Native OS process | `AddExecutable()`, all `Add*App()` polyglot methods |

All polyglot `Add*App()` methods create `ExecutableResource` instances under the hood. They don't require the target language's SDK on the AppHost side — only that the workload's runtime is installed on the dev machine.

---

## Official (Microsoft-maintained)

### .NET / C\#

```csharp
builder.AddProject<Projects.MyApi>("api")
```

**Chaining methods:**
- `.WithHttpEndpoint(port?, targetPort?, name?)` — expose HTTP endpoint
- `.WithHttpsEndpoint(port?, targetPort?, name?)` — expose HTTPS endpoint
- `.WithEndpoint(port?, targetPort?, scheme?, name?)` — generic endpoint
- `.WithReference(resource)` — wire dependency (connection string or service discovery)
- `.WithReplicas(count)` — run multiple instances
- `.WithEnvironment(key, value)` — set environment variable
- `.WithEnvironment(callback)` — set env vars via callback (deferred resolution)
- `.WaitFor(resource)` — don't start until dependency is healthy
- `.WithExternalHttpEndpoints()` — mark endpoints as externally accessible
- `.WithOtlpExporter()` — configure OpenTelemetry exporter
- `.PublishAsDockerFile()` — override publish behavior to Dockerfile

### Python

```csharp
// Standard Python script
builder.AddPythonApp("service", "../python-service", "main.py")

// Uvicorn ASGI server (FastAPI, Starlette, etc.)
builder.AddUvicornApp("fastapi", "../fastapi-app", "app:app")
```

**`AddPythonApp(name, projectDirectory, scriptPath, args?)`**

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)` — expose HTTP
- `.WithVirtualEnvironment(path?)` — use venv (default: `.venv`)
- `.WithPipPackages(packages)` — install pip packages on start
- `.WithReference(resource)` — wire dependency
- `.WithEnvironment(key, value)` — set env var
- `.WaitFor(resource)` — wait for dependency health

**`AddUvicornApp(name, projectDirectory, appModule, args?)`**

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)` — expose HTTP
- `.WithVirtualEnvironment(path?)` — use venv
- `.WithReference(resource)` — wire dependency
- `.WithEnvironment(key, value)` — set env var
- `.WaitFor(resource)` — wait for dependency health

**Python service discovery:** Environment variables are injected automatically. Use `os.environ` to read:
```python
import os
redis_conn = os.environ["ConnectionStrings__cache"]
api_url = os.environ["services__api__http__0"]
```

### JavaScript / TypeScript

```csharp
// Generic JavaScript app (npm start)
builder.AddJavaScriptApp("frontend", "../web-app")

// Vite dev server
builder.AddViteApp("spa", "../vite-app")

// Node.js script
builder.AddNodeApp("worker", "server.js", "../node-worker")
```

**`AddJavaScriptApp(name, workingDirectory)`**

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)` — expose HTTP
- `.WithNpmPackageInstallation()` — run `npm install` before start
- `.WithReference(resource)` — wire dependency
- `.WithEnvironment(key, value)` — set env var
- `.WaitFor(resource)` — wait for dependency health

**`AddViteApp(name, workingDirectory)`**

Chaining methods (same as `AddJavaScriptApp` plus):
- `.WithNpmPackageInstallation()` — run `npm install` before start
- `.WithHttpEndpoint(port?, targetPort?, name?)` — Vite defaults to 5173

**`AddNodeApp(name, scriptPath, workingDirectory)`**

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)` — expose HTTP
- `.WithNpmPackageInstallation()` — run `npm install` before start
- `.WithReference(resource)` — wire dependency
- `.WithEnvironment(key, value)` — set env var

**JS/TS service discovery:** Environment variables are injected. Use `process.env`:
```javascript
const redisUrl = process.env.ConnectionStrings__cache;
const apiUrl = process.env.services__api__http__0;
```

---

## Community (CommunityToolkit/Aspire)

All community integrations follow the same pattern: install the NuGet package in your AppHost, then use the `Add*App()` method.

### Go

**Package:** `CommunityToolkit.Aspire.Hosting.Golang`

```csharp
builder.AddGolangApp("go-api", "../go-service")
    .WithHttpEndpoint(targetPort: 8080)
    .WithReference(redis)
    .WithEnvironment("LOG_LEVEL", "debug")
    .WaitFor(redis);
```

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)`
- `.WithReference(resource)`
- `.WithEnvironment(key, value)`
- `.WaitFor(resource)`

**Go service discovery:** Standard env vars via `os.Getenv()`:
```go
redisAddr := os.Getenv("ConnectionStrings__cache")
```

### Java (Spring Boot)

**Package:** `CommunityToolkit.Aspire.Hosting.Java`

```csharp
builder.AddSpringApp("spring-api", "../spring-service")
    .WithHttpEndpoint(targetPort: 8080)
    .WithReference(postgres)
    .WaitFor(postgres);
```

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)`
- `.WithReference(resource)`
- `.WithEnvironment(key, value)`
- `.WaitFor(resource)`
- `.WithMavenBuild()` — run Maven build before start
- `.WithGradleBuild()` — run Gradle build before start

**Java service discovery:** Env vars via `System.getenv()`:
```java
String dbConn = System.getenv("ConnectionStrings__db");
```

### Rust

**Package:** `CommunityToolkit.Aspire.Hosting.Rust`

```csharp
builder.AddRustApp("rust-worker", "../rust-service")
    .WithHttpEndpoint(targetPort: 3000)
    .WithReference(redis)
    .WaitFor(redis);
```

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)`
- `.WithReference(resource)`
- `.WithEnvironment(key, value)`
- `.WaitFor(resource)`
- `.WithCargoBuild()` — run `cargo build` before start

### Bun

**Package:** `CommunityToolkit.Aspire.Hosting.Bun`

```csharp
builder.AddBunApp("bun-api", "../bun-service")
    .WithHttpEndpoint(targetPort: 3000)
    .WithReference(redis);
```

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)`
- `.WithReference(resource)`
- `.WithEnvironment(key, value)`
- `.WaitFor(resource)`
- `.WithBunPackageInstallation()` — run `bun install` before start

### Deno

**Package:** `CommunityToolkit.Aspire.Hosting.Deno`

```csharp
builder.AddDenoApp("deno-api", "../deno-service")
    .WithHttpEndpoint(targetPort: 8000)
    .WithReference(redis);
```

Chaining methods:
- `.WithHttpEndpoint(port?, targetPort?, name?)`
- `.WithReference(resource)`
- `.WithEnvironment(key, value)`
- `.WaitFor(resource)`

### PowerShell

```csharp
builder.AddPowerShell("ps-script", "../scripts/process.ps1")
    .WithReference(storageAccount);
```

### Dapr

**Package:** `Aspire.Hosting.Dapr` (official)

```csharp
var dapr = builder.AddDapr();
var api = builder.AddProject<Projects.Api>("api")
    .WithDaprSidecar("api-sidecar");
```

---

## Complete mixed-language example

```csharp
var builder = DistributedApplication.CreateBuilder(args);

// Infrastructure
var redis = builder.AddRedis("cache");
var postgres = builder.AddPostgres("pg").AddDatabase("catalog");
var mongo = builder.AddMongoDB("mongo").AddDatabase("analytics");
var rabbit = builder.AddRabbitMQ("messaging");

// .NET API (primary)
var api = builder.AddProject<Projects.CatalogApi>("api")
    .WithReference(postgres)
    .WithReference(redis)
    .WithReference(rabbit)
    .WaitFor(postgres)
    .WaitFor(redis);

// Python ML service (FastAPI)
var ml = builder.AddUvicornApp("ml", "../ml-service", "app:app")
    .WithHttpEndpoint(targetPort: 8000)
    .WithVirtualEnvironment()
    .WithReference(redis)
    .WithReference(mongo)
    .WaitFor(redis);

// TypeScript frontend (Vite + React)
var web = builder.AddViteApp("web", "../frontend")
    .WithNpmPackageInstallation()
    .WithHttpEndpoint(targetPort: 5173)
    .WithReference(api);

// Go event processor
var processor = builder.AddGolangApp("processor", "../go-processor")
    .WithReference(rabbit)
    .WithReference(mongo)
    .WaitFor(rabbit);

// Java analytics service (Spring Boot)
var analytics = builder.AddSpringApp("analytics", "../spring-analytics")
    .WithHttpEndpoint(targetPort: 8080)
    .WithReference(mongo)
    .WithReference(rabbit)
    .WaitFor(mongo);

// Rust high-perf worker
var worker = builder.AddRustApp("worker", "../rust-worker")
    .WithReference(redis)
    .WithReference(rabbit)
    .WaitFor(redis);

builder.Build().Run();
```

This single AppHost starts 6 services across 5 languages plus 4 infrastructure resources, all wired together with automatic service discovery.
