"""
template_agent_workflow.py — Template agent script for ingesting + querying the context graph.

This script demonstrates the complete workflow an agent should follow:
1. Read markdown guidance files
2. Extract entities/relations via LLM reasoning
3. Call Python methods to persist
4. Query the graph
5. Handle errors gracefully

Copy and adapt this template for your agent implementation.
"""

import json
import sys
from pathlib import Path

# Add tools to path
sys.path.insert(0, str(Path(__file__).parent))

from contextgraph import ContextGraphSkill


def ingest_document(skill: ContextGraphSkill, document: str) -> dict:
    """
    Step 1: Agent reads ingestion.md and ontology.md
    Step 2: Agent uses LLM to extract entities and relations
    Step 3: Call Python methods to persist (mimicked here with static extraction)

    In a real agent, replace the static extraction with LLM calls.
    """
    print(f"\n[INGEST] Processing document:\n{document}\n")

    # --- STEP 1 & 2: LLM EXTRACTION PHASE (Guided by ingestion.md + ontology.md) ---
    # In a real agent, this would use LLM reasoning.
    # For now, we'll mock an extraction result:

    extraction_result = {
        "entities": [
            {"name": "memory leak", "type": "issue"},
            {"name": "system crash", "type": "issue"},
            {"name": "object", "type": "component"},
        ],
        "relations": [
            {
                "source": "memory leak",
                "target": "system crash",
                "type": "causes",
                "confidence": 1.0,
            },
            {
                "source": "object",
                "target": "memory leak",
                "type": "contributes to",
                "confidence": 0.9,
            },
        ],
    }

    print(f"[LLM] Extracted entities + relations:")
    print(json.dumps(extraction_result, indent=2))

    # --- STEP 3: PERSIST PHASE (Call Python methods) ---
    errors = []
    added_nodes = {}

    for entity in extraction_result["entities"]:
        try:
            node_id = skill.add_node(entity["name"], entity["type"])
            added_nodes[entity["name"]] = node_id
            print(f"  ✓ Added node: {entity['name']} (id: {node_id}, type: {entity['type']})")
        except Exception as e:
            errors.append(f"Failed to add node {entity['name']}: {e}")
            print(f"  ✗ Error adding node {entity['name']}: {e}")

    for relation in extraction_result["relations"]:
        # Validate both endpoints exist
        if relation["source"] not in added_nodes or relation["target"] not in added_nodes:
            error_msg = f"Cannot add edge: source or target missing"
            errors.append(error_msg)
            print(f"  ✗ Skip edge {relation['source']} → {relation['target']}: {error_msg}")
            continue

        # Validate confidence threshold
        if relation["confidence"] < 0.6:
            error_msg = f"Confidence {relation['confidence']} < 0.6 (minimum threshold)"
            errors.append(error_msg)
            print(f"  ✗ Skip edge {relation['source']} → {relation['target']}: {error_msg}")
            continue

        try:
            skill.add_edge(
                source_name=relation["source"],
                target_name=relation["target"],
                relation=relation["type"],
                confidence=relation["confidence"],
            )
            print(
                f"  ✓ Added edge: {relation['source']} "
                f"--[{relation['type']}]→ {relation['target']} "
                f"(confidence: {relation['confidence']})"
            )
        except Exception as e:
            errors.append(f"Failed to add edge {relation['source']} → {relation['target']}: {e}")
            print(f"  ✗ Error adding edge: {e}")

    return {
        "success": len(errors) == 0,
        "nodes_added": len(added_nodes),
        "edges_added": len(extraction_result["relations"]) - len(
            [e for e in errors if "skip edge" in e.lower()]
        ),
        "errors": errors,
    }


def query_graph(skill: ContextGraphSkill, query: str) -> dict:
    """
    Query the graph for context to answer the user's question.

    Step 1: Read retrieval.md
    Step 2: Call skill.query() which internally handles BFS + subgraph extraction
    Step 3: Return structured context
    """
    print(f"\n[QUERY] {query}\n")

    try:
        subgraph = skill.query(query)

        if not subgraph["nodes"]:
            print("  ℹ No relevant entities found in graph.")
            return {
                "success": True,
                "query": query,
                "subgraph": subgraph,
                "nodes_found": 0,
                "edges_found": 0,
            }

        print(f"  ✓ Retrieved subgraph with {len(subgraph['nodes'])} nodes, {len(subgraph['edges'])} edges")
        print(f"\n  Nodes:")
        for node_id, node in subgraph["nodes"].items():
            print(f"    - {node['name']} (type: {node['type']}, id: {node_id})")

        print(f"\n  Edges:")
        for edge in subgraph["edges"]:
            source_name = subgraph["nodes"][edge["source"]]["name"]
            target_name = subgraph["nodes"][edge["target"]]["name"]
            print(
                f"    - {source_name} --[{edge['type']}]→ {target_name} "
                f"(confidence: {edge['confidence']})"
            )

        return {
            "success": True,
            "query": query,
            "subgraph": subgraph,
            "nodes_found": len(subgraph["nodes"]),
            "edges_found": len(subgraph["edges"]),
        }

    except Exception as e:
        error_msg = f"Query failed: {e}"
        print(f"  ✗ {error_msg}")
        return {"success": False, "query": query, "error": error_msg}


def main():
    """Demo: ingest a document, then query the graph."""
    skill = ContextGraphSkill()

    # ===== INGESTION =====
    document = """
    System crashes due to memory leaks.
    Memory leaks occur when objects are not released.
    """

    result = ingest_document(skill, document)
    print(f"\n[INGEST RESULT] Nodes added: {result['nodes_added']}, " f"Edges added: {result['edges_added']}")
    if result["errors"]:
        print(f"Errors: {result['errors']}")

    # ===== RETRIEVAL =====
    queries = [
        "Why does the system crash?",
        "What causes memory leaks?",
    ]

    for query in queries:
        result = query_graph(skill, query)
        if result["success"]:
            print(f"  Nodes found: {result['nodes_found']}, Edges found: {result['edges_found']}")
        else:
            print(f"  Error: {result['error']}")


if __name__ == "__main__":
    main()
