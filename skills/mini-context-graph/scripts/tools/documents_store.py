"""
documents_store.py — Persistent storage for raw documents and chunks (RAG layer).

Inspired by Karpathy's LLM Wiki pattern: raw sources are immutable and stored
as the ground truth. Chunks are the retrieval unit; provenance links tie graph
nodes/edges back to specific chunks.

Handles:
- Storing raw documents with metadata
- Chunking documents into overlapping text windows
- Retrieving chunks by id or by keyword search
- Persisting to data/documents.json
"""
from __future__ import annotations

import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config

_DATA_DIR = Path(os.environ.get("MINI_CONTEXT_GRAPH_DATA_DIR", str(config.DATA_DIR)))
_DOCS_FILE = _DATA_DIR / "documents.json"

_CHUNK_SIZE = 500       # characters per chunk
_CHUNK_OVERLAP = 100    # overlap between consecutive chunks

_STOPWORDS = frozenset([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "on",
    "at", "by", "for", "with", "from", "and", "or", "but", "not", "it",
    "its", "this", "that", "these", "those", "i", "you", "he", "she",
    "we", "they", "what", "which", "who", "how", "why", "when", "where",
])


def _load() -> dict:
    if _DOCS_FILE.exists():
        with open(_DOCS_FILE, "r") as f:
            return json.load(f)
    return {"documents": {}}


def _save(store: dict) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_DOCS_FILE, "w") as f:
        json.dump(store, f, indent=2)


def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


def _chunk_text(content: str, chunk_size: int = _CHUNK_SIZE, overlap: int = _CHUNK_OVERLAP) -> list[str]:
    """Split content into overlapping character windows."""
    chunks = []
    start = 0
    while start < len(content):
        end = start + chunk_size
        chunks.append(content[start:end].strip())
        if end >= len(content):
            break
        start += chunk_size - overlap
    return [c for c in chunks if c]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def add_document(
    doc_id: str,
    title: str,
    source: str,
    content: str,
) -> dict:
    """
    Store a raw document and auto-generate chunks.

    Args:
        doc_id:  Caller-supplied stable identifier (e.g. "doc_001" or a filename).
        title:   Human-readable title.
        source:  Origin path/URL (immutable provenance pointer).
        content: Full raw text to store and chunk.

    Returns:
        The stored document dict including generated chunk_ids.
    """
    store = _load()

    # Idempotent: return existing doc if already stored
    if doc_id in store["documents"]:
        return store["documents"][doc_id]

    raw_chunks = _chunk_text(content)
    chunks = []
    for i, text in enumerate(raw_chunks):
        chunks.append({
            "chunk_id": f"{doc_id}_chunk_{i:03d}",
            "index": i,
            "text": text,
        })

    doc = {
        "id": doc_id,
        "title": title,
        "source": source,
        "content": content,
        "chunks": chunks,
        "ingestion_date": datetime.now(timezone.utc).isoformat(),
    }
    store["documents"][doc_id] = doc
    _save(store)
    return doc


def get_document(doc_id: str) -> dict | None:
    """Return the full document record or None if not found."""
    store = _load()
    return store["documents"].get(doc_id)


def get_chunk(chunk_id: str) -> dict | None:
    """Return a specific chunk by its chunk_id (searches across all documents)."""
    store = _load()
    for doc in store["documents"].values():
        for chunk in doc["chunks"]:
            if chunk["chunk_id"] == chunk_id:
                return chunk
    return None


def get_chunks_for_document(doc_id: str) -> list[dict]:
    """Return all chunks for a document."""
    doc = get_document(doc_id)
    if doc is None:
        return []
    return doc["chunks"]


def search_chunks(query: str, top_k: int = 5) -> list[dict]:
    """
    Keyword search over chunk text. Returns top_k matching chunks sorted by
    term overlap (simple TF-style scoring, no embeddings required).

    Returns list of dicts with keys: chunk_id, doc_id, score, text.
    """
    store = _load()
    query_tokens = set(_tokenize(query))
    if not query_tokens:
        return []

    scored: list[tuple[float, dict]] = []
    for doc in store["documents"].values():
        for chunk in doc["chunks"]:
            chunk_tokens = set(_tokenize(chunk["text"]))
            overlap = len(query_tokens & chunk_tokens)
            if overlap > 0:
                score = overlap / len(query_tokens)
                scored.append((score, {
                    "chunk_id": chunk["chunk_id"],
                    "doc_id": doc["id"],
                    "doc_title": doc["title"],
                    "score": round(score, 4),
                    "text": chunk["text"],
                }))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:top_k]]


def list_documents() -> list[dict]:
    """Return a summary list of all stored documents (no content, no chunks)."""
    store = _load()
    return [
        {
            "id": doc["id"],
            "title": doc["title"],
            "source": doc["source"],
            "chunk_count": len(doc["chunks"]),
            "ingestion_date": doc["ingestion_date"],
        }
        for doc in store["documents"].values()
    ]
