# transformers-js-ts

## purpose

Running AI models directly in Node.js or the browser using Transformers.js — no server, no API calls, no network. Covers the `@huggingface/transformers` pipeline API for text generation, embeddings, classification, summarization, and other tasks using ONNX models via WASM/WebGPU.

## rules

1. **Transformers.js runs models in-process, not via an API.** Unlike Ollama, vLLM, or Foundry Local (which run a server you call via HTTP), Transformers.js loads ONNX models directly into your Node.js process or browser tab. No separate server to manage. `npm install @huggingface/transformers`. [huggingface.co/docs/transformers.js](https://huggingface.co/docs/transformers.js)
2. **Use the `pipeline` API for most tasks.** `pipeline(task, model?)` returns a callable function. Supported tasks include `text-generation`, `text-classification`, `feature-extraction` (embeddings), `summarization`, `translation`, `question-answering`, `token-classification` (NER), `zero-shot-classification`, `automatic-speech-recognition`, and more. [huggingface.co/docs/transformers.js/api/pipelines](https://huggingface.co/docs/transformers.js/api/pipelines)
3. **Models must be ONNX-format and tagged `transformers.js` on HuggingFace Hub.** Not every HF model works — look for the `transformers.js` library tag. Find compatible models at `huggingface.co/models?library=transformers.js`. Popular choices: `Xenova/all-MiniLM-L6-v2` (embeddings), `Xenova/distilbert-base-uncased-finetuned-sst-2-english` (classification), `onnx-community/Qwen2.5-0.5B-Instruct` (text generation).
4. **Models are downloaded and cached on first use.** The first call to `pipeline()` downloads the model from HF Hub. Subsequent calls use the local cache. For Node.js, models are cached in the filesystem. For browsers, they're cached in browser storage.
5. **Use `device: 'webgpu'` for GPU acceleration in browsers.** By default, models run on CPU via WASM. WebGPU provides significant speedups but is still experimental in some browsers. Node.js uses CPU (WASM) by default.
6. **Use quantized models for performance.** Set `dtype: 'q4'` or `dtype: 'q8'` to load quantized variants. Quantized models are smaller and faster but slightly less accurate. Default is `q8` for WASM and `fp32` for WebGPU.
7. **This is NOT for large chat models.** Transformers.js is best for small, task-specific models (embeddings, classification, NER, summarization). Running LLM-class text generation (7B+ params) is extremely slow in WASM. For chat with large models, use a server-based solution (Ollama, Foundry Local, vLLM) or a cloud API.
8. **Best use cases in bots: embeddings, classification, and preprocessing.** Use Transformers.js for tasks that run before or after calling a large model — e.g., compute embeddings for RAG search, classify user intent locally, detect PII/sentiment, or summarize context before sending to a cloud LLM.
9. **Works in both Node.js and browsers.** The same code runs in both environments. For server-side bots, import normally. For browser-based bots (web chat widgets), import in a web worker to avoid blocking the UI thread.
10. **Models are large downloads.** Even quantized models are 50-500MB. Budget for initial download time and disk/storage space. Use `env.cacheDir` to control where models are cached in Node.js.

## patterns

### Text classification (sentiment analysis)

```typescript
import { pipeline } from '@huggingface/transformers';

const classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');

const result = await classifier('I love this product!');
// [{ label: 'POSITIVE', score: 0.9998 }]

// Use in a bot to classify user sentiment before responding
const sentiment = result[0].label; // 'POSITIVE' or 'NEGATIVE'
```

### Embeddings for RAG (feature extraction)

```typescript
import { pipeline } from '@huggingface/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  dtype: 'q8', // quantized for speed
});

// Generate embeddings for semantic search
const embedding = await embedder('How do I reset my password?', {
  pooling: 'mean',
  normalize: true,
});

// embedding.data is a Float32Array — use for cosine similarity search
const vector = Array.from(embedding.data);
```

### Text generation (small models only)

```typescript
import { pipeline } from '@huggingface/transformers';

const generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
  dtype: 'q4', // quantized for speed
});

const result = await generator('What is the capital of France?', {
  max_new_tokens: 100,
  temperature: 0.7,
});

console.log(result[0].generated_text);
```

### Zero-shot classification (intent detection)

```typescript
import { pipeline } from '@huggingface/transformers';

const classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');

const result = await classifier('I need to cancel my order', {
  candidate_labels: ['order status', 'cancellation', 'returns', 'billing', 'general inquiry'],
});

// result.labels = ['cancellation', 'returns', 'order status', ...]
// result.scores = [0.87, 0.05, 0.04, ...]
const detectedIntent = result.labels[0]; // 'cancellation'
```

### Named entity recognition (NER)

```typescript
import { pipeline } from '@huggingface/transformers';

const ner = await pipeline('token-classification', 'Xenova/bert-base-NER');

const entities = await ner('John Smith works at Microsoft in Seattle.');
// [
//   { entity: 'B-PER', word: 'John', score: 0.99 },
//   { entity: 'I-PER', word: 'Smith', score: 0.99 },
//   { entity: 'B-ORG', word: 'Microsoft', score: 0.99 },
//   { entity: 'B-LOC', word: 'Seattle', score: 0.99 },
// ]
```

### Summarization (condense context before sending to LLM)

```typescript
import { pipeline } from '@huggingface/transformers';

const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');

const summary = await summarizer(longDocument, {
  max_length: 130,
  min_length: 30,
});

// Use the summary as context in a cloud LLM call to save tokens
const condensedContext = summary[0].summary_text;
```

### Hybrid pattern: local preprocessing + cloud LLM

```typescript
import { pipeline } from '@huggingface/transformers';
import OpenAI from 'openai';

// Initialize local models once at startup
const intentClassifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

// Initialize cloud LLM
const llm = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleMessage(userMessage: string) {
  // Step 1: Classify intent locally (free, fast, no network)
  const intent = await intentClassifier(userMessage, {
    candidate_labels: ['question', 'complaint', 'request', 'greeting'],
  });

  // Step 2: Generate embedding locally for RAG search
  const embedding = await embedder(userMessage, { pooling: 'mean', normalize: true });
  const relevantDocs = await searchVectorStore(Array.from(embedding.data));

  // Step 3: Send to cloud LLM with context (only pay for the final generation)
  const response = await llm.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `User intent: ${intent.labels[0]}. Relevant docs: ${relevantDocs}` },
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0].message.content;
}
```

### Configure cache directory (Node.js)

```typescript
import { env } from '@huggingface/transformers';

// Set custom cache directory (default: ~/.cache/huggingface)
env.cacheDir = '/path/to/model-cache';

// Disable remote model downloads (use only cached models)
env.allowRemoteModels = false;

// Use local models from a specific directory
env.localModelPath = '/path/to/local-models';
```

### Browser web worker (avoid blocking UI)

```typescript
// worker.ts — runs in a web worker
import { pipeline } from '@huggingface/transformers';

let classifier: any = null;

self.onmessage = async (event) => {
  if (!classifier) {
    classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
      device: 'webgpu', // GPU acceleration in browser
    });
  }
  const result = await classifier(event.data.text);
  self.postMessage(result);
};
```

## pitfalls

- **Trying to run large chat models.** Transformers.js via WASM is far too slow for 7B+ parameter models. Use it for small task-specific models (50-500M params). For LLM chat, use Ollama, Foundry Local, or a cloud API.
- **Forgetting models need the `transformers.js` tag.** Not every HuggingFace model has an ONNX export. Filter models at `huggingface.co/models?library=transformers.js` to find compatible ones.
- **Blocking the main thread in browsers.** Model loading and inference are CPU-intensive. In browsers, always run Transformers.js in a **web worker** to avoid freezing the UI.
- **First-run download surprise.** The first call to `pipeline()` downloads the model (50-500MB). In production, pre-download models during build/deployment, or set `env.allowRemoteModels = false` and bundle models locally.
- **Memory pressure in Node.js.** Each loaded model consumes significant RAM. Loading multiple models simultaneously can exhaust memory. Reuse pipeline instances — don't create new ones per request.
- **Assuming OpenAI API compatibility.** Transformers.js has its own `pipeline()` API — it does NOT expose an OpenAI-compatible endpoint. You can't use the `openai` npm package with it. It's a completely different integration pattern.
- **WebGPU browser support.** WebGPU is still experimental in some browsers. Chrome/Edge have the best support. Firefox and Safari support varies. Always fall back to WASM (`device: 'cpu'`).

## references

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [Transformers.js GitHub](https://github.com/huggingface/transformers.js)
- [@huggingface/transformers on npm](https://www.npmjs.com/package/@huggingface/transformers)
- [Compatible Models on HuggingFace Hub](https://huggingface.co/models?library=transformers.js)
- [Pipeline API Reference](https://huggingface.co/docs/transformers.js/api/pipelines)
- [WebGPU Guide](https://huggingface.co/docs/transformers.js/guides/webgpu)

## instructions

This expert covers running AI models in-process using Transformers.js. Use it when the developer wants to run inference directly in Node.js or the browser without a server — for embeddings, classification, NER, summarization, or small text generation. This is fundamentally different from server-based solutions (Ollama, Foundry Local, vLLM) which expose an HTTP API.

Best bot use cases: local embeddings for RAG, intent classification, sentiment analysis, PII detection, summarization as preprocessing before a cloud LLM call.

Pair with: `openai-azure-openai-ts.md` (cloud LLM for the hybrid pattern), `oss-openai-compatible-ts.md` (server-based alternatives for larger models), `foundry-local-ts.md` (Foundry Local also uses ONNX but as a server).

## research

Deep Research prompt:

"Write a micro expert on Transformers.js (@huggingface/transformers) for TypeScript developers building bots. Cover: installation, pipeline API, supported tasks (text-generation, text-classification, feature-extraction/embeddings, summarization, translation, token-classification/NER, zero-shot-classification, question-answering), model selection from HuggingFace Hub (transformers.js tag), ONNX format requirement, quantization (q4/q8/fp16/fp32), WebGPU vs WASM backends, Node.js vs browser differences, web worker pattern for browsers, cache configuration, hybrid patterns (local preprocessing + cloud LLM), and limitations vs server-based inference."
