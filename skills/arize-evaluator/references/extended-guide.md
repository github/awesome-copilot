# Arize Evaluator Skill: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Data Granularity

The `--data-granularity` flag controls what unit of data the evaluator scores. It defaults to `span` and only applies to **project tasks** (not dataset/experiment tasks — those evaluate experiment runs directly).

| Level | What it evaluates | Use for | Result column prefix |
|-------|-------------------|---------|---------------------|
| `span` (default) | Individual spans | Q&A correctness, hallucination, relevance | `eval.{name}.label` / `.score` / `.explanation` |
| `trace` | All spans in a trace, grouped by `context.trace_id` | Agent trajectory, task correctness — anything that needs the full call chain | `trace_eval.{name}.label` / `.score` / `.explanation` |
| `session` | All traces in a session, grouped by `attributes.session.id` and ordered by start time | Multi-turn coherence, overall tone, conversation quality | `session_eval.{name}.label` / `.score` / `.explanation` |

### How trace and session aggregation works

For **trace** granularity, spans sharing the same `context.trace_id` are grouped together. Column values used by the evaluator template are comma-joined into a single string (each value truncated to 100K characters) before being passed to the judge model.

For **session** granularity, the same trace-level grouping happens first, then traces are ordered by `start_time` and grouped by `attributes.session.id`. Session-level values are capped at 100K characters total.

### The `{conversation}` template variable

At session granularity, `{conversation}` is a special template variable that renders as a JSON array of `{input, output}` turns across all traces in the session, built from `attributes.input.value` / `attributes.llm.input_messages` (input side) and `attributes.output.value` / `attributes.llm.output_messages` (output side).

At span or trace granularity, `{conversation}` is treated as a regular template variable and resolved via column mappings like any other.

### Multi-evaluator tasks

A task can contain evaluators at different granularities. At runtime the system uses the **highest** granularity (session > trace > span) for data fetching and automatically **splits into one child run per evaluator**. Per-evaluator `query_filter` in the task's evaluators JSON further narrows which spans are included (e.g., only tool-call spans within a session).

---

## Workflow A: Create an evaluator for a project

Use this when the user says something like *"create an evaluator for my Playground Traces project"*.

### Step 1: Confirm the project name

`ax spans export` accepts a project name directly — no ID lookup needed. If you don't know the project name, list available projects:

```bash
ax projects list --space SPACE -o json
```

Find the entry whose `"name"` matches (case-insensitive) and use that name as `PROJECT` in subsequent commands. If you later hit a validation error with a name, fall back to using the project's `"id"` (a base64 string) instead.

### Step 2: Understand what to evaluate

If the user specified the evaluator type (hallucination, correctness, relevance, etc.) → skip to Step 3.

If not, sample recent spans to base the evaluator on actual data:

```bash
ax spans export PROJECT --space SPACE -l 10 --days 30 --stdout
```

Inspect `attributes.input`, `attributes.output`, span kinds, and any existing annotations. Identify failure modes (e.g. hallucinated facts, off-topic answers, missing context) and propose **1–3 concrete evaluator ideas**. Let the user pick.

Each suggestion must include: the evaluator name (bold), a one-sentence description of what it judges, and the binary label pair in parentheses. Format each like:

1. **Name** — Description of what is being judged. (`label_a` / `label_b`)

Example:
1. **Response Correctness** — Does the agent's response correctly address the user's financial query? (`correct` / `incorrect`)
2. **Hallucination** — Does the response fabricate facts not grounded in retrieved context? (`factual` / `hallucinated`)

### Step 3: Confirm or create an AI integration

```bash
ax ai-integrations list --space SPACE -o json
```

If a suitable integration exists, note its ID. If not, create one using the **arize-ai-provider-integration** skill. Ask the user which provider/model they want for the judge.

### Step 4: Create the evaluator

Use the template design best practices below. Keep the evaluator name and variables **generic** — the task (Step 6) handles project-specific wiring via `column_mappings`.

```bash
ax evaluators create \
  --name "Hallucination" \
  --space SPACE \
  --template-name "hallucination" \
  --commit-message "Initial version" \
  --ai-integration-id INT_ID \
  --model-name "gpt-4o" \
  --include-explanations \
  --use-function-calling \
  --classification-choices '{"factual": 1, "hallucinated": 0}' \
  --template 'You are an evaluator. Given the user question and the model response, decide if the response is factual or contains unsupported claims.

User question: {input}

Model response: {output}

Respond with exactly one of these labels: hallucinated, factual'
```

