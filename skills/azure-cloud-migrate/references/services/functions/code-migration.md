# Code Migration Phase

Migrate AWS Lambda function code to Azure Functions.

## Prerequisites

- Assessment report completed
- Azure Functions extension installed in VS Code
- Best practices loaded via `mcp_azure_mcp_get_bestpractices` tool

## Rules

- If runtime is Python or Node.js: **do NOT create function.json files**
- If runtime is .NET (in-process or isolated) or Java: **do NOT hand-author function.json** — bindings metadata is generated from attributes/annotations at build time
- Use extension bundle version `[4.*, 5.0.0)` in host.json
- Use latest programming model (v4 for JavaScript, v2 for Python)
- **Always use bindings and triggers instead of SDKs** — For blob read/write, use `input.storageBlob()` / `output.storageBlob()` with `extraInputs`/`extraOutputs`. For queues, use `app.storageQueue()` or `app.serviceBusQueue()`. Only use SDK when there is no equivalent binding (e.g., Azure AI, custom HTTP calls)
- **Always use the latest supported language runtime** — Consult [supported languages](https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages) and select the newest GA version. Do NOT default to an older LTS version when a newer version is available on Azure Functions.

## Steps

1. **Install Azure Functions Extension** — Ensure VS Code extension is installed
2. **Load Best Practices** — Use `mcp_azure_mcp_get_bestpractices` tool for code generation guidance
3. **Create Project Structure** — Set up the Azure Functions project inside the output directory (`<aws-folder>-azure/`). Do NOT create files inside the original AWS directory
4. **Migrate Functions** — Convert each Lambda function to Azure Functions equivalent
5. **Update Dependencies** — Replace AWS SDKs with Azure SDKs in package.json / requirements.txt
6. **Configure Bindings** — Set up triggers and bindings inline (v4 JS / v2 Python)
7. **Configure Environment** — Map Lambda env vars to Azure Functions app settings
8. **Add Error Handling** — Ensure proper error handling in all functions

## Key Configuration Files

### host.json

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "extensions": {
    "queues": {
      "maxPollingInterval": "00:00:02",
      "visibilityTimeout": "00:00:30",
      "batchSize": 1,
      "maxDequeueCount": 5
    }
  },
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  }
}
```

## Critical Infrastructure Dependencies

### Blob Trigger with EventGrid Source — Additional Requirements

When migrating S3 event triggers to Azure blob triggers with `source: 'EventGrid'`, the following infrastructure must be configured **at the IaC level** (not code level). Failure to set these up results in silent trigger failures.

| Requirement | Why | Consequence of Missing |
|------------|-----|----------------------|
| **Queue endpoint** (`AzureWebJobsStorage__queueServiceUri`) | Blob extension uses queues internally for poison-message tracking with EventGrid source | Function fails to index: "Unable to find matching constructor...QueueServiceClient" |
| **Always-ready instances** (Flex Consumption only) | Blob trigger group must be running to register the Event Grid webhook | Trigger group never starts → webhook never registered → events never delivered |
| **Event Grid subscription via Bicep/ARM** | CLI-based webhook validation handshake times out on Flex Consumption | Use `listKeys()` in Bicep to obtain the `blobs_extension` system key at deployment time |
| **Storage Queue Data Contributor** RBAC | Identity-based queue access for poison messages | 403 errors during blob trigger indexing |

See [lambda-to-functions.md](lambda-to-functions.md#flex-consumption--blob-trigger-with-eventgrid-source) for Bicep patterns.

### UAMI Credential Pattern

When using User Assigned Managed Identity (UAMI), `DefaultAzureCredential()` without arguments tries System Assigned first and fails. Always pass the client ID:

```javascript
const credential = new DefaultAzureCredential({
  managedIdentityClientId: process.env.AZURE_CLIENT_ID
});
```

Add `AZURE_CLIENT_ID` as an app setting in Bicep pointing to the UAMI client ID.

### azd init Workaround for Non-Empty Directories

`azd init --template <template>` refuses to run in a non-empty directory. Use a temp-directory approach:

1. `azd init --template <template>` in an empty temp directory
2. Copy IaC files (`infra/`, `azure.yaml`, etc.) into the project root
3. Clean up the temp directory

### package.json (JavaScript)

```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "@azure/identity": "<latest>"
  },
  "devDependencies": {
    "@azure/functions-core-tools": "^4",
    "jest": "<latest>"
  }
}
```

## Runtime-Specific Trigger & Binding Patterns

Load the appropriate runtime reference for the target language:

| Runtime | Reference |
|---------|----------|
| JavaScript (Node.js v4) | [runtimes/javascript.md](runtimes/javascript.md) |
| TypeScript (v4) | [runtimes/typescript.md](runtimes/typescript.md) |
| Python (v2) | [runtimes/python.md](runtimes/python.md) |
| C# (Isolated Worker) | [runtimes/csharp.md](runtimes/csharp.md) |
| Java | [runtimes/java.md](runtimes/java.md) |
| PowerShell | [runtimes/powershell.md](runtimes/powershell.md) |

## Scenario-Specific Guidance

See [lambda-to-functions.md](lambda-to-functions.md) for detailed trigger mapping, code patterns, and examples.

## Handoff to azure-prepare

After code migration is complete:

1. Update `migration-status.md` — mark Code Migration as ✅ Complete
2. Invoke **azure-prepare** — pass the assessment report context so it can:
   - Use the service mapping as requirements input (skips manual gather-requirements)
   - Generate IaC (Bicep/Terraform) for the mapped Azure services
   - Create `azure.yaml` and `.azure/preparation-manifest.md`
   - Apply security hardening
3. azure-prepare will then chain to **azure-validate** → **azure-deploy**
