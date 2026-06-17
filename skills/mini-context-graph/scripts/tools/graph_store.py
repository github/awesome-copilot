"""
graph_store.py — Persistent storage for graph nodes and edges.

Handles:
- Adding/deduplicating nodes
- Adding edges with confidence
- Fetching neighbors
- Persisting to graph.json
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config

_DATA_DIR = Path(os.environ.get("MINI_CONTEXT_GRAPH_DATA_DIR", str(config.DATA_DIR)))
_GRAPH_FILE = _DATA_DIR / "graph.json"


def _load() -> dict:
    if _GRAPH_FILE.exists():
        with open(_GRAPH_FILE, "r") as f:
            return json.load(f)
    return {"nodes": {}, "edges": []}


def _save(graph: dict) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_GRAPH_FILE, "w") as f:
        json.dump(graph, f, indent=2)


def add_node(
    name: str,
    node_type: str,
    source_document: str | None = None,
    source_chunks: list[str] | None = None,
) -> str:
    """
    Add a node if it doesn't exist. Returns node_id.

    Args:
        source_document: doc_id from documents_store (provenance pointer).
        source_chunks:   list of chunk_ids that mention this entity.
    """
    graph = _load()
    name_lower = name.strip().lower()

    # Deduplication: search by normalized name
    for node_id, node in graph["nodes"].items():
        if node["name"] == name_lower:
            # Merge provenance if new info provided
            changed = False
            if source_document and node.get("source_document") is None:
                node["source_document"] = source_document
                changed = True
            if source_chunks:
                existing = set(node.get("source_chunks") or [])
                merged = list(existing | set(source_chunks))
                if merged != list(existing):
                    node["source_chunks"] = merged
                    changed = True
            if changed:
                _save(graph)
            return node_id

    node_id = str(uuid.uuid4())[:8]
    graph["nodes"][node_id] = {
        "name": name_lower,
        "type": node_type.strip().lower(),
        "source_document": source_document,
        "source_chunks": source_chunks or [],
    }
    _save(graph)
    return node_id


def add_edge(
    source_id: str,
    target_id: str,
    relation: str,
    confidence: float,
    source_document: str | None = None,
    supporting_text: str | None = None,
    chunk_id: str | None = None,
) -> None:
    """
    Add a directed edge between two nodes.

    Args:
        source_document:  doc_id from documents_store (provenance pointer).
        supporting_text:  The exact text span that supports this relation.
        chunk_id:         The specific chunk_id the supporting text came from.
    """
    graph = _load()

    # Deduplicate edges by source + target + relation
    relation_lower = relation.strip().lower()
    for edge in graph["edges"]:
        if (
            edge["source"] == source_id
            and edge["target"] == target_id
            and edge["type"] == relation_lower
        ):
            changed = False
            if confidence > edge["confidence"]:
                edge["confidence"] = confidence
                changed = True
            if source_document and edge.get("source_document") is None:
                edge["source_document"] = source_document
                changed = True
            if supporting_text and edge.get("supporting_text") is None:
                edge["supporting_text"] = supporting_text
                changed = True
            if chunk_id and edge.get("chunk_id") is None:
                edge["chunk_id"] = chunk_id
                changed = True
            if changed:
                _save(graph)
            return

    graph["edges"].append({
        "source": source_id,
        "target": target_id,
        "type": relation_lower,
        "confidence": confidence,
        "source_document": source_document,
        "supporting_text": supporting_text,
        "chunk_id": chunk_id,
    })
    _save(graph)


def get_neighbors(node_id: str, min_confidence: float = 0.0) -> list[str]:
    """Return node_ids of all neighbors reachable from node_id."""
    graph = _load()
    neighbors = []
    for edge in graph["edges"]:
        if edge["confidence"] < min_confidence:
            continue
        if edge["source"] == node_id:
            neighbors.append(edge["target"])
        elif edge["target"] == node_id:
            neighbors.append(edge["source"])
    return list(set(neighbors))


def get_node(node_id: str) -> dict | None:
    """Fetch a single node by ID."""
    graph = _load()
    return graph["nodes"].get(node_id)


def get_subgraph(node_ids: list[str]) -> dict:
    """Return nodes and edges induced by the given node_ids."""
    graph = _load()
    node_id_set = set(node_ids)

    nodes = {nid: graph["nodes"][nid] for nid in node_ids if nid in graph["nodes"]}
    edges = [
        e
        for e in graph["edges"]
        if e["source"] in node_id_set and e["target"] in node_id_set
    ]
    return {"nodes": nodes, "edges": edges}


def find_node_by_name(name: str) -> str | None:
    """Return node_id for a given normalized name, or None."""
    graph = _load()
    name_lower = name.strip().lower()
    for node_id, node in graph["nodes"].items():
        if node["name"] == name_lower:
            return node_id
    return None


def link_node_to_source(node_id: str, doc_id: str, chunk_ids: list[str]) -> None:
    """Attach provenance (doc_id + chunk_ids) to an existing node."""
    graph = _load()
    if node_id not in graph["nodes"]:
        return
    node = graph["nodes"][node_id]
    node["source_document"] = doc_id
    existing = set(node.get("source_chunks") or [])
    node["source_chunks"] = list(existing | set(chunk_ids))
    _save(graph)


def get_node_sources(node_id: str) -> dict:
    """Return provenance info (source_document + source_chunks) for a node."""
    graph = _load()
    node = graph["nodes"].get(node_id, {})
    return {
        "source_document": node.get("source_document"),
        "source_chunks": node.get("source_chunks", []),
    }
