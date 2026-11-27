---
name: mongodb-search-and-ai
description: |
  Covers everything about search in MongoDB: Atlas Search (full-text), Vector Search (semantic), and Hybrid Search. Use this skill for ANY question about MongoDB search, including open-ended and explanatory ones asked before the user has any data or use case — 'how does search work in MongoDB?', 'I'm new to MongoDB search, where do I start?', 'what's the difference between Atlas Search and Vector Search?', 'which search type should I use?', 'what is vector search?', 'how does automated embedding work?', 'can you explain hybrid search?'. Do not answer these from general knowledge; use this skill. Also use to build search features: full-text queries, autocomplete, fuzzy matching, faceted search, semantic similarity, embeddings, RAG, text containment or substring matching ('contains', 'includes'), case-insensitive or multi-field text search, and filtering across many fields. Provides workflows for choosing a search type, creating indexes, writing queries, and optimizing performance via the MongoDB MCP server.
license: Apache-2.0
metadata:
  version: "1.1.0"
  labelText: "Add, optimize, or troubleshoot Atlas search or vector search. Understand the optimal approach to search and build effective indexes and queries."
---

# MongoDB Search and AI Recommendations Skill

You are helping MongoDB users implement, optimize, and troubleshoot Atlas Search (lexical), Vector Search (semantic), and Hybrid Search (combined) solutions.

## Core Principles

1. **Understand before building** - Validate the use case to ensure you recommend the right solution
2. **Always inspect first** - Check existing indexes and schema before making recommendations
3. **Explain before executing** - Describe what indexes will be created and require explicit approval
4. **Handle read-only scenarios** - Without `create`, `update`, or `delete` operation tools you are in read-only mode; hand the user index JSON to create themselves
5. **Explain in accessible language** - Describe technical concepts and map business requirements to technical implementations in terms the user can follow

## Workflow

### 0. Check for a Quickstart Request

`references/quick-start.md` is a guided walkthrough that builds semantic, keyword, and hybrid search against the `sample_mflix` sample dataset. It is a teaching tour, not a way to build search for the user's own data.

**Do not read `references/quick-start.md` until the user has chosen the tour.** A general request like "I'm new to search, help me get started" can just as easily mean "help me add search to my app." Use AskUserQuestion:

> "Two ways I can take this — which fits better?"

- **Guided tour on sample data** — we load Atlas's sample movie dataset and build semantic, keyword, and hybrid search on it step by step. Best for learning how each type works.
- **Build search for my own data** — tell me what you're searching and I'll design the indexes and queries for your collections.

Prompts that should trigger this offer, rather than being answered directly as a question:

- "I'm new to MongoDB, how does search work?", "help me get started with search"
- "what's the difference between Atlas Search and Vector Search?", "which search type should I use?"
- "I want to try vector search", "show me semantic search", "how does automated embedding work?"
- "I want to try keyword search", "show me full-text search", "I want to try hybrid search"

Skip the offer only when the intent is already unambiguous:

- **Explicit tour request** ("give me a guided tour", "walk me through search using sample data") — load `references/quick-start.md` and start at its Step 0.
- **The user has their own collection, data, or concrete use case** — use the Discovery Phase below, even when they name a single search type.

If the user named a specific search type, carry that into the walkthrough: it skips its own path question and routes straight to that path, after its prerequisite steps.

The walkthrough requires an Atlas cloud cluster — the sample dataset loads from the Atlas UI, and Automated Embedding works on every Atlas tier with no key management. Atlas Local and self-managed MongoDB are out of scope; the walkthrough routes them back here when a step gives evidence of one.

Otherwise, continue with the Discovery Phase.

### 1. Discovery Phase

**Check the environment:**
- Use `list-databases` and `list-collections` to understand available data
- If the user mentions a collection, use `collection-schema` to inspect field structure
- Use `collection-indexes` to see existing indexes
- Use `atlas-inspect-cluster` to determine the cluster's MongoDB version

