---
name: phoenix-cli
description: Debug LLM applications using the Phoenix CLI. Fetch traces, analyze errors, structure trace review with open coding and axial coding, inspect datasets, review experiments, query annotation configs, and use the GraphQL API. Use whenever the user is analyzing traces or spans, investigating LLM/agent failures, deciding what to do after instrumenting an app, building failure taxonomies, choosing what evals to write, or asking "what's going wrong", "what kinds of mistakes", or "where do I focus" — even without naming a technique.
license: Apache-2.0
compatibility: Requires Node.js (for npx) or global install of @arizeai/phoenix-cli. Optionally requires jq for JSON processing.
metadata:
  author: arize-ai
  version: "3.3.0"
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
px trace annotate <trace-id>
px trace add-note <trace-id>
px span list
px span annotate <span-id>
px span add-note <span-id>
px session list
px session get <session-id>
px session annotate <session-id>
px session add-note <session-id>
px dataset list
px dataset get <name>
px project list
px annotation-config list
px auth status
```

## Setup

```bash
export PHOENIX_HOST=http://localhost:6006
export PHOENIX_PROJECT=my-project
export PHOENIX_API_KEY=your-api-key  # if auth is enabled
```

Always use `--format raw --no-progress` when piping to `jq`.

## Quick Reference

| Task | Files |
| ---- | ----- |
| Look at sampled traces and write specific notes about what went wrong (no taxonomy yet) | [references/open-coding](references/open-coding.md) |
| Group those notes into a structured failure taxonomy and quantify what matters | [references/axial-coding](references/axial-coding.md) |

## Workflows

**"What do I do after instrumenting?" / "Where do I focus?" / "What's going wrong?"**
[open-coding](references/open-coding.md) → [axial-coding](references/axial-coding.md) → build evals for the top categories.

## Reference Categories

| Prefix | Description |
| ------ | ----------- |
| `references/open-coding` | Free-form notes against sampled traces — reach for it whenever the user wants to make sense of traces but has no failure categories yet |
| `references/axial-coding` | Inductive grouping of notes into a MECE taxonomy with counts — reach for it whenever the user has observations and needs categories or eval targets |

## Auth

```bash
px auth status                                # check connection and authentication
px auth status --endpoint http://other:6006   # check a specific endpoint
```

## Projects

```bash
px project list                                            # list all projects (table view)
px project list --format raw --no-progress | jq '.[].name' # project names as JSON
```

## Traces

```bash
px trace list --limit 20 --format raw --no-progress | jq .
px trace list --last-n-minutes 60 --limit 20 --format raw --no-progress | jq '.[] | select(.status == "ERROR")'
px trace list --since 2025-01-15T00:00:00Z --limit 50 --format raw --no-progress | jq .
px trace list --format raw --no-progress | jq 'sort_by(-.duration) | .[0:5]'
px trace list --include-notes --format raw --no-progress | jq '.[].notes'
px trace get <trace-id> --format raw | jq .
px trace get <trace-id> --format raw | jq '.spans[] | select(.status_code != "OK")'
px trace get <trace-id> --include-notes --format raw | jq '.notes'
px trace annotate <trace-id> --name reviewer --label pass
px trace annotate <trace-id> --name reviewer --score 0.9 --format raw --no-progress
px trace add-note <trace-id> --text "needs follow-up"
```

### Trace JSON shape

```
Trace
  traceId, status ("OK"|"ERROR"), duration (ms), startTime, endTime
  annotations[] (with --include-annotations, excludes note)
    name, result { score, label, explanation }
  notes[] (with --include-notes)
    name="note", result { explanation }
  rootSpan  — top-level span (parent_id: null)
  spans[]
    name, span_kind ("LLM"|"CHAIN"|"TOOL"|"RETRIEVER"|"EMBEDDING"|"AGENT"|"RERANKER"|"GUARDRAIL"|"EVALUATOR"|"UNKNOWN")
    status_code ("OK"|"ERROR"|"UNSET"), parent_id, context.span_id
    notes[] (with --include-notes)
      name="note", result { explanation }
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

## Spans

