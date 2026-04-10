---
description: 'Guidelines and best practices for building Azure Functions in C# using the isolated worker model'
applyTo: '**/*.cs, **/host.json, **/local.settings.json, **/*.csproj'
---

# Azure Functions C# Development

## General Instructions

- Always use the **isolated worker model** (not the legacy in-process model) for all new Azure Functions projects targeting .NET 6 or later.
- Use `FunctionsApplication.CreateBuilder(args)` or `HostBuilder` in `Program.cs` for host setup and dependency injection.
- Decorate function methods with `[Function("FunctionName")]` and use strongly typed trigger and binding attributes.
- Keep function methods focused — each function should do one thing and delegate business logic to injected services.
- Never put business logic directly inside the function method body; extract it into testable service classes registered via DI.
- Use `ILogger<T>` injected through the constructor, not `ILogger` passed as a function parameter, for consistent structured logging.
- Always use `async/await` for all I/O-bound operations; never block with `.Result` or `.Wait()`.
- Prefer `CancellationToken` parameters where supported to enable graceful shutdown.

## Project Structure and Setup

- Use the `Microsoft.Azure.Functions.Worker` and `Microsoft.Azure.Functions.Worker.Extensions.*` NuGet packages.
- Register services in `Program.cs` using `builder.Services.Add*` extension methods for clean dependency injection.
- Group related functions into separate classes by domain concern, not by trigger type.
- Store configuration in `local.settings.json` for local development; use Azure App Configuration or Application Settings for deployed environments.
- Never hardcode connection strings or secrets in code; always read from `IConfiguration` or environment variables.
- Use Key Vault references (`@Microsoft.KeyVault(SecretUri=...)`) in App Settings for secrets in deployed environments.
- Use `Managed Identity` (`DefaultAzureCredential`) for authenticating to Azure services — avoid connection strings with keys wherever possible.
- Keep `host.json` tuned per trigger type: configure `maxConcurrentCalls`, `batchSize`, and retry policies at the host level.

## Triggers

- **HttpTrigger**: Use `AuthorizationLevel.Function` or higher for production endpoints; reserve `AuthorizationLevel.Anonymous` only for public-facing APIs with explicit justification. Use ASP.NET Core integration (`UseMiddleware`, `IActionResult` returns) when using the ASP.NET Core integration model.
- **TimerTrigger**: Use NCRONTAB expressions (`"0 */5 * * * *"`) for schedules; avoid `RunOnStartup = true` in production as it executes immediately on every cold start.
- **QueueTrigger / ServiceBusTrigger**: Configure `MaxConcurrentCalls`, dead-letter policies, and `MaxDeliveryCount` in `host.json` and Azure portal; handle `ServiceBusReceivedMessage` directly for advanced message control (complete, abandon, dead-letter).
- **BlobTrigger**: Prefer Event Grid-based blob triggers (`Microsoft.Azure.Functions.Worker.Extensions.EventGrid`) over polling-based blob triggers for lower latency and reduced storage transaction costs.
- **EventHubTrigger**: Set `cardinality` to `many` for batch processing; use `EventData[]` or `string[]` parameter types for batch mode; always checkpoint using the `EventHubTriggerAttribute`'s built-in checkpointing.
- **CosmosDBTrigger**: Use the change feed trigger for event-driven processing of Cosmos DB changes; set `LeaseContainerName` and manage lease containers separately from data containers.

## Input and Output Bindings

- Use input bindings to read data declaratively rather than using SDKs directly inside function bodies where the binding covers the use case.
- For multiple output bindings, define a custom return type with properties annotated with the appropriate output binding attributes (e.g., `[QueueOutput]`, `[BlobOutput]`, `[HttpResult]`).
- Use `[BlobInput]` and `[BlobOutput]` for blob read/write; prefer `Stream` over `byte[]` for large blobs to avoid memory pressure.
- Use `[CosmosDBInput]` for point reads and simple queries; for complex queries, inject `CosmosClient` via DI with `Managed Identity`.
- Use `[ServiceBusOutput]` for single-message sends; inject `ServiceBusSender` via DI for batching or advanced send scenarios.
- Avoid mixing SDK clients obtained via DI with binding-based I/O for the same resource — choose one pattern per resource to maintain consistency.

## Dependency Injection and Configuration

