---
description: 'Instructions for using LangChain with Python'
applyTo: "**/*.py"
---

# LangChain Python Instructions

These instructions guide GitHub Copilot in generating code and documentation for LangChain applications in Python. Focus on LangChain-specific patterns, APIs, and best practices.

## Runnable Interface (LangChain-specific)

LangChain's `Runnable` interface is the foundation for composing and executing chains, chat models, output parsers, retrievers, and LangGraph graphs. It provides a unified API for invoking, batching, streaming, inspecting, and composing components.

**Key LangChain-specific features:**

- All major LangChain components (chat models, output parsers, retrievers, graphs) implement the Runnable interface.
- Supports synchronous (`invoke`, `batch`, `stream`) and asynchronous (`ainvoke`, `abatch`, `astream`) execution.
- Batching (`batch`, `batch_as_completed`) is optimized for parallel API calls; set `max_concurrency` in `RunnableConfig` to control parallelism.
- Streaming APIs (`stream`, `astream`, `astream_events`) yield outputs as they are produced, critical for responsive LLM apps.
- Input/output types are component-specific (e.g., chat models accept messages, retrievers accept strings, output parsers accept model outputs).
- Inspect schemas with `get_input_schema`, `get_output_schema`, and their JSONSchema variants for validation and OpenAPI generation.
- Use `with_types` to override inferred input/output types for complex LCEL chains.
- Compose Runnables declaratively with LCEL: `chain = prompt | chat_model | output_parser`.
- Propagate `RunnableConfig` (tags, metadata, callbacks, concurrency) automatically in Python 3.11+; manually in async code for Python 3.9/3.10.
- Create custom runnables with `RunnableLambda` (simple transforms) or `RunnableGenerator` (streaming transforms); avoid subclassing directly.
- Configure runtime attributes and alternatives with `configurable_fields` and `configurable_alternatives` for dynamic chains and LangServe deployments.

**LangChain best practices:**

- Use batching for parallel API calls to LLMs or retrievers; set `max_concurrency` to avoid rate limits.
- Prefer streaming APIs for chat UIs and long outputs.
- Always validate input/output schemas for custom chains and deployed endpoints.
- Use tags and metadata in `RunnableConfig` for tracing in LangSmith and debugging complex chains.
- For custom logic, wrap functions with `RunnableLambda` or `RunnableGenerator` instead of subclassing.
- For advanced configuration, expose fields and alternatives via `configurable_fields` and `configurable_alternatives`.


- Use LangChain's chat model integrations for conversational AI:

- Import from `langchain.chat_models` or `langchain_openai` (e.g., `ChatOpenAI`).
- Compose messages using `SystemMessage`, `HumanMessage`, `AIMessage`.
- For tool calling, use `bind_tools(tools)` method.
- For structured outputs, use `with_structured_output(schema)`.

Example:
```python
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

chat = ChatOpenAI(model="gpt-4", temperature=0)
messages = [
    SystemMessage(content="You are a helpful assistant."),
    HumanMessage(content="What is LangChain?")
]
response = chat.invoke(messages)
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
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

embedding_model = OpenAIEmbeddings()
vector_store = InMemoryVectorStore(embedding=embedding_model)

documents = [Document(page_content="LangChain content", metadata={"source": "doc1"})]
vector_store.add_documents(documents=documents, ids=["doc1"])

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

LangChain offers a consistent interface for chat models with additional features for monitoring, debugging, and optimization.

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
