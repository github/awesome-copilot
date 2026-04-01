---
name: arize-evaluator
description: "INVOKE THIS SKILL for LLM-as-judge evaluation workflows on Arize: creating/updating evaluators, running evaluations on spans or experiments, tasks, trigger-run, column mapping, and continuous monitoring. Use when the user says: create an evaluator, LLM judge, hallucination/faithfulness/correctness/relevance, run eval, score my spans or experiment, ax tasks, trigger-run, trigger eval, column mapping, continuous monitoring, query filter for evals, evaluator version, or improve an evaluator prompt."
---

# Arize Evaluator Skill

This skill covers designing, creating, and running **LLM-as-judge evaluators** on Arize. An evaluator defines the judge; a **task** is how you run it against real data.

---

## Prerequisites

Proceed directly with the task — run the `ax` command you need. Do NOT check versions, env vars, or profiles upfront.

If an `ax` command fails, troubleshoot based on the error:
- `command not found` or version error → see references/ax-setup.md
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong: check `.env` for `ARIZE_API_KEY` and use it to create/update the profile via references/ax-profiles.md. If `.env` has no key either, ask the user for their Arize API key (https://app.arize.com/admin > API Keys)
- Space ID unknown → check `.env` for `ARIZE_SPACE_ID`, or run `ax spaces list -o json`, or ask the user
- LLM provider call fails (missing OPENAI_API_KEY / ANTHROPIC_API_KEY) → check `.env`, load if present, otherwise ask the user

---

## Concepts

### What is an Evaluator?

An **evaluator** is an LLM-as-judge definition. It contains:

| Field | Description |
|-------|-------------|
| **Template** | The judge prompt. Uses `{variable}` placeholders (e.g. `{input}`, `{output}`, `{context}`) that get filled in at run time via a task's column mappings. |
| **Classification choices** | The set of allowed output labels (e.g. `factual` / `hallucinated`). Binary is the default and most common. Each choice can optionally carry a numeric score. |
| **AI Integration** | Stored LLM provider credentials (OpenAI, Anthropic, Bedrock, etc.) the evaluator uses to call the judge model. |
| **Model** | The specific judge model (e.g. `gpt-4o`, `claude-sonnet-4-5`). |
| **Invocation params** | Optional JSON of model settings like `{"temperature": 0}`. Low temperature is recommended for reproducibility. |
| **Optimization direction** | Whether higher scores are better (`maximize`) or worse (`minimize`). Sets how the UI renders trends. |
| **Data granularity** | Whether the evaluator runs at the **span**, **trace**, or **session** level. Most evaluators run at the span level. |

Evaluators are **versioned** — every prompt or model change creates a new immutable version. The most recent version is active.

### What is a Task?

A **task** is how you run one or more evaluators against real data. Tasks are attached to a **project** (live traces/spans) or a **dataset** (experiment runs). A task contains:

| Field | Description |
|-------|-------------|
| **Evaluators** | List of evaluators to run. You can run multiple in one task. |
| **Column mappings** | Maps each evaluator's template variables to actual field paths on spans or experiment runs (e.g. `"input" → "attributes.input.value"`). This is what makes evaluators portable across projects and experiments. |
| **Query filter** | SQL-style expression to select which spans/runs to evaluate (e.g. `"span_kind = 'LLM'"`). Optional but important for precision. |
| **Continuous** | For project tasks: whether to automatically score new spans as they arrive. |
| **Sampling rate** | For continuous project tasks: fraction of new spans to evaluate (0–1). |

---

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

## Basic CRUD

### AI Integrations

AI integrations store the LLM provider credentials the evaluator uses. For full CRUD — listing, creating for all providers (OpenAI, Anthropic, Azure, Bedrock, Vertex, Gemini, NVIDIA NIM, custom), updating, and deleting — use the **arize-ai-provider-integration** skill.

Quick reference for the common case (OpenAI):

```bash
# Check for an existing integration first
ax ai-integrations list --space-id SPACE_ID

# Create if none exists
ax ai-integrations create \
  --name "My OpenAI Integration" \
  --provider openAI \
  --api-key $OPENAI_API_KEY
```

Copy the returned integration ID — it is required for `ax evaluators create --ai-integration-id`.

### Evaluators

```bash
# List / Get
ax evaluators list --space-id SPACE_ID
ax evaluators get EVALUATOR_ID
ax evaluators list-versions EVALUATOR_ID
ax evaluators get-version VERSION_ID

# Create (creates the evaluator and its first version)
ax evaluators create \
  --name "Answer Correctness" \
  --space-id SPACE_ID \
  --description "Judges if the model answer is correct" \
  --template-name "correctness" \
  --commit-message "Initial version" \
  --ai-integration-id INT_ID \
  --model-name "gpt-4o" \
  --include-explanations \
  --use-function-calling \
  --classification-choices '{"correct": 1, "incorrect": 0}' \
  --template 'You are an evaluator. Given the user question and the model response, decide if the response correctly answers the question.

User question: {input}

Model response: {output}

Respond with exactly one of these labels: correct, incorrect'

# Create a new version (for prompt or model changes — versions are immutable)
ax evaluators create-version EVALUATOR_ID \
  --commit-message "Added context grounding" \
  --template-name "correctness" \
  --ai-integration-id INT_ID \
  --model-name "gpt-4o" \
  --include-explanations \
  --classification-choices '{"correct": 1, "incorrect": 0}' \
  --template 'Updated prompt...

{input} / {output} / {context}'

# Update metadata only (name, description — not prompt)
ax evaluators update EVALUATOR_ID \
  --name "New Name" \
  --description "Updated description"

# Delete (permanent — removes all versions)
ax evaluators delete EVALUATOR_ID
```

**Key flags for `create`:**

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | yes | Evaluator name (unique within space) |
| `--space-id` | yes | Space to create in |
| `--template-name` | yes | Eval column name — alphanumeric, spaces, hyphens, underscores |
| `--commit-message` | yes | Description of this version |
| `--ai-integration-id` | yes | AI integration ID (from above) |
| `--model-name` | yes | Judge model (e.g. `gpt-4o`) |
| `--template` | yes | Prompt with `{variable}` placeholders (single-quoted in bash) |
| `--classification-choices` | yes | JSON object mapping choice labels to numeric scores e.g. `'{"correct": 1, "incorrect": 0}'` |
| `--description` | no | Human-readable description |
| `--include-explanations` | no | Include reasoning alongside the label |
| `--use-function-calling` | no | Prefer structured function-call output |
| `--invocation-params` | no | JSON of model params e.g. `'{"temperature": 0}'` |
| `--data-granularity` | no | `span` (default), `trace`, or `session`. Only relevant for project tasks, not dataset/experiment tasks. See Data Granularity section. |
| `--provider-params` | no | JSON object of provider-specific parameters |

### Tasks

```bash
# List / Get
ax tasks list --space-id SPACE_ID
ax tasks list --project-id PROJ_ID
ax tasks list --dataset-id DATASET_ID
ax tasks get TASK_ID

# Create (project — continuous)
ax tasks create \
  --name "Correctness Monitor" \
  --task-type template_evaluation \
  --project-id PROJ_ID \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --is-continuous \
  --sampling-rate 0.1

# Create (project — one-time / backfill)
ax tasks create \
  --name "Correctness Backfill" \
  --task-type template_evaluation \
  --project-id PROJ_ID \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --no-continuous

# Create (experiment / dataset)
ax tasks create \
  --name "Experiment Scoring" \
  --task-type template_evaluation \
  --dataset-id DATASET_ID \
  --experiment-ids "EXP_ID_1,EXP_ID_2" \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"output": "output"}}]' \
  --no-continuous

# Trigger a run (project task — use data window)
ax tasks trigger-run TASK_ID \
  --data-start-time "2026-03-20T00:00:00" \
  --data-end-time "2026-03-21T23:59:59" \
  --wait

# Trigger a run (experiment task — use experiment IDs)
ax tasks trigger-run TASK_ID \
  --experiment-ids "EXP_ID_1" \
  --wait

# Monitor
ax tasks list-runs TASK_ID
ax tasks get-run RUN_ID
ax tasks wait-for-run RUN_ID --timeout 300
ax tasks cancel-run RUN_ID --force
```

**Time format for trigger-run:** `2026-03-21T09:00:00` — no trailing `Z`.

**Additional trigger-run flags:**

| Flag | Description |
|------|-------------|
| `--max-spans` | Cap processed spans (default 10,000) |
| `--override-evaluations` | Re-score spans that already have labels |
| `--wait` / `-w` | Block until the run finishes |
| `--timeout` | Seconds to wait with `--wait` (default 600) |
| `--poll-interval` | Poll interval in seconds when waiting (default 5) |

**Run status guide:**

| Status | Meaning |
|--------|---------|
| `completed`, 0 spans | No spans in eval index for that window — widen time range |
| `cancelled` ~1s | Integration credentials invalid |
| `cancelled` ~3min | Found spans but LLM call failed — check model name or key |
| `completed`, N > 0 | Success — check scores in UI |

---

## Workflow A: Create an evaluator for a project

Use this when the user says something like *"create an evaluator for my Playground Traces project"*.

### Step 1: Resolve the project name to an ID

`ax spans export` requires a project **ID**, not a name — passing a name causes a validation error. Always look up the ID first:

```bash
ax projects list --space-id SPACE_ID -o json
```

Find the entry whose `"name"` matches (case-insensitive). Copy its `"id"` (a base64 string).

### Step 2: Understand what to evaluate

If the user specified the evaluator type (hallucination, correctness, relevance, etc.) → skip to Step 3.

If not, sample recent spans to base the evaluator on actual data:

```bash
ax spans export PROJECT_ID --space-id SPACE_ID -l 10 --days 30 --stdout
```

Inspect `attributes.input`, `attributes.output`, span kinds, and any existing annotations. Identify failure modes (e.g. hallucinated facts, off-topic answers, missing context) and propose **1–3 concrete evaluator ideas**. Let the user pick.

Each suggestion must include: the evaluator name (bold), a one-sentence description of what it judges, and the binary label pair in parentheses. Format each like:

1. **Name** — Description of what is being judged. (`label_a` / `label_b`)

Example:
1. **Response Correctness** — Does the agent's response correctly address the user's financial query? (`correct` / `incorrect`)
2. **Hallucination** — Does the response fabricate facts not grounded in retrieved context? (`factual` / `hallucinated`)

### Step 3: Confirm or create an AI integration

```bash
ax ai-integrations list --space-id SPACE_ID -o json
```

If a suitable integration exists, note its ID. If not, create one using the **arize-ai-provider-integration** skill. Ask the user which provider/model they want for the judge.

### Step 4: Create the evaluator

Use the template design best practices below. Keep the evaluator name and variables **generic** — the task (Step 6) handles project-specific wiring via `column_mappings`.

```bash
ax evaluators create \
  --name "Hallucination" \
  --space-id SPACE_ID \
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

Before creating the task, ask:

> "Would you like to:
> (a) Run a **backfill** on historical spans (one-time)?
> (b) Set up **continuous** evaluation on new spans going forward?
> (c) **Both** — backfill now and keep scoring new spans automatically?"

### Step 6: Determine column mappings from real span data

Do not guess paths. Pull a sample and inspect what fields are actually present:

```bash
ax spans export PROJECT_ID --space-id SPACE_ID -l 5 --days 7 --stdout
```

For each template variable (`{input}`, `{output}`, `{context}`), find the matching JSON path. Common starting points — **always verify on your actual data before using**:

| Template var | LLM span | CHAIN span |
|---|---|---|
| `input` | `attributes.input.value` | `attributes.input.value` |
| `output` | `attributes.llm.output_messages.0.message.content` | `attributes.output.value` |
| `context` | `attributes.retrieval.documents.contents` | — |
| `tool_output` | `attributes.input.value` (fallback) | `attributes.output.value` |

**Validate span kind alignment:** If the evaluator prompt assumes LLM final text but the task targets CHAIN spans (or vice versa), runs can cancel or score the wrong text. Make sure the `query_filter` on the task matches the span kind you mapped.

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
  --project-id PROJECT_ID \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --no-continuous
```

**Continuous only (b):**
```bash
ax tasks create \
  --name "Hallucination Monitor" \
  --task-type template_evaluation \
  --project-id PROJECT_ID \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --is-continuous \
  --sampling-rate 0.1
```

**Both (c):** Use `--is-continuous` on create, then also trigger a backfill run in Step 8.

### Step 8: Trigger a backfill run (if requested)

First find what time range has data:
```bash
ax spans export PROJECT_ID --space-id SPACE_ID -l 100 --days 1 --stdout   # try last 24h first
ax spans export PROJECT_ID --space-id SPACE_ID -l 100 --days 7 --stdout   # widen if empty
```

Use the `start_time` / `end_time` fields from real spans to set the window. Use the most recent data for your first test run.

```bash
ax tasks trigger-run TASK_ID \
  --data-start-time "2026-03-20T00:00:00" \
  --data-end-time "2026-03-21T23:59:59" \
  --wait
```

---

## Workflow B: Create an evaluator for an experiment

Use this when the user says something like *"create an evaluator for my experiment"* or *"evaluate my dataset runs"*.

**If the user says "dataset" but doesn't have an experiment:** A task must target an experiment (not a bare dataset). Ask:
> "Evaluation tasks run against experiment runs, not datasets directly. Would you like help creating an experiment on that dataset first?"

If yes, use the **arize-experiment** skill to create one, then return here.

### Step 1: Resolve dataset and experiment

```bash
ax datasets list --space-id SPACE_ID -o json
ax experiments list --dataset-id DATASET_ID -o json
```

Note the dataset ID and the experiment ID(s) to score.

### Step 2: Understand what to evaluate

If the user specified the evaluator type → skip to Step 3.

If not, inspect a recent experiment run to base the evaluator on actual data:

```bash
ax experiments export EXPERIMENT_ID --stdout | python3 -c "import sys,json; runs=json.load(sys.stdin); print(json.dumps(runs[0], indent=2))"
```

Look at the `output`, `input`, `evaluations`, and `metadata` fields. Identify gaps (metrics the user cares about but doesn't have yet) and propose **1–3 evaluator ideas**. Each suggestion must include: the evaluator name (bold), a one-sentence description, and the binary label pair in parentheses — same format as Workflow A, Step 2.

### Step 3: Confirm or create an AI integration

Same as Workflow A, Step 3.

### Step 4: Create the evaluator

Same as Workflow A, Step 4. Keep variables generic.

### Step 5: Determine column mappings from real run data

Run data shape differs from span data. Inspect:

```bash
ax experiments export EXPERIMENT_ID --stdout | python3 -c "import sys,json; runs=json.load(sys.stdin); print(json.dumps(runs[0], indent=2))"
```

Common mapping for experiment runs:
- `output` → `"output"` (top-level field on each run)
- `input` → check if it's on the run or embedded in the linked dataset examples

If `input` is not on the run JSON, export dataset examples to find the path:
```bash
ax datasets export DATASET_ID --stdout | python3 -c "import sys,json; ex=json.load(sys.stdin); print(json.dumps(ex[0], indent=2))"
```

### Step 6: Create the task

```bash
ax tasks create \
  --name "Experiment Correctness" \
  --task-type template_evaluation \
  --dataset-id DATASET_ID \
  --experiment-ids "EXP_ID" \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"output": "output"}}]' \
  --no-continuous
```

### Step 7: Trigger and monitor

```bash
ax tasks trigger-run TASK_ID \
  --experiment-ids "EXP_ID" \
  --wait

ax tasks list-runs TASK_ID
ax tasks get-run RUN_ID
```

---

## Best Practices for Template Design

### 1. Use generic, portable variable names

Use `{input}`, `{output}`, and `{context}` — not names tied to a specific project or span attribute (e.g. do not use `{attributes_input_value}`). The evaluator itself stays abstract; the **task's `column_mappings`** is where you wire it to the actual fields in a specific project or experiment. This lets the same evaluator run across multiple projects and experiments without modification.

### 2. Default to binary labels

Use exactly two clear string labels (e.g. `hallucinated` / `factual`, `correct` / `incorrect`, `pass` / `fail`). Binary labels are:
- Easiest for the judge model to produce consistently
- Most common in the industry
- Simplest to interpret in dashboards

If the user insists on more than two choices, that's fine — but recommend binary first and explain the tradeoff (more labels → more ambiguity → lower inter-rater reliability).

### 3. Be explicit about what the model must return

The template must tell the judge model to respond with **only** the label string — nothing else. The label strings in the prompt must **exactly match** the labels in `--classification-choices` (same spelling, same casing).

Good:
```
Respond with exactly one of these labels: hallucinated, factual
```

Bad (too open-ended):
```
Is this hallucinated? Answer yes or no.
```

### 4. Keep temperature low

Pass `--invocation-params '{"temperature": 0}'` for reproducible scoring. Higher temperatures introduce noise into evaluation results.

### 5. Use `--include-explanations` for debugging

During initial setup, always include explanations so you can verify the judge is reasoning correctly before trusting the labels at scale.

### 6. Pass the template in single quotes in bash

Single quotes prevent the shell from interpolating `{variable}` placeholders. Double quotes will cause issues:

```bash
# Correct
--template 'Judge this: {input} → {output}'

# Wrong — shell may interpret { } or fail
--template "Judge this: {input} → {output}"
```

### 7. Always set `--classification-choices` to match your template labels

The labels in `--classification-choices` must exactly match the labels referenced in `--template` (same spelling, same casing). Omitting `--classification-choices` causes task runs to fail with "missing rails and classification choices."

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ax: command not found` | See references/ax-setup.md |
| `401 Unauthorized` | API key may not have access to this space. Verify at https://app.arize.com/admin > API Keys |
| `Evaluator not found` | `ax evaluators list --space-id SPACE_ID` |
| `Integration not found` | `ax ai-integrations list --space-id SPACE_ID` |
| `Task not found` | `ax tasks list --space-id SPACE_ID` |
| `project-id and dataset-id are mutually exclusive` | Use only one when creating a task |
| `experiment-ids required for dataset tasks` | Add `--experiment-ids` to `create` and `trigger-run` |
| `sampling-rate only valid for project tasks` | Remove `--sampling-rate` from dataset tasks |
| Validation error on `ax spans export` | Pass project ID (base64), not project name — look up via `ax projects list` |
| Template validation errors | Use single-quoted `--template '...'` in bash; single braces `{var}`, not double `{{var}}` |
| Run stuck in `pending` | `ax tasks get-run RUN_ID`; then `ax tasks cancel-run RUN_ID` |
| Run `cancelled` ~1s | Integration credentials invalid — check AI integration |
| Run `cancelled` ~3min | Found spans but LLM call failed — wrong model name or bad key |
| Run `completed`, 0 spans | Widen time window; eval index may not cover older data |
| No scores in UI | Fix `column_mappings` to match real paths on your spans/runs |
| Scores look wrong | Add `--include-explanations` and inspect judge reasoning on a few samples |
| Evaluator cancels on wrong span kind | Match `query_filter` and `column_mappings` to LLM vs CHAIN spans |
| Time format error on `trigger-run` | Use `2026-03-21T09:00:00` — no trailing `Z` |
| Run failed: "missing rails and classification choices" | Add `--classification-choices '{"label_a": 1, "label_b": 0}'` to `ax evaluators create` — labels must match the template |
| Run `completed`, all spans skipped | Query filter matched spans but column mappings are wrong or template variables don't resolve — export a sample span and verify paths |

---

## Related Skills

- **arize-ai-provider-integration**: Full CRUD for LLM provider integrations (create, update, delete credentials)
- **arize-trace**: Export spans to discover column paths and time ranges
- **arize-experiment**: Create experiments and export runs for experiment column mappings
- **arize-dataset**: Export dataset examples to find input fields when runs omit them
- **arize-link**: Deep links to evaluators and tasks in the Arize UI

---

## Save Credentials for Future Use

See references/ax-profiles.md § Save Credentials for Future Use.