```bash
px span list --limit 20                                    # recent spans (table view)
px span list --last-n-minutes 60 --limit 50                # spans from last hour
px span list --since 2025-01-15T00:00:00Z --limit 50       # spans since a timestamp
px span list --span-kind LLM --limit 10                    # only LLM spans
px span list --status-code ERROR --limit 20                # only errored spans
px span list --name chat_completion --limit 10             # filter by span name
px span list --trace-id <id> --format raw --no-progress | jq .   # all spans for a trace
px span list --parent-id null --limit 10                   # only root spans
px span list --parent-id <span-id> --limit 10              # only children of a span
px span list --include-annotations --limit 10              # include annotation scores
px span list --include-notes --limit 10                    # include span notes
px span list --attribute llm.model_name:gpt-4 --limit 10  # filter by string attribute
px span list --attribute llm.token_count.total:500 --limit 10  # filter by numeric attribute
px span list --attribute 'user.id:"12345"' --limit 10     # force string match for numeric-looking value
px span list --attribute session.id:sess:abc:123 --limit 20  # colon in value OK (split on first colon only)
px span list --attribute llm.model_name:gpt-4 --attribute session.id:abc --limit 10  # AND multiple filters
px span list output.json --limit 100                       # save to JSON file
px span list --format raw --no-progress | jq '.[] | select(.status_code == "ERROR")'
px span annotate <span-id> --name reviewer --label pass
px span annotate <span-id> --name checker --score 1 --annotator-kind CODE
px span add-note <span-id> --text "verified by agent"
```

### Span JSON shape

```
Span
  name, span_kind ("LLM"|"CHAIN"|"TOOL"|"RETRIEVER"|"EMBEDDING"|"AGENT"|"RERANKER"|"GUARDRAIL"|"EVALUATOR"|"UNKNOWN")
  status_code ("OK"|"ERROR"|"UNSET"), status_message
  context.span_id, context.trace_id, parent_id
  start_time, end_time
  attributes
    input.value, output.value          — raw input/output
    llm.model_name, llm.provider
    llm.token_count.prompt/completion/total
    llm.input_messages.{N}.message.role/content
    llm.output_messages.{N}.message.role/content
    llm.invocation_parameters          — JSON string (temperature, etc.)
    exception.message                  — set if span errored
  annotations[] (with --include-annotations, excludes note)
    name, result { score, label, explanation }
  notes[] (with --include-notes)
    name="note", result { explanation }
```

## Sessions

```bash
px session list --limit 10 --format raw --no-progress | jq .
px session list --order asc --format raw --no-progress | jq '.[].session_id'
px session list --include-annotations --include-notes --format raw --no-progress | jq '.[].notes'
px session get <session-id> --format raw | jq .
px session get <session-id> --include-annotations --format raw | jq '.session.annotations'
px session get <session-id> --include-notes --format raw | jq '.session.notes'
px session annotate <session-id> --name reviewer --label pass
px session annotate <session-id> --name reviewer --score 0.9 --format raw --no-progress
px session add-note <session-id> --text "verified by agent"
```

### Session JSON shape

```
SessionData
  id, session_id, project_id
  start_time, end_time
  annotations[] (with --include-annotations, excludes note)
    name, result { score, label, explanation }
  notes[] (with --include-notes)
    name="note", result { explanation }
  traces[]
    id, trace_id, start_time, end_time
```

## Datasets / Experiments / Prompts

```bash
px dataset list --format raw --no-progress | jq '.[].name'
px dataset get <name> --format raw | jq '.examples[] | {input, output: .expected_output}'
px dataset get <name> --split train --format raw | jq .    # filter by split
px dataset get <name> --version <version-id> --format raw | jq .
px experiment list --dataset <name> --format raw --no-progress | jq '.[] | {id, name, failed_run_count}'
px experiment get <id> --format raw --no-progress | jq '.[] | select(.error != null) | {input, error}'
px prompt list --format raw --no-progress | jq '.[].name'
px prompt get <name> --format text --no-progress   # plain text, ideal for piping to AI
```

## Annotation Configs

```bash
px annotation-config list                                           # list all configs (table view)
px annotation-config list --format raw --no-progress | jq '.[].name' # config names as JSON
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
