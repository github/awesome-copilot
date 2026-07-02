# ai.rag-retrieval-ts

## purpose

Retrieval-augmented generation using function calling with search backends.

## rules

1. Implement RAG in Teams AI v2 by registering a search function on `ChatPrompt` via `.function()`. The LLM decides when to call the search tool based on user queries, retrieves relevant documents, and incorporates them into its response. This is the canonical RAG pattern in the SDK.
2. Define a search function with a `query` parameter of type `string`. The function body performs the search against your index and returns an array of result objects containing at minimum `title` and `content` fields.
3. Use `fuse.js` for lightweight in-memory full-text search. Initialize a `Fuse` instance with your document array and configure `keys` (fields to search) and `threshold` (0.0 = exact match, 1.0 = match anything; 0.3-0.4 is a good default).
4. Format search results as structured objects the LLM can reason about. Return `{ title, content }` pairs so the model can cite sources by name. Limit results to 3-5 documents to avoid overwhelming the context window.
5. Set the system instructions to tell the LLM to always cite sources. For example: `'Answer questions using the search tool. Always cite sources as [1], [2], etc.'` Without explicit citation instructions, the LLM will not reference sources consistently.
6. After receiving the LLM response, annotate it with `.addCitation(index, { name, abstract })` for each source referenced. Map citation indices to the search results that were actually used in the response.
7. Always pair citations with `.addAiGenerated()` so the Teams client renders both the AI marker and the citation annotations correctly.
8. For production, replace `fuse.js` with a scalable search backend (Azure AI Search, Elasticsearch, Pinecone). The function handler signature stays the same -- only the search implementation inside changes.
9. Enable auto function calling (the default) for RAG so the LLM can seamlessly call the search function, receive results, and generate a cited response in a single `prompt.send()` call.
10. Index your documents with meaningful titles and chunked content. Large documents should be split into sections of 500-1000 tokens each. Include metadata (title, section heading, URL) so the LLM can produce useful citations.

## patterns

### RAG with fuse.js in-memory search

```typescript
import Fuse from 'fuse.js';
import { ChatPrompt } from '@microsoft/teams.ai';
import { MessageActivity } from '@microsoft/teams.api';

// Build a searchable index
const docs = [
  { title: 'Getting Started', content: 'Install the SDK with npm install @microsoft/teams.ai...' },
  { title: 'Authentication Guide', content: 'Configure OAuth with clientId and clientSecret...' },
  { title: 'Adaptive Cards', content: 'Use CardFactory to create rich card layouts...' },
];

const fuse = new Fuse(docs, {
  keys: ['title', 'content'],
  threshold: 0.4,
});

const prompt = new ChatPrompt({
  model,
  instructions: 'Answer questions using the search tool. Always cite sources as [1], [2], etc.',
})
  .function(
    'search',
    'Search documentation for relevant information',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    async ({ query }: { query: string }) => {
      const results = fuse.search(query);
      return results.map((r) => ({
        title: r.item.title,
        content: r.item.content,
      }));
    }
  );
```

### Sending RAG response with citations

```typescript
app.on('message', async ({ send, activity }) => {
  const result = await prompt.send(activity.text);

  if (result.content) {
    const msg = new MessageActivity(result.content)
      .addAiGenerated()
      .addCitation(1, { name: 'Getting Started', abstract: 'Installation and setup guide' })
      .addCitation(2, { name: 'Authentication Guide', abstract: 'OAuth configuration reference' });

    await send(msg);
  }
});
```

### RAG with streaming and feedback

```typescript
app.on('message', async ({ stream, activity }) => {
  stream.update('Searching documentation...');

  const result = await prompt.send(activity.text, {
    onChunk: (chunk: string) => {
      stream.emit(
        new MessageActivity(chunk)
          .addAiGenerated()
          .addFeedback()
      );
    },
  });

  // Citations are added to the final streamed message automatically
  // For dynamic citations based on actual search results, track them in the handler
});
```

## pitfalls

- **Not instructing the LLM to cite sources**: Without explicit instructions like `"Always cite sources as [1], [2]"`, the LLM will use search results but not reference them by number, making citation annotations meaningless.
- **Returning too many search results**: Flooding the context with 20+ documents wastes tokens and confuses the model. Limit to 3-5 top results. Use relevance scoring (fuse.js `score`) to filter.
- **Hardcoding citation indices**: If you always add `addCitation(1, ...)` and `addCitation(2, ...)` regardless of which documents the LLM actually cited, users see irrelevant citations. Track which sources the search function returned and map them dynamically.
- **Using fuse.js for large document sets**: `fuse.js` loads all documents into memory and performs linear search. For more than a few hundred documents, switch to an external search service (Azure AI Search, Elasticsearch).
- **Not chunking large documents**: Passing a 10,000-token document as a single search result consumes most of the context window. Split documents into 500-1000 token chunks with overlapping context.
- **Forgetting `.addAiGenerated()` with citations**: Citations without the AI-generated marker may not render correctly in the Teams client. Always chain both methods.
- **Search function returning raw HTML or markdown**: Strip formatting from indexed content. The LLM handles raw text better than markup, and markup tokens waste context budget.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [Fuse.js -- Lightweight Fuzzy Search](https://www.fusejs.io/)
- [RAG Pattern -- Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [Azure AI Search -- Vector Search](https://learn.microsoft.com/en-us/azure/search/vector-search-overview)
- [@microsoft/teams.ai -- npm](https://www.npmjs.com/package/@microsoft/teams.ai)

## instructions

This expert covers implementing retrieval-augmented generation (RAG) in Teams AI v2 using function calling with search backends. Use it when you need to:

- Implement the RAG pattern by registering a search function on `ChatPrompt`
- Build a lightweight in-memory search index with `fuse.js`
- Format search results for LLM consumption with title and content fields
- Annotate LLM responses with source citations using `MessageActivity.addCitation()`
- Instruct the LLM to cite sources in its responses
- Combine RAG with streaming and feedback buttons

Pair with `ai.function-calling-implementation-ts.md` for search functions, `ai.citations-feedback-ts.md` for citations, and `ai.rag-vectorstores-ts.md` for vector search backends.

## research

Deep Research prompt:

"Write a micro expert on RAG for Teams AI (TypeScript). Provide an architecture pattern where the model calls a search tool (function calling) and returns answers with citations. Cover indexing choices (simple in-memory like Fuse.js vs external vector DB), chunking, citation mapping, and guardrails. Include a minimal working example with a local search index."
