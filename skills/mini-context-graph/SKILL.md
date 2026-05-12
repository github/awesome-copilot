---
name: mini-context-graph
description: |
  A persistent, compounding knowledge base combining Karpathy's LLM Wiki pattern
  with a structured knowledge graph. Ingest documents once — the LLM writes wiki
  pages, extracts entities/relations into the graph, and stores raw content for
  evidence retrieval. Knowledge accumulates and cross-references; it is never
  re-derived from scratch.
---

# Mini Context Graph Skill

## The Core Idea

Standard RAG re-discovers knowledge from scratch on every query. This skill is different:

1. **Wiki layer** — The LLM writes and maintains persistent markdown pages (summaries, entity pages, topic syntheses). Cross-references are already there. The wiki gets richer with every ingest.
2. **Graph layer** — Entities and relations are extracted once and stored as a navigable knowledge graph. BFS traversal answers structural queries without re-reading sources.
3. **Raw source layer** — Original documents are stored immutably with chunks. Provenance links tie every graph node and edge back to the exact text that supports it.

> The LLM writes; the Python tools handle all bookkeeping.

---

## Three Layers

| Layer | Where | What the LLM does | What Python does |
|-------|-------|-------------------|-----------------|
| **Raw Sources** | `data/documents.json` | Reads (never modifies) | Stores chunks + metadata |
| **Wiki** | `wiki/` (markdown) | Writes/updates pages | Manages index.md + log.md |
| **Graph** | `data/graph.json` | Extracts entities + relations | Persists, deduplicates, traverses |

---

## ⚡ Quick Start for Agents

```python
from scripts.contextgraph import ContextGraphSkill
from scripts.tools import wiki_store

skill = ContextGraphSkill()

# ===== INGEST WITH FULL RAG + WIKI =====
# 1. Read references/ingestion.md and references/ontology.md first
# 2. Extract entities and relations (LLM reasoning step)
entities = [
    {"name": "memory leak",   "type": "issue",  "supporting_text": "memory leaks cause crashes"},
    {"name": "system crash",  "type": "issue",  "supporting_text": "system crashes due to memory leaks"},
]
relations = [
    {"source": "memory leak", "target": "system crash", "type": "causes",
     "confidence": 1.0, "supporting_text": "System crashes due to memory leaks."},
]

result = skill.ingest_with_content(
    doc_id="doc_001",
    title="System Crash Analysis",
    source="/docs/incident_report.pdf",
    raw_content="System crashes due to memory leaks. Memory leaks occur when objects are not released.",
    entities=entities,
    relations=relations,
)
# result = {"doc_id": "doc_001", "chunk_count": 1, "nodes_added": 2, "edges_added": 1}

# 3. Write a wiki summary page for this document
wiki_store.write_page(
    category="summary",
    title="System Crash Analysis Summary",
    content="""---
title: System Crash Analysis
source_document: doc_001
tags: [summary, incident]
---

# System Crash Analysis

**Source:** incident_report.pdf

## Key Claims

- [[memory-leak]] causes [[system-crash]] (confidence: 1.0)

## Entities

- [[memory-leak]] (issue)
- [[system-crash]] (issue)
""",
    summary="Incident report: memory leaks cause system crashes.",
)

# ===== QUERY WITH EVIDENCE =====
result = skill.query_with_evidence("Why does the system crash?")
# Returns: {"query": ..., "subgraph": ..., "supporting_documents": [...], "evidence_chain": ...}

# ===== WIKI SEARCH (read wiki before answering) =====
pages = wiki_store.search_wiki("memory leak")
# Returns: [{slug, category, path, snippet}, ...]
```

---

## Operations

### Ingest

When a user provides a new document:

1. Read `references/ingestion.md` — entity/relation extraction rules.
2. Read `references/ontology.md` — type normalization rules.
3. Extract entities and relations using your LLM reasoning.
4. Call `skill.ingest_with_content(...)` — stores raw content + chunks + graph nodes + provenance.
5. **Write a wiki summary page** using `wiki_store.write_page(category="summary", ...)`.
6. **Update entity pages** — for each new/updated entity, write or update `wiki_store.write_page(category="entity", ...)`.
7. **Update topic pages** if the document touches an existing synthesis topic.
8. A single document ingest will typically touch 3–10 wiki pages.

