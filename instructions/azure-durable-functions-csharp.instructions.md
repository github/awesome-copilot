---
description: 'Guidelines and best practices for building Azure Durable Functions in C# using the isolated worker model'
applyTo: '**/*.cs, **/host.json, **/local.settings.json, **/*.csproj'
---

# Azure Durable Functions C# Development

## General Instructions

- Always use the **isolated worker model** with the `Microsoft.Azure.Functions.Worker.Extensions.DurableTask` NuGet package for new Durable Functions projects.
- Use `Microsoft.DurableTask` namespaces for orchestrator and activity context types (`TaskOrchestrationContext`, `TaskActivityContext`).
- Separate orchestrators, activities, entities, and client starter functions into distinct classes or files for clarity.
- Never mix orchestration logic with activity logic — orchestrators coordinate; activities do work.
- Always use `context.CreateReplaySafeLogger(nameof(OrchestratorName))` inside orchestrator functions for logging; never use injected `ILogger<T>` directly in orchestrators as it logs on every replay.
- Use `async Task` or `async Task<T>` for all orchestrator and activity methods — never `async void`.
- Treat orchestrator code as **deterministic and replay-safe**: no `DateTime.Now`, `Guid.NewGuid()`, `Random`, direct HTTP calls, or non-deterministic I/O inside orchestrators.
- Use `context.CurrentUtcDateTime` instead of `DateTime.UtcNow` inside orchestrators.

## Project Structure

- Register Durable Functions support in `Program.cs` via `builder.Services.AddDurableTaskClient()` and `builder.ConfigureFunctionsWorkerDefaults(x => x.UseDurableTask())`.
- Organize orchestrators, activities, and entities into feature-based folders (e.g., `/Orchestrations/OrderProcessing/`), not by function type.
- Name orchestrators with the suffix `Orchestrator` (e.g., `ProcessOrderOrchestrator`), activities with the suffix `Activity` (e.g., `ChargePaymentActivity`), and entities with the suffix `Entity` (e.g., `CartEntity`).
- Use constants or static readonly strings for activity/orchestrator/entity names passed to `CallActivityAsync`, `CallSubOrchestratorAsync`, and `GetEntityStateAsync` to prevent typos.

## Configuration Files

### local.settings.json
- Always include `AzureWebJobsStorage` connection string for local development — Durable Functions requires storage to maintain orchestration state.
- Use `"UseDevelopmentStorage=true"` or Azurite connection string for local testing — never use a production storage account from local dev.
- Set `FUNCTIONS_WORKER_RUNTIME` to `"dotnet-isolated"` in local.settings.json.
- For Netherite or MSSQL storage providers, include provider-specific connection strings (e.g., `EventHubsConnection` for Netherite).
- Never commit `local.settings.json` to source control — add it to `.gitignore`; use `local.settings.json.example` with placeholder values instead.
- Store sensitive values (storage keys, Event Hub connection strings) using Azure Key Vault locally via `@Microsoft.KeyVault(...)` references if needed.

### host.json
- Configure Durable Functions-specific settings under `"extensions": { "durableTask": { ... } }` — do not rely on defaults for production.
- Set `"hubName"` to a meaningful, environment-specific value (e.g., `"MyAppProd"`, `"MyAppDev"`) to isolate Task Hubs across environments sharing the same storage account.
- Tune `"maxConcurrentActivityFunctions"` and `"maxConcurrentOrchestratorFunctions"` based on expected throughput and hosting plan — defaults are conservative.
- Enable extended sessions (`"extendedSessionsEnabled": true`) for long-running orchestrations on Premium/Dedicated plans to reduce replay overhead.
- Configure the storage provider: use `"storageProvider": { "type": "netherite" }` or `"mssql"` for high-scale scenarios instead of default Azure Storage.
- Set `"maxQueuePollingInterval"` appropriately — lower values increase responsiveness but increase storage transaction costs on Consumption plan.
- Configure Application Insights sampling rate under `"logging": { "applicationInsights": { "samplingSettings": { ... } } }` to control telemetry volume.

## Orchestration Patterns

### Function Chaining
- Use sequential `await context.CallActivityAsync<T>(nameof(ActivityName), input)` calls for step-by-step workflows where each step depends on the result of the previous.
- Pass only serializable, lightweight data as inputs/outputs between activities — avoid passing entire domain objects with circular references.

