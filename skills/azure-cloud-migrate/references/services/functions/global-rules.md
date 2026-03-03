# Global Rules

These rules apply to ALL phases of the migration skill.

## Destructive Action Policy

⛔ **NEVER** perform destructive actions without explicit user confirmation via `ask_user`:
- Deleting files or directories
- Overwriting existing code
- Deploying to production environments
- Modifying existing Azure resources
- Removing AWS resources

## User Confirmation Required

Always use `ask_user` before:
- Selecting Azure subscription
- Selecting Azure region/location
- Deploying infrastructure
- Making breaking changes to existing code

## Best Practices

- Always use `mcp_azure_mcp_get_bestpractices` tool before generating Azure code
- Prefer managed identity over connection strings
- **Always use the latest supported language runtime** — check [supported languages](https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages) for the newest GA version. Never default to older versions
- **Always prefer bindings over SDKs** — use `input.storageBlob()`, `output.storageBlob()`, `app.storageQueue()`, etc. instead of `BlobServiceClient`, `QueueClient`, or other SDK clients. Only use SDK when no binding exists for the service
- Follow Azure naming conventions
- Use Flex Consumption hosting plan for new Functions

## Identity-First Authentication (Zero API Keys)

> Enterprise subscriptions commonly enforce policies that block local auth. Always design for identity-based access from the start.

- **Storage accounts**: Set `allowSharedKeyAccess: false`. Use identity-based connections with `AzureWebJobsStorage__credential`, `__clientId`, and service-specific URIs (`__blobServiceUri`, `__queueServiceUri`, etc.)
- **Cognitive Services**: Set `disableLocalAuth: true`. Use UAMI + RBAC role (e.g., Cognitive Services User) instead of API keys
- **Application Insights**: Set `disableLocalAuth: true`. Use `APPLICATIONINSIGHTS_AUTHENTICATION_STRING` with `ClientId=<uamiClientId>;Authorization=AAD`
- **DefaultAzureCredential with UAMI**: When using User Assigned Managed Identity, always pass `managedIdentityClientId` explicitly:
  ```javascript
  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID
  });
  ```
  Without this, `DefaultAzureCredential` tries SystemAssigned first and fails. Add `AZURE_CLIENT_ID` as an app setting mapped to the UAMI client ID.

## Flex Consumption Specifics

- **Always-ready for non-HTTP triggers**: Blob trigger groups on Flex Consumption require `alwaysReady: [{ name: "blob", instanceCount: 1 }]` to bootstrap the trigger listener. Without it, the trigger group never starts and Event Grid subscriptions are never auto-created (chicken-and-egg problem)
- **Blob trigger with EventGrid source requires queue endpoint**: The blob extension internally uses queues for poison-message tracking. Must include `AzureWebJobsStorage__queueServiceUri` even when using blob trigger (not queue trigger)
- **Event Grid subscriptions via Bicep/ARM only**: Do NOT create Event Grid event subscriptions via CLI — webhook validation fails on Flex Consumption with "response code Unknown". Deploy as Bicep resources using `listKeys()` to resolve the `blobs_extension` system key at deployment time
- **azd init on non-empty directories**: `azd init --template` refuses non-empty directories. Use temp directory approach: init in temp, copy template infrastructure files back
