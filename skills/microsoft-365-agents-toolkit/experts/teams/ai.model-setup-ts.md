# ai.model-setup-ts

## purpose

Configuring OpenAI and Azure OpenAI chat models for Teams AI using OpenAIChatModel and its full options surface.

## rules

1. Always import `OpenAIChatModel` from `@microsoft/teams.openai` -- this is the only model class in the Teams AI v2 SDK. It handles both OpenAI and Azure OpenAI backends. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. For plain OpenAI, provide `apiKey` and `model` (e.g., `'gpt-4o'`). Do not set `endpoint` or `apiVersion` -- those trigger Azure mode. [OpenAI API reference](https://platform.openai.com/docs/api-reference/chat)
3. For Azure OpenAI, provide `apiKey`, `endpoint`, `apiVersion`, and `model` (the deployment name, not the base model name). Setting `endpoint` is what switches the client into Azure mode. [learn.microsoft.com -- Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
4. For Azure Managed Identity authentication, omit `apiKey` and provide `azureADTokenProvider: () => Promise<string>` instead. This function is called before each request to obtain a fresh token. [learn.microsoft.com -- Managed Identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
5. Store all secrets (`apiKey`, `endpoint`, `apiVersion`, deployment name) in environment variables and load them via `process.env`. Never hard-code API keys in source files. Use `dotenv` for local development. [dotenv on npm](https://www.npmjs.com/package/dotenv)
6. Use the `requestOptions` field to set default chat completion parameters (`temperature`, `max_tokens`, `top_p`, etc.). These apply to every `prompt.send()` call unless overridden per-request via `prompt.send(input, { request: { ... } })`. [OpenAI -- Chat Completions](https://platform.openai.com/docs/api-reference/chat/create)
7. Use `logger` on the model constructor to get request/response debug logging. Pass a `ConsoleLogger` child for scoped output (e.g., `logger.child('openai')`). [github.com/microsoft/teams.ts -- ConsoleLogger](https://github.com/microsoft/teams.ts)
8. Set `timeout` (in milliseconds) to prevent hanging requests. A reasonable default is 30000-60000ms for chat completions. The SDK does not set a default timeout. [OpenAI SDK -- timeout](https://platform.openai.com/docs/api-reference)
9. Use `headers` for custom HTTP headers required by proxies or API gateways. This is a `Record<string, string>` merged into every outgoing request. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Use `organization` and `project` only when your OpenAI account requires org/project scoping. Azure OpenAI ignores these fields. [OpenAI -- Organization](https://platform.openai.com/docs/api-reference/organization-optional)

## patterns

### OpenAI configuration

```typescript
import { OpenAIChatModel } from '@microsoft/teams.openai';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});
```

### Azure OpenAI configuration

```typescript
import { OpenAIChatModel } from '@microsoft/teams.openai';

const model = new OpenAIChatModel({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  model: process.env.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME,
});
```

### Azure OpenAI with Managed Identity and request defaults

```typescript
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { ConsoleLogger } from '@microsoft/teams.common';

const logger = new ConsoleLogger('my-bot', { level: 'debug' });

const model = new OpenAIChatModel({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  model: process.env.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME,
  azureADTokenProvider: () => getAzureADToken(),
  timeout: 30000,
  logger: logger.child('openai'),
  requestOptions: {
    temperature: 0.7,
    max_tokens: 1000,
  },
});
```

## pitfalls

- **Setting `endpoint` with an OpenAI key**: If you provide `endpoint`, the SDK switches to Azure mode and your plain OpenAI key will fail authentication. Only set `endpoint` for Azure OpenAI.
- **Using the base model name for Azure**: Azure OpenAI `model` must be the deployment name (e.g., `'my-gpt4o-deployment'`), not the base model name (`'gpt-4o'`). Mismatches produce 404 errors.
- **Forgetting `apiVersion` for Azure**: Azure OpenAI requires `apiVersion`. Omitting it results in a request path error. Use a known stable version like `'2024-02-01'`.
- **No timeout set**: Without `timeout`, a stalled Azure endpoint can hang your bot indefinitely. Always set an explicit timeout for production deployments.
- **`azureADTokenProvider` returning stale tokens**: The provider function is called per-request. Make sure it handles token caching and refresh internally (e.g., via `@azure/identity` `DefaultAzureCredential`).
- **Committing `.env` files**: API keys in `.env` should be in `.gitignore`. Never commit secrets to version control.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [OpenAI API Reference -- Chat Completions](https://platform.openai.com/docs/api-reference/chat/create)
- [Azure OpenAI Service REST API](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
- [Azure Managed Identity Overview](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [@microsoft/teams.openai -- npm](https://www.npmjs.com/package/@microsoft/teams.openai)

## instructions

This expert covers configuring the `OpenAIChatModel` class from `@microsoft/teams.openai` for use with ChatPrompt in Teams AI v2. Use it when you need to:

- Create a new model instance for OpenAI or Azure OpenAI
- Configure Azure Managed Identity token providers for keyless authentication
- Set default request parameters (temperature, max_tokens) at the model level
- Add custom headers, timeouts, or logging to the model client
- Understand the full `OpenAIChatModelOptions` reference table and which fields trigger Azure mode

Pair with `ai.chatprompt-basics-ts.md` for passing the model to ChatPrompt, `ai.streaming-ts.md` for streaming configuration, and `runtime.app-init-ts.md` for the App context where models are used.

## research

Deep Research prompt:

"Write a micro expert on configuring OpenAIChatModel in the Teams AI Library v2 (TypeScript). Cover the OpenAIChatModel constructor, OpenAI vs Azure OpenAI configuration differences, all OpenAIChatModelOptions fields (apiKey, endpoint, apiVersion, model, azureADTokenProvider, baseUrl, organization, project, headers, timeout, requestOptions, logger), Azure Managed Identity patterns, model selection guidance, and environment variable best practices."
