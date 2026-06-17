# Retrieval Instructions

This file defines how the agent answers queries using the two-layer retrieval strategy:
**wiki-first** (fast path), then **graph traversal with evidence** (deep path).

---

## Overview

Retrieval is a 7-step process:

1. Parse the query
2. **Check the wiki first** (fast path)
3. Find seed nodes in the graph
4. Expand the graph via BFS
5. Prune noisy nodes
6. Build the subgraph with provenance
7. Return structured context

---

## Step 1: Parse the Query

Read the query string and identify:
- **Key noun phrases**: potential entity names (e.g., "system crash", "memory leak")
- **Keywords**: individual meaningful words (e.g., "crash", "leak", "memory")
- Normalize all terms to **lowercase**

Ignore stopwords (e.g., "the", "a", "is", "why", "does", "how", "what").

---

## Step 2: Check the Wiki First (Fast Path)

Before touching the graph, search the wiki. The wiki contains compiled knowledge —
cross-references already resolved, contradictions flagged, syntheses written.

```python
from scripts.tools import wiki_store

results = wiki_store.search_wiki(query)
```

For each relevant result, read the page:

```python
content = wiki_store.read_page_by_slug(result["slug"])
```

**If the wiki has a sufficient answer:**
- Synthesize from wiki pages.
- Cite the source pages (e.g., "According to [[memory-leak]] and [[system-crash]]...").
- File the answer as a new wiki topic page if it's valuable and not already captured:
  ```python
  wiki_store.write_page(category="topic", title="Why System Crashes", content=..., summary=...)
  ```
- **Return early** — no graph traversal needed.

**If the wiki answer is incomplete or missing:** proceed to Step 3.

---

## Step 3: Find Seed Nodes

Call `index_store.search(query)` with the original query string.

This returns node IDs matching entity names or keywords.

If no seed nodes are found:
- Try searching with individual keywords from Step 1.
- If still no results, return an empty subgraph: "No relevant entities found."

---

## Step 4: Expand the Graph (BFS)

Call `retrieval_engine.retrieve(seed_node_ids, depth=2)`.

BFS from seed nodes:
- **Depth 1**: direct neighbors
- **Depth 2**: neighbors of neighbors

Rules:
- Only traverse edges with confidence ≥ MIN_CONFIDENCE (from config.py)
- Do NOT traverse beyond depth 2
- Collect all visited node IDs

---

## Step 5: Prune Nodes

- Limit total nodes to MAX_NODES (from config.py)
- Prioritize:
  1. Seed nodes (always include)
  2. Nodes at depth 1
  3. Nodes at depth 2 (as space allows)
- Remove nodes only weakly connected (edge confidence < MIN_CONFIDENCE)

---

## Step 6: Build the Subgraph with Provenance

For a standard query, call:

```python
subgraph = skill.query(query)
# Returns: {"nodes": {node_id: {name, type, source_document, source_chunks}},
#           "edges": [{source, target, type, confidence, source_document, supporting_text, chunk_id}]}
```

For queries requiring evidence (citations, fact-checking), call:

```python
result = skill.query_with_evidence(query)
# Returns:
# {
#   "query": str,
#   "subgraph": {"nodes": {...}, "edges": [...]},
#   "supporting_documents": [
#     {
#       "doc_id": str,
#       "doc_title": str,
#       "supporting_chunks": [{"chunk_id": str, "text": str}, ...]
#     }
#   ],
#   "evidence_chain": "memory leak --[causes]--> system crash"
# }
```

---

## Step 7: Return Structured Context

Return the result with:
- **Subgraph**: nodes + edges (the graph answer)
- **Supporting documents**: source chunks that prove each relation
- **Evidence chain**: human-readable path summary
- **Wiki references**: links to relevant wiki pages found in Step 2

**If valuable, file the answer back into the wiki:**

```python
wiki_store.write_page(
    category="topic",
    title=query,
    content=f"# {query}\n\n**Evidence chain:** {result['evidence_chain']}\n\n...",
    summary="...",
)
```

This way, future queries on the same topic find the answer instantly in the wiki.

---

## Rules

- NEVER fabricate nodes or edges not present in the graph
- NEVER traverse deeper than depth 2
- ALWAYS check the wiki before the graph (wiki-first)
- Always include seed nodes in the result, even if they have no edges
- Prefer edges with higher confidence when pruning
- File valuable answers back into the wiki as topic pages
- Return an empty subgraph (not an error) if no relevant nodes are found
