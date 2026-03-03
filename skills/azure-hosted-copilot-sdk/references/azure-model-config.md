# Model Configuration

Three model paths for the Copilot SDK. Each session needs different configuration.

## Path 1: GitHub Default

No configuration needed. SDK uses the default model.

```typescript
const session = await client.createSession({});
// or simply: client.createSession()
```

Best for: quick prototyping, no model preference.

## Path 2: GitHub Specific Model

Specify a model name. Discover available models with `listModels()`.

```typescript
const models = await client.listModels();
// Pick from available models
const session = await client.createSession({
  model: "o4-mini",
});
```

## Path 3: Azure BYOM (Bring Your Own Model)

Use your own Azure AI deployment. For local development use `DefaultAzureCredential`; for production use `ManagedIdentityCredential` — see [auth-best-practices.md](auth-best-practices.md).

> ⚠️ **Warning:** The Copilot SDK encrypts prompt content. Only models that support decrypting encrypted content work with BYOM. Using unsupported models returns "400 Encrypted content is not supported" or silently times out.

### Supported Models

| Family | Models |
|--------|--------|
| **o-series** | o3, o3-mini, o4-mini (cheapest) |
| **gpt-5 family** | gpt-5, gpt-5-mini, gpt-5.1, gpt-5.1-mini, gpt-5.1-nano, gpt-5.2-codex, codex-mini |
| ❌ **NOT supported** | gpt-4o, gpt-4.1, gpt-4.1-nano, and other non-o/non-gpt-5 models |

### Required API Settings

| Setting | Value | Notes |
|---------|-------|-------|
| `wireApi` | `"completions"` | ⚠️ Do NOT use `"responses"` — breaks multi-turn tool calls (`store: false` causes 400) |
| `azure.apiVersion` | `"2025-04-01-preview"` or later | ⚠️ Must be nested under `azure:`, NOT top-level |

### Provider Config

| Endpoint type | `type` | `baseUrl` pattern |
|---|---|---|
| Azure OpenAI | `azure` | `https://<resource>.openai.azure.com` |
| Azure AI Foundry | `openai` | `https://<resource>.services.ai.azure.com/api/projects/<project>/openai/v1/` |

### Code Pattern

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](auth-best-practices.md) for production patterns.

```typescript
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const { token } = await credential.getToken("https://cognitiveservices.azure.com/.default");

const session = await client.createSession({
    model: process.env.MODEL_NAME || "o4-mini",
    provider: {
        type: "azure",
        baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
        bearerToken: token,
        wireApi: "completions",
        azure: { apiVersion: "2025-04-01-preview" },
    },
});
```

### Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `AZURE_OPENAI_ENDPOINT` | `https://<resource>.openai.azure.com` | Yes |
| `MODEL_NAME` | Model deployment name | Yes |
| `AZURE_CLIENT_ID` | Managed identity client ID | Yes (Container Apps with user-assigned MI) |

### Token Refresh

> ⚠️ **Warning:** `bearerToken` is static — no auto-refresh.

- Tokens valid ~1 hour
- **Production**: get fresh token per request
- Long-running sessions fail after expiry

### Discovering Azure Deployments

`listModels()` returns GitHub models only. For Azure deployments:

```bash
az cognitiveservices account deployment list --name <resource> --resource-group <rg>
```

## Template Environment Variables

The template uses env vars for model path selection:

| Variable | Values | Effect |
|----------|--------|--------|
| `MODEL_PROVIDER` | unset or `azure` | Selects GitHub or Azure BYOM |
| `MODEL_NAME` | model/deployment name | Selects specific model |
| `AZURE_OPENAI_ENDPOINT` | Azure endpoint URL | Required for BYOM |

## Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `400 Encrypted content is not supported` | Model doesn't support SDK encryption | Use o-series or gpt-5 family only |
| `400` with tool calls / multi-turn | `wireApi: "responses"` with `store: false` | Use `wireApi: "completions"` instead |
| `CAPIError: 404 Resource not found` | `apiVersion` at top level instead of nested | Use `azure: { apiVersion: "..." }` |
| Silent timeout | Unsupported model (e.g., gpt-4o, gpt-4.1) | Switch to o4-mini or gpt-5 family |
| `model is required` | Missing `model` in BYOM config | Set `MODEL_NAME` env var |
| `401 Unauthorized` | Token expired or wrong scope | Refresh via `DefaultAzureCredential` |
| `404 Not Found` | Wrong endpoint or deployment name | Verify URL and deployment exists |
| `500` in Container Apps | Missing `AZURE_CLIENT_ID` env var | Set to managed identity client ID in Bicep |