### Query

When a user asks a question:

1. **Check the wiki first** — `wiki_store.search_wiki(query)` to find relevant pages. Read them.
2. If the wiki has a good answer, synthesize from wiki pages (fast path).
3. If deeper graph traversal is needed, call `skill.query_with_evidence(query)`.
4. Return the answer with evidence citations from `supporting_documents`.
5. If the answer is valuable, file it back as a new wiki topic page.

### Lint

Periodically health-check the wiki:

```python
from scripts.tools import wiki_store
issues = wiki_store.lint_wiki()
# Returns: {orphan_pages, missing_pages, broken_wikilinks, isolated_pages}
```

Ask the LLM to review and fix: broken links, orphan pages, stale claims, missing cross-references. See `references/lint.md` for full lint workflow.

---

## Ingestion Constraints

- ❌ Do NOT hallucinate entities not present in the text
- ❌ Do NOT add relations without explicit textual evidence
- ❌ Do NOT add edges with confidence < 0.6
- ✅ Provide `supporting_text` for every entity and relation — this enables provenance
- ✅ Write a wiki summary page for every ingested document
- ✅ Update existing entity pages when new information arrives
- ✅ Flag contradictions in wiki pages when new data conflicts with old claims

---

## Retrieval Constraints

- 🔒 Traversal depth MUST NOT exceed 2 (config: MAX_GRAPH_DEPTH)
- 🔒 Only edges with confidence ≥ 0.6 (config: MIN_CONFIDENCE)
- 🔒 Maximum 50 nodes returned (config: MAX_NODES)
- ❌ Do NOT fabricate nodes or edges not in the graph

---

## Full Python API Reference

| Method | Purpose | When to Use |
|--------|---------|-------------|
| `skill.ingest_with_content(doc_id, title, source, raw_content, entities, relations)` | Full RAG ingest: raw docs + graph + provenance | Every new document |
| `skill.add_node(name, node_type)` | Add single entity (no provenance) | Quick additions without a source doc |
| `skill.add_edge(source_name, target_name, relation, confidence)` | Add single relation | Quick additions without a source doc |
| `skill.query(query)` | Graph-only retrieval → subgraph | Structural queries |
| `skill.query_with_evidence(query)` | Graph + provenance → subgraph + source chunks | Queries requiring citations |
| `wiki_store.write_page(category, title, content, summary)` | Write/update a wiki page | After every ingest; after answering queries |
| `wiki_store.read_page(category, title)` | Read a wiki page | Before answering; for cross-referencing |
| `wiki_store.search_wiki(query)` | Keyword search across wiki | Fast path before graph traversal |
| `wiki_store.list_pages(category)` | List all wiki pages | Getting an overview |
| `wiki_store.get_log(last_n)` | Read recent operations | Understanding wiki history |
| `wiki_store.lint_wiki()` | Health check | Periodic maintenance |
| `documents_store.list_documents()` | List all ingested raw sources | Audit / provenance checking |
| `documents_store.search_chunks(query)` | Chunk-level search | Finding specific evidence |

---

## Design Philosophy

> "The wiki is a persistent, compounding artifact. The cross-references are already there. The synthesis already reflects everything you've read." — Karpathy

| Layer | What Happens | Who Owns It |
|-------|-----------|-------------|
| **LLM Reasoning** | Extraction, synthesis, writing wiki pages | Agent (.md guidance files) |
| **Wiki Persistence** | Index, log, file I/O | `wiki_store.py` |
| **Graph Persistence** | Dedup, index, BFS traverse | `graph_store.py`, `retrieval_engine.py` |
| **Raw Source Storage** | Immutable docs + chunks + provenance | `documents_store.py` |

The human curates sources and asks questions. The LLM writes the wiki, extracts the graph, and answers with citations. Python handles all bookkeeping.

