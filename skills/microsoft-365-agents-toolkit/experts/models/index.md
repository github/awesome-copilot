# models-router

## purpose

Route AI model integration tasks to the correct provider-specific expert. Covers configuring, calling, and managing AI models from any supported provider: Anthropic, OpenAI, Azure OpenAI, AWS Bedrock, Azure AI Foundry (cloud), Foundry Local, and OpenAI-compatible OSS endpoints (Ollama, vLLM, LM Studio, etc.).

## interview

### Q1 — Model Provider
```
question: "Which AI model provider are you working with?"
header: "Provider"
options:
  - label: "OpenAI / Azure OpenAI (Recommended)"
    description: "GPT-4o, GPT-4, GPT-3.5. Works with both OpenAI API and Azure OpenAI Service. Best Teams AI SDK support."
  - label: "Anthropic (Claude)"
    description: "Claude 4, Claude 3.5 Sonnet, Claude 3 Haiku. Direct API or via AWS Bedrock."
  - label: "AWS Bedrock"
    description: "Managed access to Anthropic, Meta Llama, Cohere, Amazon Titan, and other models. Uses AWS IAM auth."
  - label: "Foundry / OSS Local"
    description: "Azure AI Foundry (cloud or local), Ollama, vLLM, LM Studio, or any OpenAI-compatible endpoint for open-source models."
multiSelect: false
```

### Q2 — Use Case
```
question: "What are you building with the model?"
header: "Use case"
options:
  - label: "Bot / agent with chat completions"
    description: "Chat-style interaction in a Slack or Teams bot. May include function calling / tool use."
  - label: "RAG / knowledge retrieval"
    description: "Retrieve-then-generate pattern with embeddings, vector stores, or knowledge bases."
  - label: "Standalone API integration"
    description: "Direct API calls from a service — not tied to a specific bot framework."
  - label: "You decide everything"
    description: "Use recommended defaults and skip remaining questions."
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | OpenAI / Azure OpenAI |
| Q2 | Bot / agent with chat completions |

## task clusters

### OpenAI / Azure OpenAI
When: OpenAI, Azure OpenAI, GPT-4o, GPT-4, GPT-3.5, `openai` npm package, `@azure/openai`, chat completions, OpenAI API key, Azure OpenAI endpoint, deployment name, `apiVersion`
Read:
- `openai-azure-openai-ts.md`
Cross-domain deps: `../teams/ai.model-setup-ts.md` (Teams AI SDK model config), `../deploy/azure-cli-reference-ts.md` (az cognitiveservices for Azure OpenAI provisioning), `../security/secrets-ts.md` (API key management)

### Anthropic (Claude)
When: Anthropic, Claude, Claude 4, Claude 3.5, Claude 3, `@anthropic-ai/sdk`, Anthropic API, `ANTHROPIC_API_KEY`, Messages API, tool use with Claude
Read:
- `anthropic-ts.md`
Cross-domain deps: `../security/secrets-ts.md` (API key management)

### AWS Bedrock
When: Bedrock, AWS Bedrock, `@aws-sdk/client-bedrock-runtime`, Bedrock agents, Bedrock Converse API, Bedrock Knowledge Bases, hosted Anthropic, hosted Llama, Amazon Titan, Bedrock guardrails
Read:
- `bedrock-ts.md`
Cross-domain deps: `../deploy/aws-cli-reference-ts.md` (aws bedrock CLI commands), `../deploy/aws-bot-deploy-ts.md` (Lambda/ECS deployment), `../security/secrets-ts.md` (IAM auth)

### Azure AI Foundry (Cloud)
When: Azure AI Foundry, AI Foundry, Foundry Models, Azure AI model catalog, model-as-a-service, MaaS, serverless API, Azure AI Studio, Foundry cloud, GitHub Models
Read:
- `foundry-cloud-ts.md`
Cross-domain deps: `../deploy/azure-cli-reference-ts.md` (az cognitiveservices for provisioning), `../security/secrets-ts.md` (API key management)

### Foundry Local
When: Foundry Local, `foundry` CLI, `flocal`, local model, local inference, run model locally, on-device AI, ONNX, Phi-4, Qwen, `foundry model run`, `foundry model list`, `foundry service`, offline AI
Read:
- `foundry-local-ts.md`

### OpenAI-Compatible OSS Endpoints
When: Ollama, vLLM, LM Studio, llama.cpp, text-generation-inference, TGI, LocalAI, OpenAI-compatible, self-hosted model, open-source model, Llama, Mistral, DeepSeek, local LLM, `/v1/chat/completions` custom endpoint, custom base URL
Read:
- `oss-openai-compatible-ts.md`

### Transformers.js (In-Process Inference)
When: Transformers.js, `@huggingface/transformers`, in-process inference, browser inference, WASM inference, WebGPU inference, local embeddings, local classification, local NER, local summarization, pipeline API, HuggingFace Hub, ONNX in browser, serverless ML, no-server AI, feature extraction, zero-shot classification, sentiment analysis, token classification, offline embeddings
Read:
- `transformers-js-ts.md`
Cross-domain deps: `openai-azure-openai-ts.md` (hybrid pattern — local preprocessing + cloud LLM)

### Multi-Provider / Provider Abstraction
When: multiple models, fallback model, model routing, provider abstraction, LangChain, LiteLLM, Vercel AI SDK, `ai` npm package, model switching, cost optimization, A/B test models
Read:
- `openai-azure-openai-ts.md`
- `anthropic-ts.md`
- `oss-openai-compatible-ts.md`

## combining rule

If the developer uses **multiple providers** (e.g., Claude for reasoning + GPT-4o for function calling, or Foundry Local for dev + Azure OpenAI for prod), load all relevant provider experts. The multi-provider cluster above covers this.

If integrating a model into a **Teams bot**, always also read `../teams/ai.model-setup-ts.md` — it covers the `OpenAIChatModel` wrapper that Teams AI SDK uses.

If integrating a model into a **Slack bot**, the provider experts here cover direct SDK usage — Slack Bolt doesn't have a built-in AI layer, so you wire models directly.

## file inventory

`anthropic-ts.md` | `bedrock-ts.md` | `foundry-cloud-ts.md` | `foundry-local-ts.md` | `openai-azure-openai-ts.md` | `oss-openai-compatible-ts.md` | `transformers-js-ts.md`

<!-- Created 2026-02-28: Models domain for AI model provider integration (Anthropic, OpenAI, Azure OpenAI, Bedrock, Foundry, OSS) -->
<!-- Updated 2026-02-28: Added transformers-js-ts.md for in-process inference via @huggingface/transformers (embeddings, classification, NER, summarization in Node.js/browser without a server) -->
