# foundry-local-ts

## purpose

Running AI models locally on-device using Azure AI Foundry Local. Covers the `foundry` CLI for model management, the OpenAI-compatible REST API for code integration, and patterns for using local models in bot development and testing.

## rules

1. **Install Foundry Local via package manager.** Windows: `winget install Microsoft.FoundryLocal`. macOS: `brew tap microsoft/foundrylocal && brew install foundrylocal`. Verify with `foundry --version`. [learn.microsoft.com/azure/foundry-local/get-started](https://learn.microsoft.com/azure/foundry-local/get-started)
2. **Foundry Local exposes an OpenAI-compatible API.** The local service runs at `http://localhost:<port>/v1/chat/completions`. Use the standard `openai` npm package pointed at this endpoint — no custom SDK needed. [learn.microsoft.com/azure/foundry-local/reference/reference-rest](https://learn.microsoft.com/azure/foundry-local/reference/reference-rest)
3. **The port is dynamic.** Foundry Local assigns a random port each time the service starts. Always discover it via `foundry service status` and parse the endpoint URL. Do not hard-code port numbers. [learn.microsoft.com/azure/foundry-local/reference/reference-cli](https://learn.microsoft.com/azure/foundry-local/reference/reference-cli)
4. **Use aliases to let Foundry auto-select the best variant.** Running `foundry model run phi-4-mini` auto-selects the GPU/NPU/CPU variant matching your hardware. Use the full model ID (e.g., `phi-4-mini-instruct-cuda-gpu`) only when you need a specific variant.
5. **Models are downloaded on first use and cached locally.** The first `foundry model run <model>` downloads the model (can take minutes). Subsequent runs use the cache. Manage the cache with `foundry cache list`, `foundry cache remove <model>`, and `foundry cache cd <path>`.
6. **No API key required.** Foundry Local runs entirely on-device with no authentication. When connecting the `openai` SDK, set `apiKey` to any non-empty string (the SDK requires it but Foundry ignores it).
7. **The API supports streaming, function calling, and tool use.** The `/v1/chat/completions` endpoint supports `stream: true`, `tools`, `function_call`, and all standard OpenAI chat completion parameters. Not all models support all features — check `supportsToolCalling` in the model catalog.
8. **Use Foundry Local for development and testing, cloud for production.** Local models are smaller and less capable than cloud models. Use them to iterate on prompts, test function calling logic, and develop offline — then switch to a cloud provider for production.
9. **Monitor loaded models with `foundry service ps`.** Models consume significant RAM/VRAM. Unload models you're not using: `foundry model unload <model>`. Use `foundry service diag` to view service logs.
10. **If the service fails, restart it.** Common error: "Request to local service failed." Fix with `foundry service restart`. This resolves port binding issues after sleep/hibernate.

## cli reference

### Model commands

| Command | Purpose |
|---|---|
| `foundry model run <model>` | Download (if needed) and run a model with interactive chat |
| `foundry model list` | List all available models in the catalog |
| `foundry model list --filter device=GPU` | Filter models by device type (CPU, GPU, NPU) |
| `foundry model list --filter task=chat-completion` | Filter by task type |
| `foundry model list --filter provider=CUDAExecutionProvider` | Filter by execution provider |
| `foundry model list --filter alias=phi*` | Filter by alias with wildcard |
| `foundry model list --filter device=!GPU` | Exclude GPU models (negation) |
| `foundry model info <model>` | Show detailed model information |
| `foundry model info <model> --license` | Show model license |
| `foundry model download <model>` | Download without running |
| `foundry model load <model>` | Load into service memory |
| `foundry model unload <model>` | Unload from service memory |

### Service commands

| Command | Purpose |
|---|---|
| `foundry service start` | Start the Foundry Local service |
| `foundry service stop` | Stop the service |
| `foundry service restart` | Restart the service (fixes port issues) |
| `foundry service status` | Show status and endpoint URL |
| `foundry service ps` | List currently loaded models |
| `foundry service diag` | View service logs |
| `foundry service set <options>` | Configure service settings |

### Cache commands

| Command | Purpose |
|---|---|
| `foundry cache list` | List cached (downloaded) models |
| `foundry cache location` | Show cache directory path |
| `foundry cache cd <path>` | Change cache directory |
| `foundry cache remove <model>` | Remove a model from cache |

## patterns

### Connect with OpenAI SDK (TypeScript)

```typescript
import OpenAI from 'openai';
import { execSync } from 'child_process';

// Discover the dynamic endpoint
function getFoundryEndpoint(): string {
  const output = execSync('foundry service status', { encoding: 'utf-8' });
  const match = output.match(/http:\/\/localhost:\d+/);
  if (!match) throw new Error('Foundry Local is not running. Run: foundry service restart');
  return match[0];
}

const endpoint = getFoundryEndpoint();

const client = new OpenAI({
  baseURL: `${endpoint}/v1`,
  apiKey: 'not-needed', // required by SDK but ignored by Foundry
});

const response = await client.chat.completions.create({
  model: 'phi-4-mini', // use the alias — Foundry resolves to loaded variant
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
  max_tokens: 500,
});

const reply = response.choices[0].message.content;
```

### Streaming with Foundry Local

```typescript
const stream = await client.chat.completions.create({
  model: 'phi-4-mini',
  messages: [{ role: 'user', content: userMessage }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}
```

### Dev/prod model switching (Foundry Local → Azure OpenAI)

```typescript
import OpenAI, { AzureOpenAI } from 'openai';

function createModelClient(): OpenAI {
  if (process.env.NODE_ENV === 'production') {
    return new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: '2024-10-21',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    });
  }

  // Local development — use Foundry Local
  const endpoint = getFoundryEndpoint();
  return new OpenAI({
    baseURL: `${endpoint}/v1`,
    apiKey: 'not-needed',
  });
}

const client = createModelClient();
// Same chat.completions.create() call works for both
```

### Function calling with Foundry Local

```typescript
// Check model supports tool calling first
// foundry model info phi-4-mini → look for supportsToolCalling: true
const response = await client.chat.completions.create({
  model: 'phi-4-mini',
  messages: [{ role: 'user', content: 'What is the weather in Seattle?' }],
  tools: [{
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string' } },
        required: ['location'],
      },
    },
  }],
  tool_choice: 'auto',
});
```

### Quick model setup for bot development

```bash
# 1. Start a model
foundry model run phi-4-mini

# 2. In another terminal, verify the endpoint
foundry service status
# Output: http://localhost:5272 (port varies)

# 3. Test with curl
curl http://localhost:5272/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"phi-4-mini","messages":[{"role":"user","content":"Hello!"}]}'

# 4. List available models
foundry model list --filter task=chat-completion

# 5. Check what's loaded
foundry service ps

# 6. Unload when done
foundry model unload phi-4-mini
```

## pitfalls

- **Hard-coding the port.** Foundry Local assigns a random port on each service start. Always discover it via `foundry service status`. Code that assumes port 5272 will break after a restart.
- **"Request to local service failed."** The service lost its port binding (common after sleep/hibernate). Fix with `foundry service restart`.
- **Large models on limited hardware.** Models like `gpt-oss-20b` need 16+ GB VRAM. Check model sizes with `foundry model info <model>` before downloading. Start with `qwen2.5-0.5b` for testing on low-end hardware.
- **Expecting cloud-quality responses from local models.** Local models (Phi-4 mini, Qwen 2.5) are smaller and less capable than GPT-4o or Claude. Use them for testing interaction patterns, not evaluating response quality.
- **Not unloading models.** Each loaded model consumes RAM/VRAM. If your machine slows down, check `foundry service ps` and unload unused models.
- **Tool calling on models that don't support it.** Not all local models support function calling. Check `supportsToolCalling` in `foundry model info <model>`. Phi-4 mini supports it; smaller models may not.
- **Forgetting `apiKey` in the OpenAI SDK.** The SDK constructor requires `apiKey` even though Foundry ignores it. Pass any non-empty string.

## references

- [Foundry Local — Get Started](https://learn.microsoft.com/azure/foundry-local/get-started)
- [Foundry Local CLI Reference](https://learn.microsoft.com/azure/foundry-local/reference/reference-cli)
- [Foundry Local REST API Reference](https://learn.microsoft.com/azure/foundry-local/reference/reference-rest)
- [Foundry Local GitHub](https://github.com/microsoft/Foundry-Local)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)

## instructions

This expert covers running AI models locally with Azure AI Foundry Local. Use it when the developer wants to run models on-device for development, testing, or offline scenarios. Foundry Local's OpenAI-compatible API means the same `openai` SDK code works for both local and cloud models.

Pair with: `openai-azure-openai-ts.md` (cloud counterpart — same SDK), `oss-openai-compatible-ts.md` (other local model servers like Ollama), `foundry-cloud-ts.md` (Azure AI Foundry cloud deployment).

## research

Deep Research prompt:

"Write a micro expert on Azure AI Foundry Local for TypeScript developers. Cover: installation (winget/brew), foundry CLI commands (model run/list/info/download/load/unload, service start/stop/restart/status/ps/diag, cache list/location/cd/remove), the OpenAI-compatible REST API at /v1/chat/completions, connecting with the openai npm package, dynamic port discovery, model aliases vs model IDs, hardware-specific variant selection, function calling support, streaming, dev-to-prod patterns (Foundry Local for dev, Azure OpenAI for prod), and common troubleshooting."
