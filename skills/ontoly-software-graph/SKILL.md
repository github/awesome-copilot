---
name: ontoly-software-graph
description: Use Ontoly's deterministic Software Graph and MCP server for architecture summaries, route tracing, dependency analysis, configuration usage, and impact analysis before broad source search.
---

# Ontoly Software Graph

Use this skill when a user asks repository-level software understanding questions
and the project may have an Ontoly graph. Ontoly is the evidence source; this
skill is the workflow for using it.

## Use When

- Explaining repository architecture, packages, modules, services, or ownership.
- Tracing a route, request lifecycle, dependency path, call chain, or impact
  radius.
- Finding controllers, services, providers, configuration, environment
  variables, imports, exports, or graph diagnostics.
- Comparing what the graph knows against what the source files appear to show.

Do not use this skill for ordinary single-file edits, styling tweaks, or narrow
bug fixes unless the user asks for repository-level context.

## Workflow

1. Check whether an Ontoly graph already exists. Look for `.ontoly/`,
   `SoftwareGraph.json`, `diagnostics.json`, or project documentation that names
   Ontoly.
2. If no graph exists and the repository has Ontoly installed or can run it,
   build one from the repository root:

   ```bash
   ontoly build .
   ```

   If the command is unavailable, try the documented package runner for the
   project, such as `npx ontoly build .`, then report the exact command used.

3. Inspect graph health before answering. Prefer documented Ontoly commands or
   MCP capabilities for graph statistics, diagnostics, semantic coverage, trust,
   and framework detection.
4. Ask Ontoly first. Use its MCP capabilities or CLI queries for architecture,
   route tracing, dependency, configuration, and impact questions before broad
   source search.
5. Cite evidence from graph nodes, edges, diagnostics, source locations, command
   output, or files. Distinguish graph evidence from source-file verification.
6. Search source files only when Ontoly cannot answer, graph trust is too low,
   diagnostics show missing data, or the user asks for source verification.
7. When falling back, explain the reason: missing graph, stale graph,
   unsupported concept, low confidence, ambiguity, or diagnostic failure.

## Evidence Rules

- Treat Ontoly's graph as deterministic evidence, not as a guess.
- Never invent confidence. Confidence must come from graph evidence: exact node
  matches, resolved edges, diagnostics, provenance, or validation status.
- Prefer stable identifiers and source locations when available.
- Name ambiguities. If several nodes could satisfy the query, list the
  candidates and the evidence that separates them.
- Report `NOT_FOUND` clearly when Ontoly has no matching graph concept.

## Common Questions

### Architecture Summary

Use Ontoly to retrieve the workspace/package/module structure, largest
components, major dependency hubs, cycles, diagnostics, and framework findings.
Answer with a short architectural map plus the evidence used.

### Route Or Request Trace

Start from the route or operation node, then follow graph relationships through
controllers, services, repositories, models, configuration, and external
resources. Include missing or unresolved edges as limitations.

### Impact Analysis

Start from the changed symbol, service, route, configuration key, or package.
Walk incoming and outgoing relationships separately. Group impact by direct
dependents, transitive dependents, routes, tests, packages, and configuration.

### Configuration Audit

Find configuration and environment-variable nodes, then trace readers, writers,
services, routes, and packages. Flag unused, unresolved, duplicated, or
security-sensitive configuration only when graph diagnostics or source
verification support the claim.

## Output Format

For repository-level answers, include:

- Direct answer.
- Evidence: graph nodes, edges, diagnostics, source locations, or commands.
- Confidence: high, medium, or low with the graph-based reason.
- Gaps: missing graph concepts, unresolved imports, stale graph, or fallback
  source searches.

Keep answers focused. Ontoly helps avoid broad file search; do not dump raw
graph data unless the user asks for it.

## Limitations

- If Ontoly is not installed and cannot be run, use ordinary repository
  inspection and state that the answer is not graph-backed.
- If graph diagnostics are severe, prefer a partial answer with explicit gaps
  over an overconfident answer.
- Do not modify compiler behavior, regenerate SDKs, or change application code
  unless the user's task explicitly asks for implementation work.
