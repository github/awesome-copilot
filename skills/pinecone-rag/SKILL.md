---
name: pinecone-rag
description: >
  Build production RAG pipelines and persistent agent memory using Pinecone as
  the vector database backend. ALWAYS USE THIS SKILL when the user mentions
  Pinecone, wants to index documents for semantic search, build a
  retrieval-augmented generation system, store agent memory across sessions,
  implement hybrid search, or connect an LLM to a searchable knowledge base —
  even if they don't say "Pinecone" explicitly. Also use when the user asks
  about vector databases for RAG, namespace isolation for multi-tenant agents,
  embedding pipelines, or scaling a knowledge base beyond what local storage
  can handle. DO NOT use for local-only vector stores (Chroma, FAISS, pgvector)
  or pure keyword search with no semantic component.
license: Apache-2.0
compatibility: "pinecone>=6.0.0, Python 3.10+"
---

# Pinecone RAG Skill

This skill guides you through building a production RAG pipeline or persistent
agent memory system using Pinecone. Follow the workflow from start to finish —
don't skip steps or jump to code before understanding what the user actually
needs.

## Before you start — ask one question

Before writing any code, identify which of these two use cases applies:

**A — RAG over documents**: User wants to index a corpus (PDFs, docs, code,
web pages) and retrieve relevant chunks to ground LLM responses.

**B — Agent memory**: User wants an agent to remember facts, decisions, or
context across sessions or across multiple agents sharing a knowledge base.

The setup is similar but the namespace strategy and retrieval patterns differ.
If the user hasn't said, ask: *"Is this for document retrieval, agent memory,
or both?"* Then follow the relevant workflow below.

---

## Step 1 — Choose your index configuration

Pick the index type before writing any code. Getting this wrong means
re-creating the index later.

**Serverless (recommended for most cases)**
```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="PINECONE_API_KEY")

if "my-index" not in pc.list_indexes().names():
    pc.create_index(
        name="my-index",
        dimension=1536,        # must match your embedding model exactly
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
index = pc.Index("my-index")
```

**Pod-based (for consistent high-throughput production)**
```python
from pinecone import PodSpec

pc.create_index(
    name="my-index-prod",
    dimension=1536,
    metric="cosine",
    spec=PodSpec(environment="us-east1-gcp", pod_type="p1.x1")
)
```

**Dimension quick reference — match this exactly to your embedding model:**
| Model | Dimension |
|---|---|
| `text-embedding-3-small` | 1536 |
| `text-embedding-3-large` | 3072 |
| `voyage-3` / `voyage-multimodal-3` | 1024 |
| `BAAI/bge-large-en-v1.5` | 1024 |
| `intfloat/multilingual-e5-large` (Arabic, Malay, Chinese) | 1024 |

> **Checkpoint**: Index exists, dimension matches embedding model, `index.describe_index_stats()` returns without error.

---

## Step 2 — Embed and upsert documents

Always batch upserts — never upsert one vector at a time.

```python
from openai import OpenAI

client = OpenAI()

def embed(texts: list[str]) -> list[list[float]]:
    res = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [r.embedding for r in res.data]

def upsert_docs(index, docs: list[dict], namespace: str = "default"):
    """docs = [{"id": "...", "text": "...", "metadata": {...}}]"""
    BATCH = 100
    for i in range(0, len(docs), BATCH):
        batch = docs[i:i + BATCH]
        vecs = [
            {
                "id": d["id"],
                "values": emb,
                "metadata": {**d.get("metadata", {}), "text": d["text"]}
            }
            for d, emb in zip(batch, embed([d["text"] for d in batch]))
        ]
        index.upsert(vectors=vecs, namespace=namespace)
```

**Always store the original text in metadata** — this avoids a second lookup
at retrieval time.

> **Checkpoint**: `index.describe_index_stats()` shows vector count > 0 in the
> target namespace.

---

## Step 3 — Choose retrieval strategy

### Dense (semantic) search — use for most cases
```python
def search(index, query: str, top_k: int = 5, namespace: str = "default",
           filter: dict = None) -> list[dict]:
    [q_emb] = embed([query])
    results = index.query(
        vector=q_emb, top_k=top_k, namespace=namespace,
        include_metadata=True, filter=filter
    )
    return [{"text": m.metadata["text"], "score": m.score, "id": m.id}
            for m in results.matches]
```

### Hybrid search (semantic + BM25 keyword) — use when corpus has exact terminology
Use hybrid when the domain has precise terms that semantic search misses:
legal citations, medical codes, product SKUs, API method names.