### Fan-Out / Fan-In
- Use `Task.WhenAll(tasks)` after fanning out with multiple `context.CallActivityAsync` calls to aggregate parallel results.
- Cap the degree of parallelism when fanning out over large collections — use batching (e.g., partitioning input lists) to avoid overwhelming downstream services or hitting Durable Functions storage limits.
- Prefer `List<Task<T>>` over dynamic task arrays; capture all tasks before awaiting to avoid replay issues.

### Async HTTP API (Human Interaction / Long-Running)
- Use `client.ScheduleNewOrchestrationInstanceAsync` from an HTTP trigger starter function; return `await client.CreateCheckStatusResponseAsync(req, instanceId)` to provide polling URLs to callers.
- Use `context.WaitForExternalEvent<T>("EventName", timeout)` combined with `context.CreateTimer(deadline, CancellationToken)` to implement approval/callback patterns with timeouts.
- Always handle the timeout race: use `Task.WhenAny(externalEventTask, timerTask)` and cancel the timer if the event arrives first.

### Monitoring / Polling Pattern
- Use a `while` loop with `context.CreateTimer(context.CurrentUtcDateTime.Add(interval), CancellationToken.None)` for polling workflows instead of separate timer-triggered functions.
- Ensure the monitoring loop has a clear exit condition to avoid infinite loops that never terminate.
- For recurring eternal workflows, use `context.ContinueAsNew(input)` to restart the orchestration with fresh state and prevent unbounded history growth.

### Eternal Orchestrations
- Use `context.ContinueAsNew(newInput)` at the end of the orchestrator body to restart with clean state for long-lived recurring workflows.
- Drain any pending external events before calling `ContinueAsNew` when using `isKeepRunning` patterns.
- Combine `ContinueAsNew` with `context.CreateTimer` to implement periodic tasks (e.g., daily report generation, cache refresh).

### Sub-Orchestrations
- Use `context.CallSubOrchestratorAsync<T>(nameof(SubOrchestrator), instanceId, input)` to decompose complex workflows into reusable child orchestrations.
- Provide an explicit `instanceId` for sub-orchestrations when idempotency or correlation is required.
- Limit sub-orchestration nesting depth to avoid history size issues; flatten workflows where possible.

### Entity Functions (Stateful Entities)
- Define entities using class-based syntax implementing `TaskEntity<TState>` for typed, encapsulated state management.
- Access entity state only via entity operations (`entity.State`); never read or write entity storage directly.
- Use `context.Entities.CallEntityAsync<T>` from activities or `context.Entities.SignalEntityAsync` from orchestrators for fire-and-forget entity operations.
- Prefer `SignalEntityAsync` over `CallEntityAsync` from orchestrators when the return value is not needed, to avoid unnecessary blocking.
- Use entities for scenarios requiring distributed counters, distributed locks, aggregators, or per-user/per-session state.
- Keep entity state small and serializable; avoid storing large blobs or collections that grow unboundedly in entity state.

## Activity Functions

- Keep activity functions focused on a single unit of work — they are the only place to perform I/O (database reads/writes, HTTP calls, queue sends).
- Inject services (e.g., `IRepository`, `IHttpClientFactory`) via constructor DI into the class containing activity functions; do not use `[FromServices]` inside the activity method.
- Make activities **idempotent** where possible — orchestrators may call the same activity multiple times on retry.
- Use `TaskActivityContext` parameter type for activity context; log using the injected `ILogger<T>` (not a replay-safe logger — activities are not replayed).
- Return only serializable types from activities; avoid returning domain entities with navigation properties.

## Error Handling and Compensation

- Wrap `context.CallActivityAsync` calls in try/catch blocks within the orchestrator to handle `TaskFailedException` for graceful error handling and compensation.
- Implement compensating transactions (saga pattern) in the catch block by calling undo activities when a step fails mid-workflow.
- Use `RetryPolicy` (via `new TaskOptions(new RetryPolicy(maxRetries, firstRetryInterval))`) on activity calls for automatic retries with backoff on transient failures.
- Distinguish between transient errors (retry) and business errors (fail-fast and compensate) — do not retry validation or authorization failures.
- Always terminate stuck orchestrations via the Durable Functions management API or client if they enter an error state that cannot self-resolve.

## Timers

- Use `context.CreateTimer(fireAt, CancellationToken)` for durable delays inside orchestrators — never use `Task.Delay` or `Thread.Sleep`.
- Always cancel timers that are no longer needed (e.g., when an external event arrives before the timer fires) by passing and cancelling a `CancellationTokenSource`.
- Avoid very short timer intervals (under 1 minute) in production on the Consumption plan; they may cause excessive storage polling costs.