### Step 5: Ask — backfill, continuous, or both?

**Recommended approach:** Always start with a small backfill (~100 historical spans) to validate the evaluator before turning on continuous monitoring. This lets you catch column mapping errors, wrong span kinds, and template issues on known data before scoring all future production spans. Only enable continuous after a backfill confirms correct scoring.

Before creating the task, ask:

> "Would you like to:
> (a) Run a **backfill** on historical spans (one-time)?
> (b) Set up **continuous** evaluation on new spans going forward?
> (c) **Both** — backfill first to validate, then keep scoring new spans automatically? (recommended)"

### Step 6: Determine column mappings from real span data

Do not guess paths. Pull a sample and inspect what fields are actually present:

```bash
ax spans export PROJECT --space SPACE -l 5 --days 7 --stdout
```

For each template variable (`{input}`, `{output}`, `{context}`), find the matching JSON path. Common starting points — **always verify on your actual data before using**:

| Template var | LLM span | CHAIN span |
|---|---|---|
| `input` | `attributes.input.value` | `attributes.input.value` |
| `output` | `attributes.llm.output_messages.0.message.content` | `attributes.output.value` |
| `context` | `attributes.retrieval.documents.contents` | — |
| `tool_output` | `attributes.input.value` (fallback) | `attributes.output.value` |

**Validate span kind alignment:** If the evaluator prompt assumes LLM final text but the task targets CHAIN spans (or vice versa), runs can cancel or score the wrong text. Make sure the `query_filter` on the task matches the span kind you mapped.

**`query_filter` only works on indexed attributes:** The `query_filter` in the evaluators JSON is evaluated against the eval index, not the raw span store. Attributes under `attributes.metadata.*` or custom keys may not be indexed and will silently match nothing. Use well-known indexed attributes like `span_kind` or `attributes.llm.model_name` for filtering. If a filter returns 0 spans despite data existing, try removing the filter as a diagnostic step.

**Full example `--evaluators` JSON:**

```json
[
  {
    "evaluator_id": "EVAL_ID",
    "query_filter": "span_kind = 'LLM'",
    "column_mappings": {
      "input": "attributes.input.value",
      "output": "attributes.llm.output_messages.0.message.content",
      "context": "attributes.retrieval.documents.contents"
    }
  }
]
```

Include a mapping for **every** variable the template references. Omitting one causes runs to produce no valid scores.

### Step 7: Create the task

**Backfill only (a):**
```bash
ax tasks create \
  --name "Hallucination Backfill" \
  --task-type template_evaluation \
  --project PROJECT \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --no-continuous
```

**Continuous only (b):**
```bash
ax tasks create \
  --name "Hallucination Monitor" \
  --task-type template_evaluation \
  --project PROJECT \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --is-continuous \
  --sampling-rate 0.1
```

**Both (c):** Use `--is-continuous` on create, then also trigger a backfill run in Step 8.

### Step 8: Trigger a backfill run (if requested)

> **Eval index lag:** The eval index is built asynchronously from the primary trace store and can lag **1–2 hours**. For your first test run, use a time window ending at least 2 hours in the past. If you set `--data-end-time` to "now" on spans ingested in the last hour, the run will complete successfully but score 0 spans.

First find what time range has data:
```bash
ax spans export PROJECT --space SPACE -l 100 --days 1 --stdout   # try last 24h first
ax spans export PROJECT --space SPACE -l 100 --days 7 --stdout   # widen if empty
```

Use the `start_time` / `end_time` fields from real spans to set the window. For the first validation run, cap `--max-spans` at ~100 to get quick feedback:

```bash
ax tasks trigger-run TASK_ID \
  --data-start-time "2026-03-20T00:00:00" \
  --data-end-time "2026-03-21T23:59:59" \
  --max-spans 100 \
  --wait
```

Review scores and explanations before widening to the full backfill or enabling continuous.

---

## Save Credentials for Future Use

See references/ax-profiles.md § Save Credentials for Future Use.
