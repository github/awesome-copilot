# Azure AI Search — .NET SDK Quick Reference

> Condensed from **azure-search-documents-dotnet**. Full patterns (FieldBuilder, hybrid search, semantic answers)
> in the **azure-search-documents-dotnet** plugin skill if installed.

## Install
```bash
dotnet add package Azure.Search.Documents
```

## Quick Start
```csharp
using Azure.Search.Documents;
using Azure.Search.Documents.Indexes;
var client = new SearchClient(new Uri(endpoint), indexName, credential);
```

## Non-Obvious Patterns
- `FieldBuilder` + model attributes (`[SimpleField]`, `[SearchableField]`, `[VectorSearchField]`) for type-safe index definitions
- `VectorizedQuery` for vector search; set via `SearchOptions.VectorSearch.Queries`
- Semantic answers: `result.Value.SemanticSearch.Answers` / captions on each result

## Best Practices
1. Use `DefaultAzureCredential` for **local development only**. In production, use `ManagedIdentityCredential` — see [auth-best-practices.md](../auth-best-practices.md)
2. Use `FieldBuilder` with model attributes for type-safe index definitions
3. Use `CreateOrUpdateIndexAsync` for idempotent index creation
4. Batch document operations for better throughput
5. Use `Select` to return only needed fields
6. Configure semantic search for natural language queries
7. Combine vector + keyword + semantic for best relevance
