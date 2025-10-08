---

description: "Instructions for using LangChain with Python"

# Chat models

LangChain's chat model integration centers on the `ChatOpenAI` class and similar APIs for other providers. For Copilot, focus on actionable usage:

- Use `ChatOpenAI` for OpenAI chat models (GPT-3.5, GPT-4):

  ```python
  from langchain.chat_models import ChatOpenAI
  from langchain.schema import HumanMessage, SystemMessage

  chat = ChatOpenAI(model="gpt-4", temperature=0)
  messages = [
      SystemMessage(content="You are a helpful assistant."),
      HumanMessage(content="What is LangChain?")
  ]
  response = chat(messages)
  print(response.content)
  ```

- Compose messages as a list of `SystemMessage`, `HumanMessage`, and optionally `AIMessage` objects.
- For RAG, combine chat models with retrievers/vectorstores for context injection.
- Use `streaming=True` for real-time token streaming (if supported).
- Use `tools` argument for function/tool calling (OpenAI, Anthropic, etc.).
- Use `response_format="json"` for structured outputs (OpenAI models).

Best practices:

- Always validate model outputs before using them in downstream tasks.
- Prefer explicit message types for clarity and reliability.
- For Copilot, provide clear, actionable prompts and document expected outputs.

Reference: [LangChain Chat Models Docs](https://python.langchain.com/docs/integrations/chat/)

...existing code...

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

## Vector stores (LangChain-specific)

- Use LangChain's vectorstore integrations for semantic search, retrieval-augmented generation (RAG), and document similarity workflows.
- Always initialize vectorstores with a supported embedding model (e.g., OpenAIEmbeddings, HuggingFaceEmbeddings).
- Prefer official integrations (e.g., Chroma, FAISS, Pinecone, Qdrant, Weaviate) for production; use InMemoryVectorStore for tests and demos.
- Store documents as LangChain `Document` objects with `page_content` and `metadata`.
- Use `add_documents(documents, ids=...)` to add/update documents. Always provide unique IDs for upserts.
- Use `delete(ids=...)` to remove documents by ID.
- Use `similarity_search(query, k=4, filter={...})` to retrieve top-k similar documents. Use metadata filters for scoped search.
- For RAG, connect your vectorstore to a retriever and chain with an LLM (see LangChain Retriever and RAGChain docs).
- For advanced search, use vectorstore-specific options: Pinecone supports hybrid search and metadata filtering; Chroma supports filtering and custom distance metrics.
- Always validate the vectorstore integration and API version in your environment; breaking changes are common between LangChain releases.
- Example (InMemoryVectorStore):

```python
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_openai.embeddings import OpenAIEmbeddings

embedding_model = OpenAIEmbeddings(api_key="...")
vector_store = InMemoryVectorStore(embedding=embedding_model)

documents = [
    Document(page_content="LangChain enables RAG workflows.", metadata={"source": "doc1"}),
    Document(page_content="Vector search finds semantically similar text.", metadata={"source": "doc2"}),
]
vector_store.add_documents(documents=documents, ids=["doc1", "doc2"])

results = vector_store.similarity_search("What is RAG?", k=2)
for doc in results:
    print(doc.page_content, doc.metadata)
```

- For production, prefer persistent vectorstores (Chroma, Pinecone, Qdrant, Weaviate) and configure authentication, scaling, and backup as per provider docs.
- Reference: https://python.langchain.com/docs/integrations/vectorstores/

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
