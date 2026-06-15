# ai.rag-vectorstores-ts

## purpose

Vector store integration patterns for semantic search in RAG pipelines.

## rules

1. Use vector stores when keyword search (fuse.js, Elasticsearch BM25) is insufficient. Vector search finds semantically similar documents even when the user's query uses different words than the source text. This is the recommended approach for production RAG systems.
2. Choose a vector store based on your infrastructure: Azure AI Search (managed, integrated with Azure ecosystem), Pinecone (managed, purpose-built for vectors), pgvector (self-hosted, PostgreSQL extension), or Weaviate (self-hosted or managed, hybrid search). All integrate with the same ChatPrompt function calling pattern.
3. Generate embeddings using OpenAI's embedding models (e.g., `text-embedding-3-small` or `text-embedding-3-large`) or Azure OpenAI embedding deployments. Send document chunks to the embedding API during indexing and query text at search time.
4. Define a retrieval interface with a single `search(query: string): Promise<SearchResult[]>` method. This abstraction lets you swap vector backends without changing the ChatPrompt function registration.
5. Register the vector search as a ChatPrompt `.function()` with a `query` parameter. The handler calls your retrieval interface, formats results, and returns them to the LLM. This is identical to the keyword search pattern -- only the search implementation differs.
6. Chunk documents into 500-1000 token segments with 50-100 token overlap between chunks. Store metadata (document title, section heading, page number, URL) alongside each chunk for citation mapping.
7. Normalize search scores to a 0-1 range and filter results below a relevance threshold (e.g., 0.7). Return only the top 3-5 results to stay within the LLM context budget.
8. Cache embeddings for frequently repeated queries. Embedding API calls add latency and cost. Use a simple in-memory cache or Redis for production deployments.
9. Re-index documents on a schedule or trigger. Stale vector indices produce irrelevant search results. Automate re-indexing when source documents change.
10. Test retrieval quality independently of the LLM. Build a test suite with known queries and expected documents. Measure recall and precision before integrating with ChatPrompt.

## patterns

### Retrieval interface abstraction

```typescript
interface SearchResult {
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, string>;
}

interface IRetriever {
  search(query: string): Promise<SearchResult[]>;
}
```

### Azure AI Search vector store implementation

```typescript
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';

class AzureAISearchRetriever implements IRetriever {
  private client: SearchClient<{ title: string; content: string; embedding: number[] }>;

  constructor() {
    this.client = new SearchClient(
      process.env.AZURE_SEARCH_ENDPOINT!,
      process.env.AZURE_SEARCH_INDEX!,
      new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
    );
  }

  async search(query: string): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.getEmbedding(query);

    const results = await this.client.search(query, {
      vectorSearchOptions: {
        queries: [{
          kind: 'vector',
          vector: queryEmbedding,
          kNearestNeighborsCount: 5,
          fields: ['embedding'],
        }],
      },
      top: 5,
    });

    const docs: SearchResult[] = [];
    for await (const result of results.results) {
      docs.push({
        title: result.document.title,
        content: result.document.content,
        score: result.score ?? 0,
      });
    }

    return docs.filter((d) => d.score > 0.7);
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });
    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

### Exposing vector search as a ChatPrompt function

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';
import { MessageActivity } from '@microsoft/teams.api';

const retriever: IRetriever = new AzureAISearchRetriever();

const prompt = new ChatPrompt({
  model,
  instructions: 'Answer questions using the search tool. Always cite sources as [1], [2], etc.',
})
  .function(
    'search',
    'Search the knowledge base for relevant information',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Semantic search query' },
      },
      required: ['query'],
    },
    async ({ query }: { query: string }) => {
      const results = await retriever.search(query);
      return results.map((r, i) => ({
        index: i + 1,
        title: r.title,
        content: r.content,
      }));
    }
  );

app.on('message', async ({ send, activity }) => {
  const result = await prompt.send(activity.text);

  if (result.content) {
    const msg = new MessageActivity(result.content)
      .addAiGenerated()
      .addCitation(1, { name: 'Document A', abstract: 'Primary source' })
      .addCitation(2, { name: 'Document B', abstract: 'Supporting reference' });

    await send(msg);
  }
});
```

## pitfalls

- **Using the wrong embedding model at query time vs index time**: The same embedding model must be used for both indexing and querying. Mismatched models produce incompatible vector spaces and garbage results.
- **Not chunking documents before embedding**: Embedding a 10-page document as a single vector loses granularity. The embedding represents the average meaning, missing specific details. Chunk into 500-1000 token segments.
- **Skipping the relevance threshold**: Without filtering low-score results (e.g., `score > 0.7`), the LLM receives irrelevant documents and may hallucinate answers based on unrelated content.
- **Embedding API rate limits**: Batch embedding calls during indexing. At query time, a single embedding call per search is typical, but high-traffic bots should cache embeddings for repeated queries.
- **Hardcoding vector dimensions**: Different embedding models produce different dimensions (e.g., `text-embedding-3-small` = 1536). Configure your vector index to match the model's output dimension.
- **Not testing retrieval independently**: If the LLM gives bad answers, the problem may be retrieval (wrong documents returned) or generation (LLM misinterpreting results). Test the search function in isolation first.
- **Stale indices**: Documents change but the vector index is never updated. Implement a re-indexing pipeline triggered by document updates or on a regular schedule.
- **Ignoring hybrid search**: Pure vector search can miss exact keyword matches. Many vector stores (Azure AI Search, Weaviate) support hybrid search combining BM25 keyword scoring with vector similarity. Use hybrid mode for best results.

## references

- [Azure AI Search -- Vector Search](https://learn.microsoft.com/en-us/azure/search/vector-search-overview)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [pgvector -- PostgreSQL Extension](https://github.com/pgvector/pgvector)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)

## instructions

This expert covers integrating vector stores for semantic search in RAG pipelines with Teams AI v2. Use it when you need to:

- Choose a vector store backend (Azure AI Search, Pinecone, pgvector, Weaviate)
- Generate embeddings using OpenAI or Azure OpenAI embedding models
- Design a retrieval interface abstraction for swappable backends
- Implement a vector search function and expose it as a ChatPrompt `.function()`
- Chunk documents, manage metadata, and configure relevance thresholds
- Understand hybrid search (keyword + vector) for improved retrieval quality

Pair with `ai.rag-retrieval-ts.md` for the overall RAG pattern, and `ai.function-calling-implementation-ts.md` for exposing vector search as a function.

## research

Deep Research prompt:

"Write a micro expert on integrating vector search backends for RAG in TypeScript bots. Cover common options (Azure AI Search vector, pgvector, Pinecone, Weaviate), how to design a retrieval interface, and how to expose retrieval as a ChatPrompt tool. Keep it vendor-neutral with small pseudo-code and a checklist."
