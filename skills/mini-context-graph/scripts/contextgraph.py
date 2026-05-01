"""
contextgraph.py — Main interface for the Context Graph Skill.

This file is orchestration-only. All LLM reasoning lives in the .md files.
Python here only wires together the deterministic storage and retrieval tools.

Agent usage:
- ingest(): agent reads ingestion.md + ontology.md, extracts entities/relations,
            then calls the tool methods directly.
- query():  agent reads retrieval.md, calls index_store.search + retrieval_engine.retrieve,
            then calls graph_store.get_subgraph and returns the result.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import config
from tools import graph_store, index_store, ontology_store, retrieval_engine, documents_store


class ContextGraphSkill:

    def ingest(self, documents: list[str]) -> None:
        """
        Orchestration entry point for ingesting documents into the context graph.

        The agent (Copilot) MUST:
          1. Read ingestion.md to understand entity/relation extraction rules.
          2. Read ontology.md to apply type normalization.
          3. For each document, produce a JSON with entities + relations.
          4. For each entity:
             - ontology_store.add_type(entity["type"])
             - node_id = graph_store.add_node(entity["name"], entity["type"])
             - index_store.add_entity(entity["name"], node_id)
          5. For each relation (if confidence >= MIN_CONFIDENCE):
             - ontology_store.add_relation(relation["type"])
             - source_id = graph_store.find_node_by_name(relation["source"])
             - target_id = graph_store.find_node_by_name(relation["target"])
             - graph_store.add_edge(source_id, target_id, relation["type"], relation["confidence"])

        This method does NOT call any LLM. It documents the agent contract only.
        """
        raise NotImplementedError(
            "ingest() must be driven by the Copilot agent following ingestion.md. "
            "Call the tool methods directly after LLM extraction."
        )

    def query(self, query: str) -> dict:
        """
        Orchestration entry point for retrieving a subgraph for a query.

        The agent (Copilot) MUST:
          1. Read retrieval.md to understand the retrieval strategy.
          2. Call index_store.search(query) to get seed node_ids.
          3. Call retrieval_engine.retrieve(seed_ids, depth=MAX_GRAPH_DEPTH) to expand.
          4. Call graph_store.get_subgraph(node_ids) to build the result.
          5. Return the subgraph dict.

        This method does NOT call any LLM. It documents the agent contract only.
        Returns an empty subgraph if called directly.
        """
        seed_ids = index_store.search(query)
        if not seed_ids:
            return {"nodes": {}, "edges": []}

        node_ids = retrieval_engine.retrieve(
            seed_ids,
            depth=config.MAX_GRAPH_DEPTH,
            min_confidence=config.MIN_CONFIDENCE,
            max_nodes=config.MAX_NODES,
        )
        return graph_store.get_subgraph(node_ids)

    # ------------------------------------------------------------------
    # Convenience wrappers — agents may call these directly
    # ------------------------------------------------------------------

    def add_node(self, name: str, node_type: str) -> str:
        """Add a node to the graph and index. Returns node_id."""
        canonical_type = ontology_store.normalize_type(node_type)
        ontology_store.add_type(canonical_type)
        node_id = graph_store.add_node(name, canonical_type)
        index_store.add_entity(name, node_id)
        return node_id

    def add_edge(
        self, source_name: str, target_name: str, relation: str, confidence: float
    ) -> None:
        """Add an edge between two nodes (by name) if both exist and confidence qualifies."""
        if confidence < config.MIN_CONFIDENCE:
            return

        source_id = graph_store.find_node_by_name(source_name)
        target_id = graph_store.find_node_by_name(target_name)
        if source_id is None or target_id is None:
            return

        canonical_relation = ontology_store.normalize_relation(relation)
        ontology_store.add_relation(canonical_relation)
        graph_store.add_edge(source_id, target_id, canonical_relation, confidence)

    # ------------------------------------------------------------------
    # LLM Wiki + RAG methods — store raw content & provenance
    # ------------------------------------------------------------------

    def ingest_with_content(
        self,
        doc_id: str,
        title: str,
        source: str,
        raw_content: str,
        entities: list[dict],
        relations: list[dict],
    ) -> dict:
        """
        Full RAG ingestion: stores raw document + chunks, then wires provenance
        links from each graph node/edge back to source chunks.

        The agent MUST:
          1. Read the raw_content.
          2. Read ingestion.md and ontology.md for extraction rules.
          3. Extract entities and relations (LLM reasoning step).
          4. Call this method with the results.

        Args:
            doc_id:      Stable document identifier (e.g. "doc_001").
            title:       Human-readable document title.
            source:      Origin path or URL (immutable, never modified).
            raw_content: Full text of the document.
            entities:    List of dicts: [{name, type, supporting_text?}, ...]
            relations:   List of dicts: [{source, target, type, confidence,
                                          supporting_text?, chunk_hint?}, ...]

        Returns:
            Summary dict: {doc_id, chunk_count, nodes_added, edges_added}
        """
        # Step 1: Store raw document and auto-chunk
        doc = documents_store.add_document(doc_id, title, source, raw_content)
        chunks = doc["chunks"]

        def _find_best_chunk(text: str) -> str | None:
            """Find the chunk whose text most overlaps with the given span."""
            if not text or not chunks:
                return None
            text_lower = text.lower()
            best_chunk_id = None
            best_score = 0
            for chunk in chunks:
                if text_lower in chunk["text"].lower():
                    return chunk["chunk_id"]
                # Fallback: count overlapping words
                words_text = set(text_lower.split())
                words_chunk = set(chunk["text"].lower().split())
                score = len(words_text & words_chunk)
                if score > best_score:
                    best_score = score
                    best_chunk_id = chunk["chunk_id"]
            return best_chunk_id

        nodes_added = 0
        # Step 2: Ingest entities with provenance
        for entity in entities:
            supporting = entity.get("supporting_text", "")
            chunk_id = _find_best_chunk(supporting)
            chunk_ids = [chunk_id] if chunk_id else []

            canonical_type = ontology_store.normalize_type(entity["type"])
            ontology_store.add_type(canonical_type)
            node_id = graph_store.add_node(
                entity["name"],
                canonical_type,
                source_document=doc_id,
                source_chunks=chunk_ids,
            )
            index_store.add_entity(entity["name"], node_id)
            nodes_added += 1

        edges_added = 0
        # Step 3: Ingest relations with provenance
        for rel in relations:
            if rel.get("confidence", 0) < config.MIN_CONFIDENCE:
                continue

            supporting = rel.get("supporting_text", "")
            chunk_id = _find_best_chunk(supporting) or rel.get("chunk_hint")

            source_id = graph_store.find_node_by_name(rel["source"])
            target_id = graph_store.find_node_by_name(rel["target"])
            if source_id is None or target_id is None:
                continue

            canonical_relation = ontology_store.normalize_relation(rel["type"])
            ontology_store.add_relation(canonical_relation)
            graph_store.add_edge(
                source_id,
                target_id,
                canonical_relation,
                rel["confidence"],
                source_document=doc_id,
                supporting_text=supporting or None,
                chunk_id=chunk_id,
            )
            edges_added += 1

        return {
            "doc_id": doc_id,
            "chunk_count": len(chunks),
            "nodes_added": nodes_added,
            "edges_added": edges_added,
        }

    def query_with_evidence(self, query: str) -> dict:
        """
        Query the graph and return the subgraph together with supporting
        source documents and chunks (evidence chain).

        Returns:
            {
              "query": str,
              "subgraph": {"nodes": {...}, "edges": [...]},
              "supporting_documents": [
                {
                  "doc_id": str,
                  "doc_title": str,
                  "supporting_chunks": [{"chunk_id": str, "text": str}, ...]
                }
              ],
              "evidence_chain": str   # human-readable summary path
            }
        """
        subgraph = self.query(query)
        if not subgraph["nodes"]:
            return {
                "query": query,
                "subgraph": subgraph,
                "supporting_documents": [],
                "evidence_chain": "No matching nodes found.",
            }

        # Collect all provenance pointers from nodes and edges
        docs_chunks: dict[str, list[str]] = {}  # doc_id -> [chunk_ids]

        for node in subgraph["nodes"].values():
            doc_id = node.get("source_document")
            if doc_id:
                docs_chunks.setdefault(doc_id, [])
                docs_chunks[doc_id].extend(node.get("source_chunks") or [])

        for edge in subgraph["edges"]:
            doc_id = edge.get("source_document")
            if doc_id:
                docs_chunks.setdefault(doc_id, [])
                if edge.get("chunk_id"):
                    docs_chunks[doc_id].append(edge["chunk_id"])

        # Resolve chunk texts from documents_store
        supporting_documents = []
        for doc_id, chunk_ids in docs_chunks.items():
            doc = documents_store.get_document(doc_id)
            if doc is None:
                continue
            seen = set()
            chunks_out = []
            for cid in chunk_ids:
                if cid in seen:
                    continue
                seen.add(cid)
                chunk = documents_store.get_chunk(cid)
                if chunk:
                    chunks_out.append({"chunk_id": cid, "text": chunk["text"]})
            if chunks_out:
                supporting_documents.append({
                    "doc_id": doc_id,
                    "doc_title": doc["title"],
                    "supporting_chunks": chunks_out,
                })

        # Build a simple evidence chain string
        chain_parts = []
        for edge in subgraph["edges"]:
            src_node = subgraph["nodes"].get(edge["source"], {})
            tgt_node = subgraph["nodes"].get(edge["target"], {})
            src_name = src_node.get("name", edge["source"])
            tgt_name = tgt_node.get("name", edge["target"])
            chain_parts.append(f"{src_name} --[{edge['type']}]--> {tgt_name}")
        evidence_chain = " | ".join(chain_parts) if chain_parts else "No edges in subgraph."

        return {
            "query": query,
            "subgraph": subgraph,
            "supporting_documents": supporting_documents,
            "evidence_chain": evidence_chain,
        }