- Register all external clients (e.g., `BlobServiceClient`, `ServiceBusClient`, `CosmosClient`) as singletons using `services.AddAzureClients()` from the `Azure.Extensions.AspNetCore.Configuration.Secrets` package with `DefaultAzureCredential`.
- Use `IOptions<T>` or `IOptionsMonitor<T>` for strongly typed configuration sections.
- Avoid using `static` state in functions; all shared state should flow through DI-registered services.
- Register `HttpClient` instances via `IHttpClientFactory` to manage connection pooling and avoid socket exhaustion.

## Error Handling and Retry

- Configure built-in retry policies in `host.json` using `"retry"` with `fixedDelay` or `exponentialBackoff` strategy for trigger-level retries.
- For transient fault handling at the code level, use `Microsoft.Extensions.Http.Resilience` or Polly v8 (`ResiliencePipeline`) with retry, circuit breaker, and timeout strategies.
- Always catch specific exceptions and log them with structured context (e.g., correlation ID, input identifier) before re-throwing or dead-lettering.
- Use dead-letter queues for messages that fail after all retries; never silently swallow exceptions in function handlers.
- For HTTP triggers, return appropriate `IActionResult` types (`BadRequestObjectResult`, `NotFoundObjectResult`) rather than throwing exceptions for expected error conditions.

## Observability and Logging

- Use `ILogger<T>` with structured log properties: `_logger.LogInformation("Processing message {MessageId}", messageId)`.
- Configure Application Insights via `builder.Services.AddApplicationInsightsTelemetryWorkerService()` and `builder.Logging.AddApplicationInsights()` in `Program.cs`.
- Use `TelemetryClient` for custom events, metrics, and dependency tracking beyond what is automatically collected.
- Set appropriate log levels in `host.json` under `"logging"` to avoid excessive telemetry costs in production.
- Use `Activity` and `ActivitySource` from `System.Diagnostics` for distributed tracing context propagation between functions and downstream services.
- Avoid logging sensitive data (PII, secrets, connection strings) in any log statement.

## Performance and Scalability

- Keep function startup time minimal: defer expensive initialization to lazy-loaded singletons, not the function constructor.
- Use the Consumption plan for event-driven, unpredictable workloads; use Premium or Dedicated plans for low-latency, high-throughput, or VNet-integrated scenarios.
- For CPU-intensive work, offload to a background `Task` or use Durable Functions rather than blocking the function host thread.
- Batch operations where possible: process `IEnumerable<EventData>` or `ServiceBusReceivedMessage[]` arrays in a single function invocation rather than one message at a time.
- Set `FUNCTIONS_WORKER_PROCESS_COUNT` and `maxConcurrentCalls` appropriately for the hosting plan and expected throughput.
- Enable `WEBSITE_RUN_FROM_PACKAGE=1` in App Settings for faster cold starts by running directly from a deployment package.

## Security

- Always validate and sanitize HTTP trigger inputs before processing; use FluentValidation or Data Annotations.
- Use `AuthorizationLevel.Function` with function keys stored in Key Vault for internal API-to-API calls.
- Integrate Azure API Management (APIM) in front of HTTP-triggered functions for public-facing APIs to handle auth, rate limiting, and routing.
- Restrict inbound access using App Service networking features (IP restrictions, Private Endpoints) for sensitive functions.
- Never log request bodies containing PII or secrets.

## Testing

- Unit-test service classes independently of the function host using standard xUnit/NUnit with mocked dependencies.
- Integration-test functions using `Azurite` (local Azure Storage emulator) and `TestServer` or the Azure Functions Core Tools.
- Use the `Microsoft.Azure.Functions.Worker.Testing` helpers where available to construct mock `FunctionContext` instances.
- Avoid testing the trigger plumbing itself; focus tests on the business logic extracted into services.

## Existing Code Review Guidance

- If a project uses the legacy **in-process model** (`FunctionsStartup`, `IWebJobsStartup`), suggest migrating to the isolated worker model and provide the migration path via `dotnet-isolated-process-guide`.
- If hardcoded connection strings or storage account keys are found in code or config files, flag them and suggest replacing with `DefaultAzureCredential` and Key Vault references.
- If `RunOnStartup = true` is set on a `TimerTrigger` in a production app, flag it as a risk and suggest using deployment slots or feature flags instead.
- If `async void` is used in any function, flag it immediately — use `async Task` instead.
- If retry logic is implemented manually with `Thread.Sleep` or `Task.Delay` inside a function, suggest replacing with host-level retry policies or Polly resilience pipelines.

