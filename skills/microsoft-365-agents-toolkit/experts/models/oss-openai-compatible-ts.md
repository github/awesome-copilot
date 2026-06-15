# oss-openai-compatible-ts

## purpose

Connecting to self-hosted open-source models via OpenAI-compatible endpoints. Covers Ollama, vLLM, LM Studio, llama.cpp (server mode), text-generation-inference (TGI), LocalAI, and any other server that implements the `/v1/chat/completions` API.

## rules

1. **All OpenAI-compatible servers use the same API contract.** The `/v1/chat/completions` endpoint accepts the same request body as OpenAI's API. Use the `openai` npm package with a custom `baseURL` — no special SDKs needed. [github.com/openai/openai-node](https://github.com/openai/openai-node)
2. **Set `baseURL` to the server's endpoint.** Common defaults: Ollama `http://localhost:11434/v1`, LM Studio `http://localhost:1234/v1`, vLLM `http://localhost:8000/v1`, llama.cpp `http://localhost:8080/v1`. Always confirm the actual URL — ports may differ.
3. **Set `apiKey` to any non-empty string.** Most local servers don't require auth but the OpenAI SDK constructor requires `apiKey`. Pass `'not-needed'` or `'ollama'`.
4. **Model names are server-specific.** Ollama uses names like `llama3.2`, `mistral`, `phi4`. vLLM uses the model path. LM Studio uses whatever you loaded. Check the server's model list endpoint: `GET /v1/models`.
5. **Feature support varies by server and model.** Not all servers support streaming, tool use, JSON mode, or vision. Test capabilities before relying on them. Ollama supports tool use for some models; llama.cpp has limited function calling.
6. **Ollama is the easiest local server to start with.** Install: `curl -fsSL https://ollama.com/install.sh | sh` (Linux/macOS) or download from [ollama.com](https://ollama.com). Pull a model: `ollama pull llama3.2`. It auto-starts and exposes the OpenAI-compatible API. [ollama.com](https://ollama.com)
7. **vLLM is best for production self-hosting.** Optimized for throughput with continuous batching, PagedAttention, and tensor parallelism. Requires NVIDIA GPU. `pip install vllm && vllm serve meta-llama/Llama-3.2-3B-Instruct`. [docs.vllm.ai](https://docs.vllm.ai)
8. **LM Studio provides a desktop GUI with an API server.** Download from [lmstudio.ai](https://lmstudio.ai). Load a model in the GUI, then start the server tab. Good for developers who prefer a visual interface.
9. **Always set timeouts.** Local models can be slow, especially on CPU. Set `timeout: 120000` (2 minutes) or higher for large models. Streaming helps surface partial results while the model generates.
10. **Use the same code for local and cloud.** Since the API contract is identical to OpenAI's, you can swap between local OSS models and cloud providers by changing `baseURL` and `apiKey`. This enables local dev with cloud prod deployment.

## patterns

### Ollama

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama', // required by SDK, ignored by Ollama
  timeout: 120000, // local models can be slow
});

const response = await client.chat.completions.create({
  model: 'llama3.2', // must match an installed Ollama model
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: userMessage },
  ],
  temperature: 0.7,
});

const reply = response.choices[0].message.content;
```

### vLLM

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8000/v1',
  apiKey: 'not-needed',
  timeout: 60000,
});

const response = await client.chat.completions.create({
  model: 'meta-llama/Llama-3.2-3B-Instruct', // model path as served by vLLM
  messages: [{ role: 'user', content: userMessage }],
});
```

### LM Studio

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'lm-studio',
});

// List available models (whatever is loaded in LM Studio)
const models = await client.models.list();
console.log(models.data.map((m) => m.id));

const response = await client.chat.completions.create({
  model: models.data[0].id, // use the first loaded model
  messages: [{ role: 'user', content: userMessage }],
});
```

### Universal provider abstraction

```typescript
import OpenAI, { AzureOpenAI } from 'openai';

interface ModelConfig {
  provider: 'openai' | 'azure' | 'ollama' | 'vllm' | 'foundry-local' | 'custom';
  baseURL?: string;
  apiKey?: string;
  model: string;
  // Azure-specific
  endpoint?: string;
  apiVersion?: string;
  deployment?: string;
}

function createClient(config: ModelConfig): OpenAI {
  switch (config.provider) {
    case 'openai':
      return new OpenAI({ apiKey: config.apiKey });
    case 'azure':
      return new AzureOpenAI({
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        apiVersion: config.apiVersion ?? '2024-10-21',
        deployment: config.deployment,
      });
    case 'ollama':
      return new OpenAI({
        baseURL: config.baseURL ?? 'http://localhost:11434/v1',
        apiKey: 'ollama',
        timeout: 120000,
      });
    case 'vllm':
      return new OpenAI({
        baseURL: config.baseURL ?? 'http://localhost:8000/v1',
        apiKey: 'not-needed',
        timeout: 60000,
      });
    case 'foundry-local':
      return new OpenAI({
        baseURL: config.baseURL, // from foundry service status
        apiKey: 'not-needed',
      });
    case 'custom':
      return new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey ?? 'not-needed',
      });
  }
}

