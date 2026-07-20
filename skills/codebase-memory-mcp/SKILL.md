---
name: codebase-memory-mcp
description: 'Use when a configured codebase-memory-mcp server can assist with graph-backed code discovery, architecture orientation, symbol lookup, callers and callees, dependency or data-flow tracing, impact analysis, unfamiliar modules, or an explicit Codebase Memory request.'
---

# Codebase Memory MCP

Use the configured Codebase Memory graph as a discovery accelerator, not as the sole source of truth. Confirm graph-derived conclusions with source snippets or local files before editing code or making strong claims.

## Workflow

1. Discover the Codebase Memory tools exposed by the current MCP client; clients may prefix or rename tool namespaces.
2. Call `list_projects` when available and use the exact indexed project name. If the repository is not indexed, continue with local exploration or ask before calling `index_repository` when graph access is important.
3. Before branch-sensitive or edit-sensitive conclusions, use `index_status` or `detect_changes` when available. After a branch switch, assume the index may be stale until checked. If freshness cannot be established, disclose that limitation and verify locally.
4. Use `get_architecture` once for orientation in an unfamiliar repository or subsystem. Do not repeat it for narrow follow-up questions.
5. Use `search_graph` for definitions, implementations, routes, classes, interfaces, callers, and related symbols. Prefer a natural-language query for discovery and a name or qualified-name pattern for known symbols. Narrow by label or path, set a result limit, and paginate or reduce scope when the response reports more results.
6. Use `search_code` or normal repository search for literal strings, configuration keys, test identifiers, error messages, and non-code files. Do not turn a precise text lookup into a broad graph query.
7. After graph search, use `get_code_snippet` with the returned qualified name. If source snippets are unavailable, open the local file before relying on the result.
8. Use `trace_path` for callers, callees, dependency paths, data flow, cross-service paths, and impact analysis. Include tests only when test coverage is part of the question.
9. Use `get_graph_schema` before `query_graph`. Reserve custom queries for multi-hop or aggregate questions that simpler tools cannot answer, and apply `LIMIT` or the tool's row limit.
10. When graph and checked-out source disagree, treat source as current and report likely index drift.

## Safety and Fallbacks

- Do not install Codebase Memory or another third-party skill from this workflow.
- Do not call `delete_project`, ingest traces, update ADRs, or index a repository unless the user explicitly requested or approved the action; announce it before execution.
- Fall back to normal repository exploration when the MCP server, project, index, or required capability is unavailable; do not invent tool results or stop a task that can be completed safely without the graph.
