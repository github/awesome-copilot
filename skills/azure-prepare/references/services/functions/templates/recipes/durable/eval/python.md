# Durable Functions Recipe Evaluation

**Date:** 2026-02-19T04:56:00Z
**Recipe:** durable
**Language:** Python
**Status:** ✅ PASS (after setting storage flags)

## Deployment

| Property | Value |
|----------|-------|
| Function App | `func-api-x7xtff7z2udxe` |
| Resource Group | `rg-durable-func-dev` |
| Region | eastus2 |
| Base Template | `functions-quickstart-python-http-azd` |

## Root Cause of Initial Failure

The base template's storage module defaults to `enableQueue: false` and `enableTable: false`. Durable Functions requires both.

### Solution: Set Storage Flags

In `main.bicep`, set:
```bicep
enableQueue: true   // Required for Durable task hub
enableTable: true   // Required for Durable orchestration history
```

When these flags are `true`, the base template automatically:
1. Adds `AzureWebJobsStorage__queueServiceUri` app setting
2. Adds `AzureWebJobsStorage__tableServiceUri` app setting  
3. Assigns `Storage Queue Data Contributor` RBAC role
4. Assigns `Storage Table Data Contributor` RBAC role

## Test Results (After Fix)

### Health Endpoint
```json
{"status": "healthy", "type": "durable"}
```

### Start Orchestration
```json
{
  "id": "0fe900e532dc4c11912eb31e65e822dc",
  "statusQueryGetUri": "https://..."
}
```

### Orchestration Completed
```json
{
  "runtimeStatus": "Completed",
  "output": ["Hello Seattle", "Hello Tokyo", "Hello London"]
}
```

## Code Requirements

Must use `df.DFApp()` instead of `func.FunctionApp()`:
```python
import azure.durable_functions as df
app = df.DFApp(http_auth_level=func.AuthLevel.FUNCTION)
```

## Verdict

✅ **PASS** - Durable recipe works after adding:
1. Queue and Table service URIs to app settings
2. Queue and Table RBAC roles to managed identity
3. Using `df.DFApp()` instead of `func.FunctionApp()`

## Action Items
- [ ] Update durable recipe README with required app settings
- [ ] Add IaC module to set Queue/Table URIs and RBAC roles
