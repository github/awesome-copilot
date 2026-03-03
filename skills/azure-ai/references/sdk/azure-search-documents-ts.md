# Azure AI Search — TypeScript SDK Quick Reference

> Condensed from **azure-search-documents-ts**. Full patterns (semantic config, vector profiles, autocomplete)
> in the **azure-search-documents-ts** plugin skill if installed.

## Install
```bash
npm install @azure/search-documents @azure/identity
```

## Quick Start
```typescript
import { SearchClient, SearchIndexClient, SearchIndexerClient } from "@azure/search-documents";
const searchClient = new SearchClient(endpoint, indexName, credential);
```

## Non-Obvious Patterns
- Vector search uses `vectorSearchOptions.queries` array with `kind: "vector"`
- Semantic search requires `queryType: "semantic"` + `semanticSearchOptions`
- Batch ops: `searchClient.indexDocuments({ actions: [{ upload: doc }, { delete: doc }] })`

## Best Practices
1. Use hybrid search — combine vector + text for best results
2. Enable semantic ranking — improves relevance for natural language queries
3. Batch document uploads — use `uploadDocuments` with arrays, not single docs
4. Use filters for security — implement document-level security with filters
5. Index incrementally — use `mergeOrUploadDocuments` for updates
6. Monitor query performance — use `includeTotalCount: true` sparingly in production