```python
from pinecone_text.sparse import BM25Encoder

bm25 = BM25Encoder().default()
bm25.fit([d["text"] for d in docs])  # fit once on your corpus

def hybrid_search(index, query: str, top_k: int = 5, alpha: float = 0.7):
    """alpha=1.0 is pure dense; alpha=0.0 is pure sparse."""
    dense = [v * alpha for v in embed([query])[0]]
    sparse_raw = bm25.encode_queries(query)
    sparse = {
        "indices": sparse_raw["indices"],
        "values": [v * (1 - alpha) for v in sparse_raw["values"]]
    }
    return index.query(vector=dense, sparse_vector=sparse,
                       top_k=top_k, include_metadata=True).matches
```

### Metadata filtering — use to scope results before semantic ranking
```python
# Exact match
results = index.query(vector=emb, filter={"source": {"$eq": "confluence"}})

# Combined filter
results = index.query(vector=emb, filter={
    "$and": [
        {"category": {"$eq": "engineering"}},
        {"language": {"$in": ["en", "ar"]}}
    ]
})
```

> **Checkpoint**: A test query returns relevant results with scores > 0.7 for
> clearly matching content.

---

## Step 4A — Full RAG pipeline (document use case)

```python
def rag_answer(index, question: str, namespace: str = "default",
               model: str = "gpt-4o-mini") -> str:
    hits = search(index, question, top_k=5, namespace=namespace)
    context = "\n\n".join(h["text"] for h in hits)

    return client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer using only the provided context. "
                    "If the answer isn't in the context, say so.\n\n"
                    f"Context:\n{context}"
                )
            },
            {"role": "user", "content": question}
        ]
    ).choices[0].message.content
```

---

## Step 4B — Agent memory (memory use case)

Use namespaces to isolate each agent's or user's memories completely.
Namespace per agent prevents memory bleed across users or sessions.

```python
import time, hashlib

def remember(index, agent_id: str, content: str,
             memory_type: str = "fact"):
    """Store a memory for an agent."""
    mem_id = hashlib.md5(
        f"{agent_id}{content}{time.time()}".encode()
    ).hexdigest()
    [emb] = embed([content])
    index.upsert(
        vectors=[{
            "id": mem_id,
            "values": emb,
            "metadata": {
                "text": content,
                "type": memory_type,
                "timestamp": time.time(),
                "agent_id": agent_id
            }
        }],
        namespace=f"agent_{agent_id}"
    )

def recall(index, agent_id: str, query: str,
           top_k: int = 5) -> list[str]:
    """Recall relevant memories for an agent."""
    return [h["text"] for h in
            search(index, query, top_k=top_k,
                   namespace=f"agent_{agent_id}")]

def forget(index, agent_id: str):
    """Wipe all memories for an agent (e.g., on user request)."""
    index.delete(delete_all=True, namespace=f"agent_{agent_id}")
```

---

## Step 5 — Wire it together and test end to end

Run a quick smoke test before integrating into the larger system:

```python
# Smoke test
upsert_docs(index, [
    {"id": "t1", "text": "Pinecone is a vector database for semantic search."},
    {"id": "t2", "text": "RAG combines retrieval with language model generation."},
])

hits = search(index, "What is Pinecone?")
assert hits[0]["score"] > 0.7, f"Expected high similarity, got {hits[0]['score']}"
print("Smoke test passed:", hits[0]["text"])
```

> **Checkpoint**: Smoke test passes. End-to-end: index → upsert → query →
> LLM response works without errors.

---

## Common pitfalls — fix these before they become bugs

- **Dimension mismatch**: always verify `len(embed(["test"])[0])` matches
  the index dimension before your first upsert.
- **Missing text in metadata**: if you don't store `"text"` in metadata,
  you'll need a second lookup to get the actual content at query time.
- **Single-vector upserts in a loop**: always batch in chunks of 100.
- **No namespace strategy**: decide upfront — one namespace per user/agent
  prevents cross-tenant data leaks that are hard to fix later.
- **Fitting BM25 on a small corpus**: BM25 needs a representative corpus to
  build good term frequencies. Fit on at least a few hundred documents.

## When NOT to use this skill

Use a different approach when:
- The dataset fits in memory and latency doesn't matter → use FAISS or Chroma
- You're already on PostgreSQL and want to avoid a new service → use pgvector
- You need sub-5ms p99 latency with no external API calls → local vector store
- The user explicitly wants a different vector DB (Weaviate, Qdrant, etc.)