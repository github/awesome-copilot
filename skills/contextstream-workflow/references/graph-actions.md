# Graph Actions Reference

> All actions available on `mcp_contextstream_graph(action="...")`.

The graph tool serves **two distinct domains**:

1. **Knowledge Graph** — queries over nodes created from captured events and manual `create_node` calls. Works for all projects regardless of language.
2. **Code Graph** — dependency analysis over indexed source files. Coverage depends on language support — check [indexing.md](indexing.md) for supported extensions.

> **Note**: If your primary language has limited indexing support, focus on Knowledge Graph actions (`related`, `path`, `decisions`, `contradictions`) and use your language's native tooling for dependency analysis.

---

## Knowledge Graph (Primary — use regularly)

These actions query the knowledge nodes that ContextStream auto-distills from captured events. The more you capture (decisions, insights, lessons), the richer the graph becomes.

### When to Use Knowledge Graph

| Moment | Action | Why |
|--------|--------|-----|
| Before making a decision | `related` | Check what we already know about the topic |
| After capturing a decision | `contradictions` | Verify the new decision doesn't conflict with existing knowledge |
| During architecture/design work | ~~`decisions`~~ | **BROKEN (v0.4.64)** — use `recall(query="decisions about X")` instead |
| Before creating a plan | ~~`decisions`~~ | **BROKEN** — use `recall` or `memory(summary)` for counts |
| When tracing rationale | `path` | Find the reasoning chain between a requirement and a conclusion |
| Before completing a plan | ~~`decisions`~~ | **BROKEN** — use `recall` to review decisions |

### related

Find knowledge nodes related to a given node. Use this to discover existing context before making decisions.

```
mcp_contextstream_graph(action="related", node_id="<uuid>", limit=10)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `node_id` | ✅ | UUID of the source node |
| `limit` | — | Max results |

> **Tip**: Get a node ID from `memory(action="list_nodes")`, then query its related nodes to see the full context around a topic.

### path

Find the relationship path between two knowledge nodes. Useful for tracing how a requirement led to a decision.

```
mcp_contextstream_graph(action="path", source_id="<uuid>", target_id="<uuid>")
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `source_id` | ✅ | UUID of start node |
| `target_id` | ✅ | UUID of end node |

### decisions

> **⚠️ BROKEN (v0.4.64)**: Returns empty despite decision nodes existing in the graph. Same classification mismatch as `memory(decisions)`. **Workaround**: Use `recall(query="decision about X")` or `memory(summary)` for counts.

List decision history from indexed knowledge nodes. Use before planning work or completing plans to verify consistency.

```
mcp_contextstream_graph(action="decisions", limit=10)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `limit` | — | Max results |

> **Note**: Requires nodes to be indexed. Run `ingest` if `decisions` returns empty but `list_nodes` shows decision nodes exist. **However**, as of v0.4.64, `decisions` returns empty even after `ingest` — this appears to be a classification mismatch bug, not an indexing issue.

> **`graph.decisions` vs `memory.decisions`**: `graph.decisions` queries indexed knowledge nodes (auto-distilled from events). `memory.decisions` queries raw events directly. They may return different results. Prefer `graph.decisions` for the enriched knowledge graph view.

### contradictions

Find contradicting knowledge nodes. Use after capturing a new decision to validate it doesn't conflict with existing knowledge.

```
mcp_contextstream_graph(action="contradictions", node_id="<uuid>")
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `node_id` | ✅ | UUID of the node to check |

---

## Code Graph (Coverage depends on language support)

> **Note**: Code Graph actions require indexed source files. Check [indexing.md](indexing.md) for supported file extensions. For languages with limited indexing, prefer your language's native dependency analysis tools.

### dependencies

Get the dependency graph for a module, function, type, or variable.

```
mcp_contextstream_graph(
  action="dependencies",
  target={"type": "module", "id": "src/models/user"},
  max_depth=2,
  include_transitive=true
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `target` | ✅ | `{"type": "<target_type>", "id": "<identifier>"}` |
| `max_depth` | — | How deep to traverse (default: 1) |
| `include_transitive` | — | Include indirect deps |

### impact

Change impact analysis — what would be affected if a target changes.

```
mcp_contextstream_graph(action="impact", target={"type": "type", "id": "UserEntity"}, max_depth=3)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `target` | ✅ | `{"type": "<target_type>", "id": "<identifier>"}` |
| `max_depth` | — | How deep to traverse |

### call_path

Find the call path between two code elements.

```
mcp_contextstream_graph(
  action="call_path",
  source={"type": "function", "id": "handleRequest"},
  target={"type": "function", "id": "validateInput"},
  max_depth=5
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `source` | ✅ | `{"type": "<target_type>", "id": "<identifier>"}` |
| `target` | ✅ | `{"type": "<target_type>", "id": "<identifier>"}` |
| `max_depth` | — | Max depth to search |

### Target Types

| Type | Aliases | Description |
|------|---------|------------|
| `module` | `file`, `path` | File or directory |
| `function` | `method` | Function or method |
| `type` | `struct`, `enum`, `trait`, `class` | Type definition |
| `variable` | `data`, `const`, `constant` | Variable or constant |

---

## Code Quality Analysis

### circular_dependencies

Detect circular dependency chains. For languages with limited indexing, prefer your framework's native dependency tools.

| Parameter | Required | Description |
|-----------|----------|------------|
| `project_id` | — | Scope to specific project |

### unused_code

Detect potentially unused code. For languages with limited indexing, prefer your language's native static analysis tools.

| Parameter | Required | Description |
|-----------|----------|------------|
| `project_id` | — | Scope to specific project |

---

## Indexing

### ingest

Build or rebuild the knowledge/code graph index. Run this when `decisions` returns empty or graph queries seem incomplete.

```
mcp_contextstream_graph(action="ingest", project_id="<project_id>", wait=true)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `project_id` | — | Scope to specific project |
| `wait` | — | Wait for completion (default: false) |

> **When to run**: If `decisions()` returns empty but `memory(action="list_nodes")` shows decision nodes exist, the graph index is stale. Run `ingest` to rebuild it.
