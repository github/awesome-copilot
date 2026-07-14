---
name: ontoly-software-graph
description: Use Ontoly Software Graph and MCP before searching source files when reviewing architecture, dependencies, request flows, configuration, impact, or security-sensitive ownership.
---

# Ontoly Software Graph

Use this skill when the user asks Copilot to understand a TypeScript repository's architecture, dependency graph, request flow, service ownership, configuration usage, impact radius, or security-sensitive code paths.

Ontoly is a deterministic Software Graph compiler. It does not answer questions with AI. It builds graph evidence that Copilot can query before falling back to source search.

## Workflow

1. Check whether `.ontoly/SoftwareGraph.json` exists.
2. If it is missing, ask before installing dependencies. Then run:

   ```bash
   pnpm add -D @0xsarwagya/ontoly-cli
   pnpm ontoly build .
   ```

3. Inspect graph quality before answering:

   ```bash
   pnpm ontoly coverage .
   pnpm ontoly stats .
   ```

4. Prefer Ontoly graph queries before repository-wide source search:

   ```bash
   pnpm ontoly architecture --json
   pnpm ontoly report dependencies --format markdown
   pnpm ontoly report routes --format markdown
   pnpm ontoly query impact <node-id>
   pnpm ontoly trace <node-id-or-name>
   ```

5. Start Ontoly MCP when the environment supports MCP-backed tools:

   ```bash
   pnpm ontoly mcp
   ```

6. Use source files only when the graph is missing, stale, low confidence, or insufficient for the question.

## Common Questions

- "Explain this repository."
- "Which service owns authentication?"
- "Trace the login flow."
- "What breaks if I remove this repository/service/function?"
- "Which packages depend on this module?"
- "Where is this environment variable read?"
- "Which routes are protected by auth?"

## Evidence Rules

When answering, cite graph evidence:

- graph hash
- node ids
- relationship types
- source spans when available
- diagnostics or confidence warnings
- fallback reason if source files were inspected

## Install Official Ontoly Skills

Ontoly also publishes task-specific Agent Skills in its own repository. To inspect or install them with the open `skills` CLI:

```bash
npx skills add 0xsarwagya/ontoly --list
npx skills add 0xsarwagya/ontoly --skill architecture-review
npx skills add 0xsarwagya/ontoly --skill impact-analysis
npx skills add 0xsarwagya/ontoly --skill request-tracing
```

Use those official skills when the task maps directly to one of their workflows.
