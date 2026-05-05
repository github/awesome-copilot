"""
index_store.py — Maintains entity and keyword indexes for fast lookup.

Handles:
- Entity index: name → [node_ids]
- Keyword index: token → [node_ids]
- Persist to index.json
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config

_DATA_DIR = Path(os.environ.get("MINI_CONTEXT_GRAPH_DATA_DIR", str(config.DATA_DIR)))
_INDEX_FILE = _DATA_DIR / "index.json"

_STOPWORDS = frozenset(
    [
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "to", "of", "in", "on",
        "at", "by", "for", "with", "from", "and", "or", "but", "not", "it",
        "its", "this", "that", "these", "those", "i", "you", "he", "she",
        "we", "they", "what", "which", "who", "how", "why", "when", "where",
    ]
)


def _load() -> dict:
    if _INDEX_FILE.exists():
        with open(_INDEX_FILE, "r") as f:
            return json.load(f)
    return {"entity_index": {}, "keyword_index": {}}


def _save(index: dict) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


def _tokenize(text: str) -> list[str]:
    """Split text into lowercase tokens, removing stopwords and short tokens."""
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


def add_entity(name: str, node_id: str) -> None:
    """Register an entity name → node_id in both entity and keyword indexes."""
    index = _load()
    name_lower = name.strip().lower()

    # Entity index
    if name_lower not in index["entity_index"]:
        index["entity_index"][name_lower] = []
    if node_id not in index["entity_index"][name_lower]:
        index["entity_index"][name_lower].append(node_id)

    # Keyword index
    for token in _tokenize(name_lower):
        if token not in index["keyword_index"]:
            index["keyword_index"][token] = []
        if node_id not in index["keyword_index"][token]:
            index["keyword_index"][token].append(node_id)

    _save(index)


def search(query: str) -> list[str]:
    """Search for node_ids matching the query via entity name or keywords."""
    index = _load()
    query_lower = query.strip().lower()
    matched_ids: set[str] = set()

    # Exact entity name match
    if query_lower in index["entity_index"]:
        matched_ids.update(index["entity_index"][query_lower])

    # Keyword match
    for token in _tokenize(query_lower):
        if token in index["keyword_index"]:
            matched_ids.update(index["keyword_index"][token])

    return list(matched_ids)
