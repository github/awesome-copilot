# Blob Storage with Event Grid Recipe

Adds Blob Storage triggers using Event Grid as the event source for high-scale, low-latency blob processing.

## Overview

This recipe creates functions that respond to blob creation/deletion events via Event Grid, which provides better scalability and lower latency than polling-based blob triggers.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | `BlobTrigger` with `source=EventGrid` |
| **Input** | `BlobInput` for destination container |
| **Auth** | Managed Identity (UAMI) |
| **IaC** | ✅ Full template available |

## AZD Templates (Recommended)

Use these templates directly instead of composing from HTTP base:

| Language | Template |
|----------|----------|
| Python | `azd init -t functions-quickstart-python-azd-eventgrid-blob` |
| TypeScript | `azd init -t functions-quickstart-typescript-azd-eventgrid-blob` |
| JavaScript | `azd init -t functions-quickstart-javascript-azd-eventgrid-blob` |
| C# (.NET) | `azd init -t functions-quickstart-dotnet-azd-eventgrid-blob` |
| Java | `azd init -t functions-quickstart-java-azd-eventgrid-blob` |
| PowerShell | `azd init -t functions-quickstart-powershell-azd-eventgrid-blob` |

## Why Event Grid Source?

| Aspect | Polling Trigger | Event Grid Source |
|--------|-----------------|-------------------|
| **Latency** | 10s-60s | Sub-second |
| **Scale** | Limited | High-scale |
| **Cost** | Higher (polling) | Lower (push) |
| **Setup** | Simple | Requires Event Grid subscription |

## Composition Steps (Alternative)

If composing from HTTP base template:

| # | Step | Details |
|---|------|---------|
| 1 | **Add IaC** | Add Storage account, Event Grid subscription from `bicep/` |
| 2 | **Add extension** | Add blob extension package |
| 3 | **Replace source code** | Add trigger from `source/{lang}.md` |
| 4 | **Configure app settings** | Add storage connection settings |

## Extension Packages

| Language | Package |
|----------|---------|
| Python | `azurefunctions-extensions-bindings-blob` |
| TypeScript/JavaScript | `@azure/functions-extensions-blob` |
| C# (.NET) | `Microsoft.Azure.Functions.Worker.Extensions.Storage.Blobs` |

## Required App Settings

```bicep
PDFProcessorSTORAGE__blobServiceUri: 'https://${storage.name}.blob.${environment().suffixes.storage}/'
PDFProcessorSTORAGE__credential: 'managedidentity'
PDFProcessorSTORAGE__clientId: uamiClientId
```

## Files

| Path | Description |
|------|-------------|
| [bicep/blob.bicep](bicep/blob.bicep) | Bicep module for Storage + Event Grid |
| [terraform/blob.tf](terraform/blob.tf) | Terraform module for Storage + Event Grid |
| [source/python.md](source/python.md) | Python blob trigger with Event Grid |
| [source/typescript.md](source/typescript.md) | TypeScript blob trigger with Event Grid |
| [source/javascript.md](source/javascript.md) | JavaScript blob trigger with Event Grid |
| [source/dotnet.md](source/dotnet.md) | C# (.NET) blob trigger with Event Grid |
| [source/java.md](source/java.md) | Java blob trigger with Event Grid |
| [source/powershell.md](source/powershell.md) | PowerShell blob trigger with Event Grid |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |

## Common Issues

### Trigger Not Firing

**Cause:** Event Grid subscription not created or misconfigured.

**Solution:** Verify Event Grid subscription exists and points to the function endpoint.

### Permission Denied

**Cause:** UAMI missing blob data contributor role.

**Solution:** Assign `Storage Blob Data Contributor` role to the UAMI.

### Duplicate Processing

**Cause:** Function retries on transient failures.

**Solution:** Implement idempotency by checking if output blob already exists.
