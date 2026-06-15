# openai-azure-openai-ts

## purpose

Configuring and calling OpenAI and Azure OpenAI models from TypeScript. Covers direct SDK usage (not Teams AI SDK — see `../teams/ai.model-setup-ts.md` for that), authentication patterns, streaming, function calling, and environment variable management.

## rules

1. **Use the official `openai` npm package for both OpenAI and Azure OpenAI.** The same SDK supports both — Azure is just a configuration difference. `npm install openai`. [github.com/openai/openai-node](https://github.com/openai/openai-node)
2. **For plain OpenAI, pass `apiKey` only.** The SDK reads `OPENAI_API_KEY` from the environment by default. You can also pass it explicitly: `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`. [platform.openai.com/docs/api-reference](https://platform.openai.com/docs/api-reference)
3. **For Azure OpenAI, use `AzureOpenAI` from the same package.** Import `AzureOpenAI` and provide `endpoint`, `apiVersion`, and `deployment`. The deployment name replaces the `model` parameter in API calls. [learn.microsoft.com/azure/ai-services/openai/quickstart](https://learn.microsoft.com/azure/ai-services/openai/quickstart)
4. **Azure OpenAI requires `apiVersion`.** Use a stable version like `2024-10-21`. Omitting it produces request path errors. Check the docs for the latest stable version. [learn.microsoft.com/azure/ai-services/openai/reference](https://learn.microsoft.com/azure/ai-services/openai/reference)
5. **For Azure Managed Identity, use `@azure/identity`.** Pass a `DefaultAzureCredential` token provider instead of an API key. This eliminates key management entirely: `azureADTokenProvider: () => credential.getToken('https://cognitiveservices.azure.com/.default')`. [learn.microsoft.com/azure/active-directory/managed-identities-azure-resources](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources)
6. **Always set a timeout.** The SDK defaults to no timeout. Set `timeout: 30000` (30s) for chat completions, higher for image generation. Stalled endpoints will hang your bot indefinitely without this.
7. **Use streaming for long responses.** Call `client.chat.completions.create({ ..., stream: true })` to get an `AsyncIterable<ChatCompletionChunk>`. This lets your bot send progressive updates instead of waiting for the full response. [platform.openai.com/docs/api-reference/chat/create](https://platform.openai.com/docs/api-reference/chat/create)
8. **Use structured outputs for reliable JSON.** Pass `response_format: { type: 'json_schema', json_schema: { ... } }` to guarantee valid JSON output. Available on GPT-4o and later. [platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs)
9. **Function calling uses `tools` and `tool_choice`.** Define tools as an array of `{ type: 'function', function: { name, description, parameters } }`. The model returns `tool_calls` in its response — your code executes them and sends results back. [platform.openai.com/docs/guides/function-calling](https://platform.openai.com/docs/guides/function-calling)
10. **Store all secrets in environment variables.** Use `dotenv` for local dev. Never hard-code API keys. For production, use Key Vault (Azure) or Secrets Manager (AWS). [npmjs.com/package/dotenv](https://www.npmjs.com/package/dotenv)

## patterns

### OpenAI chat completion

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

const reply = response.choices[0].message.content;
```

### Azure OpenAI chat completion

```typescript
import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-10-21',
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  timeout: 30000,
});

const response = await client.chat.completions.create({
  model: '', // ignored — deployment determines the model
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage },
  ],
});
```

### Azure OpenAI with Managed Identity (keyless)

```typescript
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

const credential = new DefaultAzureCredential();
const tokenProvider = getBearerTokenProvider(credential, 'https://cognitiveservices.azure.com/.default');

const client = new AzureOpenAI({
  azureADTokenProvider: tokenProvider,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-10-21',
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
});
```

### Streaming

```typescript
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages,
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}
```

### Function calling (tool use)

```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages,
  tools: [{
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
        },
        required: ['location'],
      },
    },
  }],
  tool_choice: 'auto',
});

if (response.choices[0].message.tool_calls) {
  for (const call of response.choices[0].message.tool_calls) {
    const args = JSON.parse(call.function.arguments);
    const result = await executeFunction(call.function.name, args);
    messages.push(response.choices[0].message);
    messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
  }
  // Send tool results back for the model to generate a final response
  const finalResponse = await client.chat.completions.create({ model: 'gpt-4o', messages, tools });
}
```

## pitfalls

- **Using `model` name with Azure OpenAI.** Azure uses the deployment name, not the model name. `model: 'gpt-4o'` fails — use the deployment name from Azure portal.
- **Forgetting `apiVersion` for Azure.** Every Azure OpenAI request requires `apiVersion` in the path. Omitting it gives a cryptic 404 or path error.
- **Stale tokens with Managed Identity.** The `getBearerTokenProvider` from `@azure/identity` handles caching/refresh internally. Don't wrap it in your own caching layer.
- **Mixing `maxTokens` and `max_tokens`.** The SDK uses snake_case (`max_tokens`) matching the API. Don't use camelCase.
- **Not handling `finish_reason: 'length'`.** If the response was truncated, `finish_reason` is `'length'` not `'stop'`. Check this to decide whether to send a follow-up request.
- **Streaming without error handling.** Wrap `for await` in try/catch — network errors mid-stream throw from the iterator.

## references

- [OpenAI Node.js SDK — GitHub](https://github.com/openai/openai-node)
- [OpenAI API Reference — Chat Completions](https://platform.openai.com/docs/api-reference/chat/create)
- [Azure OpenAI Quickstart — TypeScript](https://learn.microsoft.com/azure/ai-services/openai/quickstart)
- [Azure OpenAI REST API Reference](https://learn.microsoft.com/azure/ai-services/openai/reference)
- [Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)

## instructions

This expert covers direct SDK usage of OpenAI and Azure OpenAI from TypeScript. Use it when the developer is calling the OpenAI API directly (not through Teams AI SDK). For Teams AI SDK's `OpenAIChatModel` wrapper, see `../teams/ai.model-setup-ts.md` instead.

Pair with: `../teams/ai.model-setup-ts.md` (Teams AI SDK model layer), `../security/secrets-ts.md` (API key management), `../deploy/azure-cli-reference-ts.md` (provisioning Azure OpenAI via CLI).

## research

Deep Research prompt:

"Write a micro expert on using the OpenAI Node.js SDK (TypeScript) for both OpenAI and Azure OpenAI. Cover: client initialization, AzureOpenAI class, apiVersion requirements, Managed Identity with @azure/identity, chat completions, streaming, function calling / tool use, structured outputs, timeout configuration, error handling, and retry patterns."