// Usage — same chat.completions.create() call works for all providers
const client = createClient({
  provider: process.env.MODEL_PROVIDER as any,
  baseURL: process.env.MODEL_BASE_URL,
  apiKey: process.env.MODEL_API_KEY,
  model: process.env.MODEL_NAME!,
});
```

### Streaming with any OpenAI-compatible server

```typescript
const stream = await client.chat.completions.create({
  model: 'llama3.2',
  messages: [{ role: 'user', content: userMessage }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}
```

### Ollama quick setup (bash)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# List installed models
ollama list

# Test the API
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"Hello!"}]}'

# Pull more models
ollama pull mistral
ollama pull phi4
ollama pull deepseek-r1:1.5b
```

## server selection guide

| Server | Best For | GPU Required? | OpenAI API? | Tool Calling? | Setup Effort |
|---|---|---|---|---|---|
| **Ollama** | Desktop dev, quick prototyping | No (GPU optional) | Yes (`/v1`) | Some models | Minimal — one-line install |
| **vLLM** | Production self-hosting, high throughput | Yes (NVIDIA) | Yes (`/v1`) | Yes | Medium — pip install |
| **LM Studio** | Desktop GUI, non-CLI users | No (GPU optional) | Yes (`/v1`) | Limited | Minimal — desktop app |
| **llama.cpp** | Ultra-lightweight CPU inference | No | Yes (server mode) | Limited | Medium — build from source or use pre-built |
| **TGI** | Production HuggingFace models, Docker | Yes (NVIDIA) | Yes (`/v1`) | Yes | Medium — Docker-based |
| **LocalAI** | Drop-in OpenAI replacement, multi-model | No (GPU optional) | Yes (`/v1`) | Yes | Medium — Docker or binary |
| **Foundry Local** | Microsoft ecosystem, ONNX models | No (GPU/NPU optional) | Yes (`/v1`) | Some models | Minimal — winget/brew |

### Where models come from

Most OSS inference servers pull models from **Hugging Face Hub** (`huggingface.co`). Ollama has its own registry (`ollama.com/library`) that wraps HF models with optimized configs. vLLM and TGI use HF model paths directly (e.g., `meta-llama/Llama-3.2-3B-Instruct`). Foundry Local uses the Azure ML model registry.

You don't need the **Hugging Face Transformers** Python library to use these models from TypeScript — the inference servers handle model loading internally. HF Transformers is only needed if you're running models directly in Python.

## pitfalls

- **Port conflicts.** If multiple local servers are running, they may fight for the same port. Check with `lsof -i :<port>` or `netstat -an | grep <port>` before starting a server.
- **Assuming feature parity with OpenAI.** Local models may not support JSON mode, tool use, vision, or structured outputs. Test the specific feature with your chosen model before building on it.
- **Model name mismatches.** Each server has its own model naming convention. Ollama uses `llama3.2`, vLLM uses the full HuggingFace path `meta-llama/Llama-3.2-3B-Instruct`. Check `GET /v1/models` for the exact names.
- **CPU inference is slow.** CPU-only inference for 7B+ models can take 10-60 seconds per response. Use streaming so the user sees partial results. For acceptable speed, use a GPU or smaller models (1-3B parameters).
- **Out of memory.** Large models (13B+) need 16+ GB RAM/VRAM. If the server crashes or hangs, the model is too large for your hardware. Try a quantized variant (e.g., Q4_K_M in llama.cpp) or a smaller model.
- **Ollama auto-unloads idle models.** By default, Ollama unloads models after 5 minutes of inactivity. The next request will have a cold-start delay while the model reloads. Set `OLLAMA_KEEP_ALIVE=-1` to keep models loaded.
- **vLLM requires NVIDIA GPU.** vLLM only supports NVIDIA GPUs with CUDA. For AMD GPUs, use ROCm builds. For CPU-only, use Ollama or llama.cpp instead.

## references

- [Ollama](https://ollama.com)
- [vLLM Documentation](https://docs.vllm.ai)
- [LM Studio](https://lmstudio.ai)
- [llama.cpp — Server Mode](https://github.com/ggerganov/llama.cpp/tree/master/examples/server)
- [text-generation-inference (TGI)](https://github.com/huggingface/text-generation-inference)
- [LocalAI](https://localai.io)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)

## instructions

This expert covers connecting to any OpenAI-compatible model server from TypeScript. Use it when the developer is running self-hosted open-source models (Ollama, vLLM, LM Studio, llama.cpp, TGI) or any custom server implementing the OpenAI chat completions API.

Pair with: `foundry-local-ts.md` (Microsoft's local model server), `openai-azure-openai-ts.md` (cloud OpenAI for production), `anthropic-ts.md` (if mixing providers).

## research

Deep Research prompt:

"Write a micro expert on connecting TypeScript applications to OpenAI-compatible self-hosted model servers. Cover: Ollama (install, pull, serve, API), vLLM (serve, model paths, GPU requirements), LM Studio (server mode), llama.cpp server mode, text-generation-inference (TGI), connecting with the openai npm package via custom baseURL, model naming conventions by server, feature support matrix (streaming, tool use, JSON mode, vision), provider abstraction patterns, timeout and performance considerations, and dev-to-prod patterns."
