# foundry-cloud-ts

## purpose

Using Azure AI Foundry (cloud) and the Azure AI model catalog for serverless model inference. Covers Model-as-a-Service (MaaS) deployments, the Azure AI Inference SDK, GitHub Models, and connecting to Foundry-hosted models from TypeScript.

## rules

1. **Azure AI Foundry provides serverless model endpoints (Model-as-a-Service).** No GPU provisioning needed — deploy a model from the catalog and get an HTTPS endpoint with pay-per-token billing. Available models include Phi-4, Llama, Mistral, Cohere, and more. [learn.microsoft.com/azure/ai-studio/how-to/deploy-models-serverless](https://learn.microsoft.com/azure/ai-studio/how-to/deploy-models-serverless)
2. **MaaS endpoints are OpenAI-compatible.** The deployed endpoint exposes `/v1/chat/completions` with the standard OpenAI request/response format. Use the `openai` npm package with a custom `baseURL` and the endpoint's API key. [learn.microsoft.com/azure/ai-studio/reference/reference-model-inference-chat-completions](https://learn.microsoft.com/azure/ai-studio/reference/reference-model-inference-chat-completions)
3. **Alternatively, use `@azure-rest/ai-inference` for the Azure AI Inference SDK.** This TypeScript SDK provides a typed client for Azure AI model endpoints. `npm install @azure-rest/ai-inference`. It supports chat completions, embeddings, and image generation. [learn.microsoft.com/azure/ai-studio/reference/reference-model-inference-api](https://learn.microsoft.com/azure/ai-studio/reference/reference-model-inference-api)
4. **Authentication uses either API key or Entra ID token.** MaaS endpoints accept an API key in the `Authorization: Bearer <key>` header. For managed identity, use `@azure/identity` to get a token. [learn.microsoft.com/azure/ai-studio/how-to/deploy-models-serverless](https://learn.microsoft.com/azure/ai-studio/how-to/deploy-models-serverless)
5. **GitHub Models provides free-tier access to the same model catalog.** Use `https://models.inference.ai.azure.com` as the base URL with a GitHub personal access token as the API key. Great for prototyping before deploying to your own Azure subscription. [docs.github.com/en/github-models](https://docs.github.com/en/github-models)
6. **Deploy models via the Azure AI Foundry portal or CLI.** In the portal: AI Foundry → Model catalog → Deploy. Via CLI: `az cognitiveservices account deployment create` for Azure OpenAI models, or use the AI Foundry portal for MaaS models. [learn.microsoft.com/azure/ai-studio/how-to/deploy-models-serverless](https://learn.microsoft.com/azure/ai-studio/how-to/deploy-models-serverless)
7. **Each deployment gets a unique endpoint URL and API key.** The endpoint URL format is `https://<deployment-name>.<region>.models.ai.azure.com`. Copy the endpoint and key from the deployment details page.
8. **Streaming works via standard SSE.** Pass `stream: true` in the request body. The response is `text/event-stream` with `data: {...}` chunks, identical to OpenAI streaming format.
9. **Some catalog models support tool use.** Check the model card in the catalog for "Function calling" or "Tool use" support. The API format matches OpenAI's `tools` / `tool_choice` parameters.
10. **For Azure OpenAI models (GPT-4o, etc.), use the Azure OpenAI Service instead.** Foundry MaaS is for non-OpenAI models (Phi, Llama, Mistral, etc.). GPT-4o goes through the Azure OpenAI resource, not MaaS. See `openai-azure-openai-ts.md` for that.

## patterns

### Connect via OpenAI SDK (simplest)

```typescript
import OpenAI from 'openai';

// MaaS endpoint from Azure AI Foundry deployment
const client = new OpenAI({
  baseURL: process.env.AZURE_AI_ENDPOINT, // e.g., https://my-phi4.eastus.models.ai.azure.com/v1
  apiKey: process.env.AZURE_AI_API_KEY,
  timeout: 30000,
});

const response = await client.chat.completions.create({
  model: 'phi-4', // model name from deployment
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

const reply = response.choices[0].message.content;
```

### Connect via Azure AI Inference SDK

```typescript
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

const client = ModelClient(
  process.env.AZURE_AI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_AI_API_KEY!),
);

const response = await client.path('/chat/completions').post({
  body: {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  },
});

if (isUnexpected(response)) {
  throw new Error(`API error: ${response.status} ${response.body.error?.message}`);
}

const reply = response.body.choices[0].message.content;
```

### GitHub Models (free prototyping)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.GITHUB_TOKEN, // GitHub personal access token
});

const response = await client.chat.completions.create({
  model: 'Phi-4', // model name from GitHub Models catalog
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage },
  ],
});
```

### Dev/prod switching (GitHub Models → Azure AI Foundry)

```typescript
import OpenAI from 'openai';

function createClient(): OpenAI {
  if (process.env.NODE_ENV === 'production') {
    return new OpenAI({
      baseURL: process.env.AZURE_AI_ENDPOINT,
      apiKey: process.env.AZURE_AI_API_KEY,
    });
  }
  // Free tier for development
  return new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey: process.env.GITHUB_TOKEN,
  });
}
```

## pitfalls

- **Confusing Foundry MaaS with Azure OpenAI.** MaaS is for non-OpenAI models (Phi, Llama, Mistral). GPT-4o uses Azure OpenAI Service with a different SDK path. Don't mix them up.
- **Wrong base URL format.** MaaS endpoints already include the path. When using the `openai` SDK, set `baseURL` to the endpoint URL plus `/v1`. Check the deployment details page for the exact URL.
- **GitHub Models rate limits.** The free tier has aggressive rate limits. For production, deploy your own model in Azure AI Foundry.
- **Model-specific quirks.** Different models have different context windows, token limits, and feature support. Phi-4 supports function calling; some models don't. Check the model card.
- **Endpoint key rotation.** MaaS API keys can be regenerated in the portal. After rotation, update all services using the old key.
- **Region availability.** Not all models are available in all Azure regions. Check the model catalog for your region before deploying.

## references

- [Azure AI Foundry — Model Catalog](https://learn.microsoft.com/azure/ai-studio/how-to/model-catalog-overview)
- [Deploy Serverless Models (MaaS)](https://learn.microsoft.com/azure/ai-studio/how-to/deploy-models-serverless)
- [Azure AI Inference SDK — npm](https://www.npmjs.com/package/@azure-rest/ai-inference)
- [Azure AI Model Inference API](https://learn.microsoft.com/azure/ai-studio/reference/reference-model-inference-api)
- [GitHub Models](https://docs.github.com/en/github-models)

## instructions

This expert covers Azure AI Foundry cloud (Model-as-a-Service) and GitHub Models. Use it when the developer wants to call non-OpenAI models (Phi, Llama, Mistral) hosted on Azure's serverless infrastructure. For OpenAI/GPT models on Azure, see `openai-azure-openai-ts.md`. For running models locally, see `foundry-local-ts.md`.

Pair with: `openai-azure-openai-ts.md` (Azure OpenAI for GPT models), `foundry-local-ts.md` (local development), `../deploy/azure-cli-reference-ts.md` (provisioning), `../security/secrets-ts.md` (key management).

## research

Deep Research prompt:

"Write a micro expert on Azure AI Foundry Model-as-a-Service (MaaS) for TypeScript developers. Cover: model catalog overview, serverless deployment, OpenAI-compatible endpoints, connecting with the openai npm package, @azure-rest/ai-inference SDK, GitHub Models as a free-tier option, API key vs Entra ID auth, streaming, function calling support by model, dev-to-prod patterns, and deployment via portal and CLI."
