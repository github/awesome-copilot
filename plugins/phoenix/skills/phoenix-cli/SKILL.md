---
name: phoenix-cli
description: Debug LLM applications using the Phoenix CLI. Fetch traces, analyze errors, review experiments, inspect datasets, and query the GraphQL API. Use when debugging AI/LLM applications, analyzing trace data, working with Phoenix observability, or investigating LLM performance issues.
license: Apache-2.0
compatibility: Requires Node.js (for npx) or global install of @arizeai/phoenix-cli. Optionally requires jq for JSON processing.
metadata:
  author: arize-ai
  version: "2.0.0"
---

# Phoenix CLI

## Invocation

```bash
px <resource> <action>                          # if installed globally
npx @arizeai/phoenix-cli <resource> <action>    # no install required
```

The CLI uses singular resource commands with subcommands like `list` and `get`:

```bash
px trace list
px trace get <trace-id>
px span list
px dataset list
px dataset get <name>
```

## Setup

```bash
export PHOENIX_HOST=http://localhost:6006
export PHOENIX_PROJECT=my-project
export PHOENIX_API_KEY=your-api-key  # if auth is enabled
```

Always use `--format raw --no-progress` when piping to `jq`.

## Traces

```bash
px trace list --limit 20 --format raw --no-progress | jq .
px trace list --last-n-minutes 60 --limit 20 --format raw --no-progress | jq '.[] | select(.status == "ERROR")'
px trace list --format raw --no-progress | jq 'sort_by(-.duration) | .[0:5]'
px trace get <trace-id> --format raw | jq .
px trace get <trace-id> --format raw | jq '.spans[] | select(.status_code != "OK")'
```

## Spans

```bash
px span list --limit 20                                    # recent spans (table view)
px span list --last-n-minutes 60 --limit 50                # spans from last hour
px span list --span-kind LLM --limit 10                    # only LLM spans
px span list --status-code ERROR --limit 20                # only errored spans
px span list --name chat_completion --limit 10             # filter by span name
px span list --trace-id <id> --format raw --no-progress | jq .   # all spans for a trace
px span list --include-annotations --limit 10              # include annotation scores
px span list output.json --limit 100                       # save to JSON file
px span list --format raw --no-progress | jq '.[] | select(.status_code == "ERROR")'
```

### Span JSON shape

```
Span
  name, span_kind ("LLM"|"CHAIN"|"TOOL"|"RETRIEVER"|"EMBEDDING"|"AGENT"|"RERANKER"|"GUARDRAIL"|"EVALUATOR"|"UNKNOWN")
  status_code ("OK"|"ERROR"|"UNSET"), status_message
  context.span_id, context.trace_id, parent_id
  start_time, end_time
  attributes (same as trace span attributes above)
  annotations[] (with --include-annotations)
    name, result { score, label, explanation }
```

### Trace JSON shape

```
Trace
  traceId, status ("OK"|"ERROR"), duration (ms), startTime, endTime
  rootSpan  — top-level span (parent_id: null)
  spans[]
    name, span_kind ("LLM"|"CHAIN"|"TOOL"|"RETRIEVER"|"EMBEDDING"|"AGENT")
    status_code ("OK"|"ERROR"), parent_id, context.span_id
    attributes
      input.value, output.value          — raw input/output
      llm.model_name, llm.provider
      llm.token_count.prompt/completion/total
      llm.token_count.prompt_details.cache_read
      llm.token_count.completion_details.reasoning
      llm.input_messages.{N}.message.role/content
      llm.output_messages.{N}.message.role/content
      llm.invocation_parameters          — JSON string (temperature, etc.)
      exception.message                  — set if span errored
```

## Sessions

```bash
px session list --limit 10 --format raw --no-progress | jq .
px session list --order asc --format raw --no-progress | jq '.[].session_id'
px session get <session-id> --format raw | jq .
px session get <session-id> --include-annotations --format raw | jq '.annotations'
```

### Session JSON shape

```
SessionData
  id, session_id, project_id
  start_time, end_time
  traces[]
    id, trace_id, start_time, end_time

SessionAnnotation (with --include-annotations)
  id, name, annotator_kind ("LLM"|"CODE"|"HUMAN"), session_id
  result { label, score, explanation }
  metadata, identifier, source, created_at, updated_at
```

## Datasets / Experiments / Prompts

```bash
px dataset list --format raw --no-progress | jq '.[].name'
px dataset get <name> --format raw | jq '.examples[] | {input, output: .expected_output}'
px experiment list --dataset <name> --format raw --no-progress | jq '.[] | {id, name, failed_run_count}'
px experiment get <id> --format raw --no-progress | jq '.[] | select(.error != null) | {input, error}'
px prompt list --format raw --no-progress | jq '.[].name'
px prompt get <name> --format text --no-progress   # plain text, ideal for piping to AI
```

## GraphQL

For ad-hoc queries not covered by the commands above. Output is `{"data": {...}}`.

```bash
px api graphql '{ projectCount datasetCount promptCount evaluatorCount }'
px api graphql '{ projects { edges { node { name traceCount tokenCountTotal } } } }' | jq '.data.projects.edges[].node'
px api graphql '{ datasets { edges { node { name exampleCount experimentCount } } } }' | jq '.data.datasets.edges[].node'
px api graphql '{ evaluators { edges { node { name kind } } } }' | jq '.data.evaluators.edges[].node'

# Introspect any type
px api graphql '{ __type(name: "Project") { fields { name type { name } } } }' | jq '.data.__type.fields[]'
```

Key root fields: `projects`, `datasets`, `prompts`, `evaluators`, `projectCount`, `datasetCount`, `promptCount`, `evaluatorCount`, `viewer`.

## Docs

Download Phoenix documentation markdown for local use by coding agents.

```bash
px docs fetch                                # fetch default workflow docs to .px/docs
px docs fetch --workflow tracing             # fetch only tracing docs
px docs fetch --workflow tracing --workflow evaluation
px docs fetch --dry-run                      # preview what would be downloaded
px docs fetch --refresh                      # clear .px/docs and re-download
px docs fetch --output-dir ./my-docs         # custom output directory
```

Key options: `--workflow` (repeatable, values: `tracing`, `evaluation`, `datasets`, `prompts`, `integrations`, `sdk`, `self-hosting`, `all`), `--dry-run`, `--refresh`, `--output-dir` (default `.px/docs`), `--workers` (default 10).
