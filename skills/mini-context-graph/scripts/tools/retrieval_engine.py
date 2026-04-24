"""
retrieval_engine.py — BFS-based graph traversal for context retrieval.

Input: seed node_ids + depth
Output: list of node_ids within traversal depth filtered by min_confidence
"""
from __future__ import annotations

import sys
from pathlib import Path
from collections import deque

# Allow imports from parent package
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools import graph_store
import config


def retrieve(
    seed_node_ids: list[str],
    depth: int = config.MAX_GRAPH_DEPTH,
    min_confidence: float = config.MIN_CONFIDENCE,
    max_nodes: int = config.MAX_NODES,
) -> list[str]:
    """
    BFS from seed nodes up to `depth` hops.

    Returns a list of node_ids (including seeds) within the traversal,
    filtered by min_confidence on edges and capped at max_nodes.
    """
    visited: set[str] = set()
    # Queue items: (node_id, current_depth)
    queue: deque[tuple[str, int]] = deque()

    for seed in seed_node_ids:
        if seed not in visited:
            visited.add(seed)
            queue.append((seed, 0))

    while queue:
        if len(visited) >= max_nodes:
            break

        node_id, current_depth = queue.popleft()

        if current_depth >= depth:
            continue

        neighbors = graph_store.get_neighbors(node_id, min_confidence=min_confidence)
        for neighbor in neighbors:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, current_depth + 1))
                if len(visited) >= max_nodes:
                    break

    return list(visited)
