---
name: codebase-memory-mcp
description: 'Use when a configured codebase-memory-mcp server can assist with graph-backed code discovery, architecture orientation, symbol lookup, callers and callees, dependency or data-flow tracing, impact analysis, unfamiliar modules, or an explicit Codebase Memory request.'
---

# Codebase Memory MCP

Use the configured Codebase Memory graph as a discovery accelerator, not as the sole source of truth. Confirm graph-derived conclusions with source snippets or local files before editing code or making strong claims.

## Workflow

1. Discover the Codebase Memory tools exposed by the current MCP client; clients may prefix or rename tool namespaces.
2. Call `list_projects` when available and use the exact indexed project name. If the repository is not indexed, continue with local exploration or ask before calling `index_repository` when graph access is important.
3. Before branch-sensitive or edit-sensitive conclusions, use `index_status` and verify the actual version-control state. Use `detect_changes` only when its Git base and head are valid for the checkout. If it unexpectedly reports zero changes, or the checkout uses another VCS, inspect that VCS's status or diff before claiming no impact.
4. Use `get_architecture` once for unfamiliar structure. Request `clusters` to discover de-facto module seams. Treat `cycles` as an opt-in whole-call-graph scan: `path` does not scope cycle detection, so verify relevant cycles before making module-local claims.
5. Use `search_graph` for definitions, implementations, routes, classes, interfaces, and related symbols. Prefer a natural-language query for discovery and a name or qualified-name pattern for known symbols. Narrow by label or path and set a result limit. For exhaustive claims, increase `offset` by `limit` while `has_more` is true.
6. Use `search_code` or normal repository search for literal strings, configuration keys, test identifiers, error messages, and non-code files. Do not turn a precise text lookup into a broad graph query.
7. After graph search, use `get_code_snippet` with the returned qualified name. If source snippets are unavailable, open the local file before relying on the result.
8. Use `trace_path` for callers, callees, dependency paths, data flow, cross-service paths, and impact analysis. Include tests when the claim covers them. While `truncated` is true, pass `next` back as `cursor` with every other argument unchanged.
9. After identifying candidate files, call `check_index_coverage` for every cited path. Before negative or exhaustive claims, also check the relevant `scopes`; advance `scope_offset` to each `next_offset` while `has_more` is true. This metadata is best-effort, not proof of completeness. Inspect local source for partial, skipped, excluded, stale, or otherwise uncovered paths.
10. Use `get_graph_schema` before custom `query_graph` calls. Reserve them for bounded multi-hop or aggregate questions, apply `LIMIT` or `max_rows`, and use `graph="missed"` to audit files the main graph did not fully index.
11. Complete every relevant result stream before an exhaustive claim. For bounded discovery, stopping early is acceptable when the result states its limit or truncation. When graph and checked-out source disagree, treat source as current and report likely index drift.

## Indexing Modes

- Use `moderate` by default for normal indexing: it filters files while retaining similarity and semantic edges.
- Use `fast` only for an explicitly requested smoke index, or when `moderate` is blocked and a degraded fallback is useful. Disclose that similarity and semantic edges are absent.
- Use `full` when moderate-only discovery filters omit relevant supported files and the additional indexing cost is justified. Full still honors `.gitignore`, `.cbmignore`, and always-skip rules.

## Safety and Fallbacks

- Do not install Codebase Memory or another third-party skill from this workflow.
- Do not call `delete_project`, ingest traces, update ADRs, or index a repository unless the user explicitly requested or approved the action; announce it before execution.
- Fall back to normal repository exploration when the MCP server, project, index, or required capability is unavailable; do not invent tool results or stop a task that can be completed safely without the graph.
