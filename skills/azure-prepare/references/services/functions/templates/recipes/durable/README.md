# Durable Functions Recipe

Adds Durable Functions orchestration patterns to an Azure Functions base template.

## Overview

This recipe composes with any HTTP base template to create a Durable Functions app with:
- **Orchestrator** - Coordinates workflow execution
- **Activity** - Individual task units
- **HTTP Client** - Starts and queries orchestrations

No additional Azure resources required — uses the existing Storage account for state management.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | `OrchestrationTrigger` + `ActivityTrigger` |
| **Client** | `DurableClient` / `DurableOrchestrationClient` |
| **Auth** | N/A — internal orchestration |
| **IaC** | ⚠️ Set `enableQueue: true` and `enableTable: true` in main.bicep |

## ⚠️ CRITICAL: Storage Endpoint Flags

Durable Functions requires Queue and Table storage for the task hub and history. The base template supports this via flags:

### Enable in main.bicep

Set these flags in the storage module parameters:

```bicep
module storage './shared/storage.bicep' = {
  params: {
    enableBlob: true    // Default - deployment packages
    enableQueue: true   // REQUIRED for Durable - task hub messages
    enableTable: true   // REQUIRED for Durable - orchestration history
  }
}
```

When these flags are `true`, the base template automatically:
1. Adds `AzureWebJobsStorage__queueServiceUri` app setting
2. Adds `AzureWebJobsStorage__tableServiceUri` app setting
3. Assigns `Storage Queue Data Contributor` RBAC role to UAMI
4. Assigns `Storage Table Data Contributor` RBAC role to UAMI

### What the Flags Control

| Flag | App Setting Added | RBAC Role Added |
|------|-------------------|-----------------|
| `enableQueue: true` | `AzureWebJobsStorage__queueServiceUri` | Storage Queue Data Contributor |
| `enableTable: true` | `AzureWebJobsStorage__tableServiceUri` | Storage Table Data Contributor |

> **Note:** If these flags are missing or `false`, Durable Functions will fail with 503 errors.

## Composition Steps

Apply these steps AFTER `azd init -t functions-quickstart-{lang}-azd`:

| # | Step | Details |
|---|------|---------|
| 1 | **Add extension** | Add Durable Functions extension package |
| 2 | **Replace source code** | Add Orchestrator + Activity + Client from `source/{lang}.md` |
| 3 | **Configure host.json** | Optional: tune concurrency settings |

## Extension Packages

| Language | Package |
|----------|---------|
| Python | `azure-functions-durable` |
| TypeScript/JavaScript | `durable-functions` |
| C# (.NET) | `Microsoft.Azure.Functions.Worker.Extensions.DurableTask` |
| Java | `com.microsoft:durabletask-azure-functions` |
| PowerShell | Built-in (v2 bundles) |

## Files

| Path | Description |
|------|-------------|
| [source/python.md](source/python.md) | Python Durable Functions source code |
| [source/typescript.md](source/typescript.md) | TypeScript Durable Functions source code |
| [source/javascript.md](source/javascript.md) | JavaScript Durable Functions source code |
| [source/dotnet.md](source/dotnet.md) | C# (.NET) Durable Functions source code |
| [source/java.md](source/java.md) | Java Durable Functions source code |
| [source/powershell.md](source/powershell.md) | PowerShell Durable Functions source code |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |

## Patterns Included

### Fan-out/Fan-in (Default)

```
HTTP Start → Orchestrator → [Activity1, Activity2, Activity3] → Aggregate → Return
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orchestrators/{name}` | POST | Start new orchestration |
| `/api/status/{instanceId}` | GET | Check orchestration status |
| `/api/health` | GET | Health check |

## Common Issues

### Storage Connection Error (503 "Function host is not running")

**Symptoms:** 503 "Function host is not running", or "Storage Queue connection failed"

**Cause:** `enableQueue` and `enableTable` flags are not set to `true` in main.bicep.

**Solution:** Set both flags to `true` in the storage module and redeploy:
```bicep
enableQueue: true
enableTable: true
```

### Orchestrator Replay Issues

**Cause:** Non-deterministic code in orchestrator (e.g., `DateTime.Now`, random values).

**Solution:** Use `context.current_utc_datetime` or `context.CurrentUtcDateTime` instead.

## host.json Configuration (Optional)

```json
{
  "extensions": {
    "durableTask": {
      "maxConcurrentActivityFunctions": 10,
      "maxConcurrentOrchestratorFunctions": 5
    }
  }
}
```
