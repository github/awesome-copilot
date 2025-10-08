---
description: "Instructions for using LangChain with Python"
applyTo: "**/*.py"
---

# LangChain with Python — Development Instructions

Purpose: concise, opinionated guidance for building reliable, secure, and maintainable LangChain applications in Python. Includes setup, patterns, tests, CI, and links to authoritative docs.

## Quick setup

- Python: 3.10+
- Suggested install (adjust to your needs):

```bash
pip install "langchain[all]" openai chromadb faiss-cpu
```

- Use virtualenv/venv, Poetry, or pip-tools for dependency isolation and reproducible installs. Prefer a lockfile for CI builds (poetry.lock or requirements.txt).
- Keep provider API keys and credentials in environment variables or a secret store (Azure Key Vault, HashiCorp Vault). Do not commit secrets.
- Official docs (bookmark): https://python.langchain.com/

## Pinning and versions

LangChain evolves quickly. Pin a tested minor version in `pyproject.toml` or `requirements.txt`.

Example (requirements.txt):

```
langchain==0.3.<your-tested>
chromadb>=0.3,<1.0
faiss-cpu==1.7.3
```

Adjust versions after local verification — changes between minor releases can be breaking.

## Suggested repo layout

```
src/
  app/            # application entry points
  models/         # domain models / dataclasses
  agents/         # agent definitions and tool adapters
  prompts/        # canonical prompt templates (files)
  services/       # LLM wiring, retrievers, adapters
  tests/          # unit & integration tests
examples/         # minimal examples and notebooks
scripts/
docker/
pyproject.toml or requirements.txt
README.md
```

## Core concepts & patterns

- LLM client factory: centralize provider configs (API keys), timeouts, retries, and telemetry. Provide a single place to switch providers or client settings.
- Prompt templates: store templates under `prompts/` and load via a safe helper. Keep templates small and testable.
- Chains vs Agents: prefer Chains for deterministic pipelines (RAG, summarization). Use Agents when you require planning or dynamic tool selection.
- Tools: implement typed adapter interfaces for tools; validate inputs and outputs strictly.
- Memory: default to stateless design. When memory is needed, store minimal context and document retention/erasure policies.
- Retrievers: build retrieval + rerank pipelines. Keep vectorstore schema stable (id, text, metadata).

### Patterns

- Callbacks & tracing: use LangChain callbacks and integrate with LangSmith or your tracing system to capture request/response lifecycle.
- Separation of concerns: keep prompt construction, LLM wiring, and business logic separate to simplify testing and reduce accidental prompt changes.

## Embeddings & vectorstores

- Use consistent chunking and metadata fields (source, page, chunk_index).
- Cache embeddings to avoid repeated cost for unchanged documents.
- Local/dev: Chroma or FAISS. Production: managed vector DBs (Pinecone, Qdrant, Milvus, Weaviate) depending on scale and SLAs.

## Prompt engineering & governance

- Store canonical prompts under `prompts/` and reference them by filename from code.
- Write unit tests that assert required placeholders exist and that rendered prompts fit expected patterns (length, variables present).
- Maintain a CHANGELOG for prompt and schema changes that affect behavior.

## Chat models

### Overview

Large Language Models (LLMs) power a wide range of language tasks (generation, summarization, QA, etc.). Modern LLMs are commonly exposed via a chat model interface that accepts a list of messages and returns a message or list of messages.

Newer chat models include advanced capabilities:

- Tool calling: native APIs that allow models to call external tools/services (see tool calling guides).
- Structured output: ask models to emit JSON or schema-shaped responses (use `with_structured_output` where available).
- Multimodality: support for non-text inputs (images, audio) in some models — consult provider docs for support and limits.

### Features & benefits

LangChain offers a consistent interface for chat models with additional features for monitoring, debugging, and optimization:

- Integrations with many providers (OpenAI, Anthropic, Ollama, Azure, Google Vertex, Amazon Bedrock, Hugging Face, Cohere, Groq, etc.). See the chat model integrations in the official docs for the current list.
- Support for LangChain's message format and OpenAI-style message format.
- Standardized tool-calling API for binding tools and handling tool requests/results.
- `with_structured_output` helper for structured responses.
- Async, streaming, and optimized batching support.
- LangSmith integration for tracing/monitoring.
- Standardized token usage reporting, rate limiting hooks, and caching support.

### Integrations

Integrations are either:

1. Official: packaged `langchain-<provider>` integrations maintained by the LangChain team or provider.
2. Community: contributed integrations (in `langchain-community`).

Chat models typically follow a naming convention with a `Chat` prefix (e.g., `ChatOpenAI`, `ChatAnthropic`, `ChatOllama`). Models without the `Chat` prefix (or with an `LLM` suffix) often implement the older string-in/string-out interface and are less preferred for modern chat workflows.

### Interface

Chat models implement `BaseChatModel` and support the Runnable interface: streaming, async, batching, and more. Many operations accept and return LangChain `messages` (roles like `system`, `user`, `assistant`). See the BaseChatModel API reference for details.

Key methods include:

- `invoke(messages, ...)` — send a list of messages and receive a response.
- `stream(messages, ...)` — stream partial outputs as tokens arrive.
- `batch(inputs, ...)` — batch multiple requests.
- `bind_tools(tools)` — attach tool adapters for tool calling.
- `with_structured_output(schema)` — helper to request structured responses.

