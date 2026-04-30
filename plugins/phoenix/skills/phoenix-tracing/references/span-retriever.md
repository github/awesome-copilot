# RETRIEVER Spans

## Purpose

RETRIEVER spans represent document/context retrieval operations (vector DB queries, semantic search, keyword search).

## Required Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `openinference.span.kind` | String | Must be "RETRIEVER" | Yes |

## Attribute Reference

### Query

| Attribute | Type | Description |
|-----------|------|-------------|
| `input.value` | String | Search query text |

### Document Schema

| Attribute Pattern | Type | Description |
|-------------------|------|-------------|
| `retrieval.documents.{i}.document.id` | String | Unique document identifier |
| `retrieval.documents.{i}.document.content` | String | Document text content |
| `retrieval.documents.{i}.document.score` | Float | Relevance score (0-1 or distance) |
| `retrieval.documents.{i}.document.metadata` | String (JSON) | Document metadata |

### Flattening Pattern for Documents

Documents are flattened using zero-indexed notation:

```
retrieval.documents.0.document.id
retrieval.documents.0.document.content
retrieval.documents.0.document.score
retrieval.documents.1.document.id
retrieval.documents.1.document.content
retrieval.documents.1.document.score
...
```

### Document Metadata

Common metadata fields (stored as JSON string):

```json
{
  "source": "knowledge_base.pdf",
  "page": 42,
  "section": "Introduction",
  "author": "Jane Doe",
  "created_at": "2024-01-15",
  "url": "https://example.com/doc",
  "chunk_id": "chunk_123"
}
```

**Example with metadata:**
```json
{
  "retrieval.documents.0.document.id": "doc_123",
  "retrieval.documents.0.document.content": "Machine learning is a method of data analysis...",
  "retrieval.documents.0.document.score": 0.92,
  "retrieval.documents.0.document.metadata": "{\"source\": \"ml_textbook.pdf\", \"page\": 15, \"chapter\": \"Introduction\"}"
}
```

### Ordering

Documents are ordered by index (0, 1, 2, ...). Typically:
- Index 0 = highest scoring document
- Index 1 = second highest
- etc.

Preserve retrieval order in your flattened attributes.

### Large Document Handling

For very long documents:
- Consider truncating `document.content` to first N characters
- Store full content in separate document store
- Use `document.id` to reference full content

## Examples

### Basic Vector Search

```json
{
  "openinference.span.kind": "RETRIEVER",
  "input.value": "What is machine learning?",
  "retrieval.documents.0.document.id": "doc_123",
  "retrieval.documents.0.document.content": "Machine learning is a subset of artificial intelligence...",
  "retrieval.documents.0.document.score": 0.92,
  "retrieval.documents.0.document.metadata": "{\"source\": \"textbook.pdf\", \"page\": 42}",
  "retrieval.documents.1.document.id": "doc_456",
  "retrieval.documents.1.document.content": "Machine learning algorithms learn patterns from data...",
  "retrieval.documents.1.document.score": 0.87,
  "retrieval.documents.1.document.metadata": "{\"source\": \"article.html\", \"author\": \"Jane Doe\"}",
  "retrieval.documents.2.document.id": "doc_789",
  "retrieval.documents.2.document.content": "Supervised learning is a type of machine learning...",
  "retrieval.documents.2.document.score": 0.81,
  "retrieval.documents.2.document.metadata": "{\"source\": \"wiki.org\"}",
  "metadata.retriever_type": "vector_search",
  "metadata.vector_db": "pinecone",
  "metadata.top_k": 3
}
```