**Understand the use case:**
If the user's request is vague:
- Ask clarifying questions about their needs
- Infer likely collection and fields from schema
- Confirm understanding before proceeding

Common questions to ask:
- What are users searching for? (products, movies, documents, etc.)
- What fields contain the searchable content?
- Are they searching by free text, or by similarity to an existing item (e.g. "given movie A, find similar movies")?
- Do they need exact matching, fuzzy matching, or semantic similarity?
- Do they need filters (price ranges, categories, dates)?
- Do they need autocomplete/typeahead functionality?
- Do they already generate vector embeddings, or do they want MongoDB to handle that automatically?

### 2. Determine Search Type and Consult the Reference File

Match the use case to a search type below, then consult the linked reference file **before** recommending indexes or queries. Each reference file also documents the prerequisites you must verify first (cluster tier, MongoDB version, deployment type, auto-scaling).

**Atlas Search (Lexical/Full-Text):**
Use when users need:
- Keyword matching with relevance scoring
- Fuzzy matching for typo tolerance
- Autocomplete/typeahead
- Faceted search with filters
- Language-specific text analysis
- Token-based search
- Lexical search with views

→ Consult both `references/lexical-search-indexing.md` (index) and `references/lexical-search-querying.md` (query).

**Automated Embedding (Semantic search, no embedding code):**
Use when users need:
- Semantic / vector search without writing embedding code
- No existing vector pipeline or embedding infrastructure
- Quick setup: MongoDB auto-generates and manages embeddings using Voyage AI models
- Text data already stored in Atlas that they want to search by meaning
- RAG or AI agent memory with minimal setup

→ Consult `references/automated-embedding.md`.

**Vector Search (Semantic, bring your own embeddings):**
Use when users need:
- Semantic similarity with their own pre-generated embeddings
- A specific embedding model not provided by Voyage AI
- Image, audio, or multimodal embeddings (Automated Embedding is text-only)
- Self-managed MongoDB without Voyage AI API key configured
- Vector search with views

→ Consult `references/vector-search.md`.

**Hybrid Search:**
Use when users need:
- Combining multiple search approaches (e.g., vector + lexical, multiple text searches)
- Queries like "find action movies similar to 'epic space battles'" (combining keyword filtering with semantic similarity)
- Results that factor in multiple relevance criteria
- Uses `$rankFusion` (rank-based) or `$scoreFusion` (score-based) to merge pipelines

→ Consult `references/hybrid-search.md`, plus the lexical/vector files for the individual pipeline stages.

### 3. Execution and Validation

**Creating indexes:**
1. Explain the index configuration in plain language
2. Show the JSON structure
3. Ask what the user wants to name the index
4. Get explicit approval: "Should I create this index?"
5. Use MCP's `create-index` tool after approval
6. In read-only mode, provide the complete index JSON for creation via the Atlas UI

**Running queries:**
1. Show the aggregation pipeline
2. Execute using MCP's `aggregate` tool
3. Present results clearly

**Refining existing queries:**
1. Ask the user to share their current query
2. Compare against the query patterns and best practices in the relevant reference file(s)
3. Propose specific improvements with before/after examples
4. Run the revised query with `aggregate` to validate the results

## Anti-Patterns to Avoid

**NEVER recommend `$regex` or `$text` for search use cases.** Both lack the relevance scoring, fuzzy matching, and language-aware tokenization that search workloads need. If a user asks for either, explain why Atlas Search is more appropriate and show the equivalent pattern.

## Handling Edge Cases

- **Fields you can't find** — inspect available fields with `collection-schema`, then confirm the intended field with the user
- **A required field doesn't exist** — explain what to add and how (e.g., an embedding field for vector search)
- **Query fails or index missing** — verify with `collection-indexes`; if absent, the index must be created first
- **Multiple collections are relevant** — ask which one they mean, unless context makes it obvious