### Inputs and outputs

- LangChain supports its own message format and OpenAI's message format; pick one consistently in your codebase.
- Messages include a `role` and `content` blocks; content can include structured or multimodal payloads where supported.

### Standard parameters

Commonly supported parameters (provider-dependent):

- `model`: model identifier (eg. `gpt-4o`, `gpt-3.5-turbo`).
- `temperature`: randomness control (0.0 deterministic — 1.0 creative).
- `timeout`: seconds to wait before canceling.
- `max_tokens`: response token limit.
- `stop`: stop sequences.
- `max_retries`: retry attempts for network/limit failures.
- `api_key`, `base_url`: provider auth and endpoint configuration.
- `rate_limiter`: optional BaseRateLimiter to space requests and avoid provider quota errors.

> Note: Not all parameters are implemented by every provider. Always consult the provider integration docs.

### Tool calling

Chat models can call tools (APIs, DBs, system adapters). Use LangChain's tool-calling APIs to:

- Register tools with strict input/output typing.
- Observe and log tool call requests and results.
- Validate tool outputs before passing them back to the model or executing side effects.

See the tool-calling guide in the LangChain docs for examples and safe patterns.

### Structured outputs

Use `with_structured_output` or schema-enforced methods to request JSON or typed outputs from the model. Structured outputs are essential for reliable extraction and downstream processing (parsers, DB writes, analytics).

### Multimodality

Some models support multimodal inputs (images, audio). Check provider docs for supported input types and limitations. Multimodal outputs are rare — treat them as experimental and validate rigorously.

### Context window

Models have a finite context window measured in tokens. When designing conversational flows:

- Keep messages concise and prioritize important context.
- Trim old context (summarize or archive) outside the model when it exceeds the window.
- Use a retriever + RAG pattern to surface relevant long-form context instead of pasting large documents into the chat.

## Advanced topics

### Rate-limiting

- Use `rate_limiter` when initializing chat models to space calls.
- Implement retry with exponential backoff and consider fallback models or degraded modes when throttled.

### Caching

- Exact-input caching for conversations is often ineffective. Consider semantic caching (embedding-based) for repeated meaning-level queries.
- Semantic caching introduces dependency on embeddings and is not universally suitable.
- Cache only where it reduces cost and meets correctness requirements (e.g., FAQ bots).

## Best practices

- Use type hints and dataclasses for public APIs.
- Validate inputs before calling LLMs or tools.
- Load secrets from secret managers; never log secrets or unredacted model outputs.
- Deterministic tests: mock LLMs and embedding calls.
- Cache embeddings and frequent retrieval results.
- Observability: log request_id, model name, latency, and sanitized token counts.
- Implement exponential backoff and idempotency for external calls.

## Security & privacy

- Treat model outputs as untrusted. Sanitize before executing generated code or system commands.
- Validate any user-supplied URLs and inputs to avoid SSRF and injection attacks.
- Document data retention and add an API to erase user data on request.
- Limit stored PII and encrypt sensitive fields at rest.

## Testing

- Unit tests: mock LLM and embedding clients; assert prompt rendering and chain wiring.
- Integration tests: use sandboxed providers or local mocks to keep costs low.
- Regression tests: snapshot prompt outputs with mocked LLM responses; update fixtures intentionally and with review.

Suggested libraries:

- `pytest`, `pytest-mock` for testing
- `responses` or `requests-mock` for HTTP provider mocks

CI: add a low-cost job that runs prompt-template tests using mocks to detect silent regressions.

## Example — minimal chain

```python
import os
from langchain import OpenAI, PromptTemplate, LLMChain

llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), temperature=0.0)
template = PromptTemplate(input_variables=["q"], template="Answer concisely: {q}")
chain = LLMChain(llm=llm, prompt=template)

resp = chain.run({"q": "What is LangChain?"})
print(resp)
```

Note: LangChain provides both LLM and chat-model APIs (e.g., `ChatOpenAI`). Prefer the interface that matches your provider and desired message semantics.

## Agents & tools

- Use Agents (`Agent`, `AgentExecutor`) only when dynamic planning or tool orchestration is required.
- Sandbox and scope tools: avoid arbitrary shell or filesystem operations from model outputs. Validate and restrict tool inputs.
- Follow the official agents tutorial: https://python.langchain.com/docs/tutorials/agents/

## CI / deployment

- Pin dependencies and run `pip-audit` or `safety` in CI.
- Run tests (unit + lightweight integration) on PRs.
- Containerize with resource limits and provide secrets via your platform's secret manager (do not commit `.env` files).

Example Dockerfile (minimal):

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "-m", "your_app.entrypoint"]
```

## Observability & cost control

- Track tokens and cost per request; implement per-request budget checks in production.
- Integrate LangSmith for tracing and observability: https://python.langchain.com/docs/ecosystem/langsmith/

## Documentation & governance

- Keep prompts and templates under version control in `prompts/`.
- Add `examples/` with Jupyter notebooks or scripts that demonstrate RAG, a simple agent, and callback handlers.
- Add README sections explaining local run, tests, and secret configuration.