## Instance Management

- Use meaningful, deterministic `instanceId` values (e.g., `$"order-{orderId}"`) instead of GUIDs when the orchestration needs to be correlated to a business entity.
- Check for existing instances using `client.GetInstanceMetadataAsync(instanceId)` before scheduling new ones to prevent duplicate orchestrations (singleton pattern).
- Use `client.TerminateInstanceAsync`, `client.SuspendInstanceAsync`, and `client.ResumeInstanceAsync` for lifecycle management in management APIs or administrative functions.
- Purge completed/failed orchestration history periodically using `client.PurgeInstanceAsync` or bulk purge to control Task Hub storage growth.

## Observability

- Use `context.CreateReplaySafeLogger(nameof(Orchestrator))` for all logging inside orchestrators to prevent duplicate log entries during replay.
- Log the `instanceId` in every log statement from orchestrators and starters for end-to-end traceability.
- Use Application Insights with the Durable Functions integration to track orchestration lifecycle events, activity durations, and failures.
- Monitor orchestration health via the Durable Functions HTTP management API endpoints (`/runtime/webhooks/durabletask/instances`) or the Durable Functions Monitor VS Code extension.
- Set `durableTask.maxConcurrentOrchestratorFunctions` and `durableTask.maxConcurrentActivityFunctions` in `host.json` to control concurrency and prevent resource exhaustion.

## Storage and Task Hub Configuration

- Configure the Task Hub name in `host.json` under `"extensions": { "durableTask": { "hubName": "MyTaskHub" } }` to isolate environments (dev/staging/prod) sharing the same storage account.
- Use separate storage accounts or Task Hub names per environment to avoid cross-environment interference.
- For high-throughput scenarios, use the **Netherite** or **MSSQL** storage provider instead of the default Azure Storage provider to improve performance and reduce costs.
- Avoid storing large payloads (>64KB) directly as orchestration inputs/outputs; store large data in Blob Storage and pass the reference (URL/ID) instead.

## Testing Durable Functions

- Use the `Microsoft.Azure.Functions.Worker.Extensions.DurableTask.Tests` NuGet package (if available) or manually mock `TaskOrchestrationContext` for unit testing orchestrators.
- Test activity functions in isolation as regular methods — inject mocks for their dependencies (repositories, HTTP clients) and assert on return values.
- Test orchestrator logic by mocking `context.CallActivityAsync`, `context.CreateTimer`, and `context.WaitForExternalEvent` using a test harness or manual mocks.
- Avoid testing the Durable Functions runtime itself (event sourcing, replay) — focus tests on the business logic inside orchestrators and activities.
- Use integration tests with Azurite or an isolated Azure Storage account to test end-to-end workflows, including starter → orchestrator → activity → completion.
- Use deterministic instance IDs in tests (e.g., `$"test-{Guid.NewGuid()}"`) to enable querying and verifying orchestration state via `client.GetInstanceMetadataAsync`.
- Test timeout scenarios by mocking `context.CreateTimer` to fire immediately and verifying the orchestrator handles the timeout branch.
- Test compensation/error handling by forcing activity failures (throw exceptions in mocked activities) and asserting the orchestrator calls compensating activities.
- Use `client.WaitForInstanceCompletionAsync` in integration tests instead of polling — it blocks until the orchestration completes or times out.
- For entity tests, use `context.Entities.SignalEntityAsync` in test orchestrators and verify entity state via `client.ReadEntityStateAsync` after the orchestration completes.

## Existing Code Review Guidance

- If `DateTime.UtcNow` or `DateTime.Now` is used inside an orchestrator, flag it and replace with `context.CurrentUtcDateTime`.
- If `Guid.NewGuid()` or `Random` is used inside an orchestrator, flag it as non-deterministic and move it to an activity.
- If direct HTTP calls (`HttpClient.GetAsync`, etc.) are made inside an orchestrator, flag them immediately and move the call into an activity function.
- If `Task.Delay` or `Thread.Sleep` is used inside an orchestrator, replace with `context.CreateTimer`.
- If orchestration history is growing unboundedly without `ContinueAsNew` on long-running loops, suggest adding `ContinueAsNew` to reset history.
- If entity state is storing large collections or blob data, suggest externalizing large data to Blob Storage and storing only references in entity state.
- If activity functions are not idempotent and the workflow has no retry/compensation logic, flag this as a reliability risk.
