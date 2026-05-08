---
name: arize-experiment
description: "INVOKE THIS SKILL when creating, running, or analyzing Arize experiments. Also use when the user wants to evaluate or measure model performance, compare models (including GPT-4, Claude, or others), or assess how well their AI is doing. Covers experiment CRUD, exporting runs, comparing results, and evaluation workflows using the ax CLI."
---

# Arize Experiment Skill

> **`SPACE`** — All `--space` flags and the `ARIZE_SPACE` env var accept a space **name** (e.g., `my-workspace`) or a base64 space **ID** (e.g., `U3BhY2U6...`). Find yours with `ax spaces list`.

## Concepts

- **Experiment** = a named evaluation run against a specific dataset version, containing one run per example
- **Experiment Run** = the result of processing one dataset example -- includes the model output, optional evaluations, and optional metadata
- **Dataset** = a versioned collection of examples; every experiment is tied to a dataset and a specific dataset version
- **Evaluation** = a named metric attached to a run (e.g., `correctness`, `relevance`), with optional label, score, and explanation

The typical flow: export a dataset → process each example → collect outputs and evaluations → create an experiment with the runs.

## Prerequisites

Proceed directly with the task — run the `ax` command you need. Do NOT check versions, env vars, or profiles upfront.

If an `ax` command fails, troubleshoot based on the error:
- `command not found` or version error → see references/ax-setup.md
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong, follow references/ax-profiles.md to create/update it. If the user doesn't have their key, direct them to https://app.arize.com/admin > API Keys
- Space unknown → run `ax spaces list` to pick by name, or ask the user
- Project unclear → ask the user, or run `ax projects list -o json --limit 100` and present as selectable options
- **Security:** Never read `.env` files or search the filesystem for credentials. Use `ax profiles` for Arize credentials and `ax ai-integrations` for LLM provider keys. If credentials are not available through these channels, ask the user.
- **CRITICAL — Never fabricate outputs:** When running an experiment, you MUST call the real model API specified by the user for every dataset example. Never fabricate, simulate, or hardcode model outputs, latencies, or evaluation scores. If you cannot call the API (missing SDK, missing credentials, network error), stop and tell the user what is needed before proceeding.

## List Experiments: `ax experiments list`

Browse experiments, optionally filtered by dataset. Output goes to stdout.

```bash
ax experiments list
ax experiments list --dataset DATASET_NAME --space SPACE --limit 20   # DATASET_NAME: name or ID (name preferred)
ax experiments list --cursor CURSOR_TOKEN
ax experiments list -o json
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dataset` | string | none | Filter by dataset |
| `--limit, -l` | int | 15 | Max results (1-100) |
| `--cursor` | string | none | Pagination cursor from previous response |
| `-o, --output` | string | table | Output format: table, json, csv, parquet, or file path |
| `-p, --profile` | string | default | Configuration profile |

## Get Experiment: `ax experiments get`

Quick metadata lookup -- returns experiment name, linked dataset/version, and timestamps.

```bash
ax experiments get NAME_OR_ID
ax experiments get NAME_OR_ID -o json
ax experiments get NAME_OR_ID --dataset DATASET_NAME --space SPACE   # required when using experiment name instead of ID
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `NAME_OR_ID` | string | required | Experiment name or ID (positional) |
| `--dataset` | string | none | Dataset name or ID (required if using experiment name instead of ID) |
| `--space` | string | none | Space name or ID (required if using dataset name instead of ID) |
| `-o, --output` | string | table | Output format |
| `-p, --profile` | string | default | Configuration profile |

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Experiment ID |
| `name` | string | Experiment name |
| `dataset_id` | string | Linked dataset ID |
| `dataset_version_id` | string | Specific dataset version used |
| `experiment_traces_project_id` | string | Project where experiment traces are stored |
| `created_at` | datetime | When the experiment was created |
| `updated_at` | datetime | Last modification time |

## Export Experiment: `ax experiments export`

Download all runs to a file. By default uses the REST API; pass `--all` to use Arrow Flight for bulk transfer.

```bash
# EXPERIMENT_NAME, DATASET_NAME: name or ID (name preferred)
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
# -> experiment_abc123_20260305_141500/runs.json

ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --all
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --output-dir ./results
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq '.[0]'
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `NAME_OR_ID` | string | required | Experiment name or ID (positional) |
| `--dataset` | string | none | Dataset name or ID (required if using experiment name instead of ID) |
| `--space` | string | none | Space name or ID (required if using dataset name instead of ID) |
| `--all` | bool | false | Use Arrow Flight for bulk export (see below) |
| `--output-dir` | string | `.` | Output directory |
| `--stdout` | bool | false | Print JSON to stdout instead of file |
| `-p, --profile` | string | default | Configuration profile |

### REST vs Flight (`--all`)

- **REST** (default): Lower friction -- no Arrow/Flight dependency, standard HTTPS ports, works through any corporate proxy or firewall. Limited to 500 runs per page.
- **Flight** (`--all`): Required for experiments with more than 500 runs. Uses gRPC+TLS on a separate host/port (`flight.arize.com:443`) which some corporate networks may block.

**Agent auto-escalation rule:** If a REST export returns exactly 500 runs, the result is likely truncated. Re-run with `--all` to get the full dataset.

Output is a JSON array of run objects:

```json
[
  {
    "id": "run_001",
    "example_id": "ex_001",
    "output": "The answer is 4.",
    "evaluations": {
      "correctness": { "label": "correct", "score": 1.0 },
      "relevance": { "score": 0.95, "explanation": "Directly answers the question" }
    },
    "metadata": { "model": "gpt-4o", "latency_ms": 1234 }
  }
]
```

## Create Experiment: `ax experiments create`

Create a new experiment with runs from a data file.

```bash
ax experiments create --name "gpt-4o-baseline" --dataset DATASET_NAME --space SPACE --file runs.json
ax experiments create --name "claude-test" --dataset DATASET_NAME --space SPACE --file runs.csv
```

### Flags

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--name, -n` | string | yes | Experiment name |
| `--dataset` | string | yes | Dataset to run the experiment against |
| `--space, -s` | string | no | Space name or ID (required if using dataset name instead of ID) |
| `--file, -f` | path | yes | Data file with runs: CSV, JSON, JSONL, or Parquet |
| `-o, --output` | string | no | Output format |
| `-p, --profile` | string | no | Configuration profile |

### Passing data via stdin

Use `--file -` to pipe data directly — no temp file needed:

```bash
echo '[{"example_id": "ex_001", "output": "Paris"}]' | ax experiments create --name "my-experiment" --dataset DATASET_NAME --space SPACE --file -

# Or with a heredoc
ax experiments create --name "my-experiment" --dataset DATASET_NAME --space SPACE --file - << 'EOF'
[{"example_id": "ex_001", "output": "Paris"}]
EOF
```

### Required columns in the runs file

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `example_id` | string | yes | ID of the dataset example this run corresponds to |
| `output` | string | yes | The model/system output for this example |

Additional columns are passed through as `additionalProperties` on the run.

## Delete Experiment: `ax experiments delete`

```bash
ax experiments delete NAME_OR_ID
ax experiments delete NAME_OR_ID --dataset DATASET_NAME --space SPACE   # required when using experiment name instead of ID
ax experiments delete NAME_OR_ID --force   # skip confirmation prompt
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `NAME_OR_ID` | string | required | Experiment name or ID (positional) |
| `--dataset` | string | none | Dataset name or ID (required if using experiment name instead of ID) |
| `--space` | string | none | Space name or ID (required if using dataset name instead of ID) |
| `--force, -f` | bool | false | Skip confirmation prompt |
| `-p, --profile` | string | default | Configuration profile |

## Experiment Run Schema

Each run corresponds to one dataset example:

```json
{
  "example_id": "required -- links to dataset example",
  "output": "required -- the model/system output for this example",
  "evaluations": {
    "metric_name": {
      "label": "optional string label (e.g., 'correct', 'incorrect')",
      "score": "optional numeric score (e.g., 0.95)",
      "explanation": "optional freeform text"
    }
  },
  "metadata": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "latency_ms": 1234
  }
}
```

### Evaluation fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | no | Categorical classification (e.g., `correct`, `incorrect`, `partial`) |
| `score` | number | no | Numeric quality score (e.g., 0.0 - 1.0) |
| `explanation` | string | no | Freeform reasoning for the evaluation |

At least one of `label`, `score`, or `explanation` should be present per evaluation.

## Workflows

### Run an experiment against a dataset

1. Find or create a dataset:
   ```bash
   ax datasets list --space SPACE
   ax datasets export DATASET_NAME --space SPACE --stdout | jq 'length'
   ```
2. Export the dataset examples:
   ```bash
   ax datasets export DATASET_NAME --space SPACE
   ```
3. Call the real model API for each example and collect outputs. Use `ax datasets export --stdout` to pipe examples directly into an inference script:

   ```bash
   ax datasets export DATASET_NAME --space SPACE --stdout | python3 infer.py > runs.json
   ```

   Write `infer.py` to read examples from stdin, call the target model, and write runs JSON to stdout. The script below is a template — first inspect the exported dataset JSON to find the correct input field name, then uncomment the provider block the user wants:

   ```python
   import json, sys, time

   examples = json.load(sys.stdin)
   runs = []

   for ex in examples:
       # Inspect the exported JSON to find the right field (e.g. "input", "question", "prompt")
       user_input = ex.get("input") or ex.get("question") or ex.get("prompt") or str(ex)

       start = time.time()

       # === CALL THE REAL MODEL API HERE — never fabricate or simulate ===
       # Uncomment and adapt the provider block the user requested:
       #
       # OpenAI (pip install openai  — uses OPENAI_API_KEY env var):
       #   from openai import OpenAI
       #   resp = OpenAI().chat.completions.create(
       #       model="gpt-4o",
       #       messages=[{"role": "user", "content": user_input}]
       #   )
       #   output_text = resp.choices[0].message.content
       #
       # Anthropic (pip install anthropic  — uses ANTHROPIC_API_KEY env var):
       #   import anthropic
       #   resp = anthropic.Anthropic().messages.create(
       #       model="claude-sonnet-4-6", max_tokens=1024,
       #       messages=[{"role": "user", "content": user_input}]
       #   )
       #   output_text = resp.content[0].text
       #
       # Google Gemini (pip install google-genai  — uses GOOGLE_API_KEY env var):
       #   from google import genai
       #   resp = genai.Client().models.generate_content(
       #       model="gemini-2.5-pro", contents=user_input
       #   )
       #   output_text = resp.text
       #
       # Custom / OpenAI-compatible proxy (pip install openai — uses CUSTOM_BASE_URL + CUSTOM_API_KEY env vars):
       # Use this for Azure OpenAI, NVIDIA NIM, local Ollama, or any OpenAI-compatible endpoint,
       # including a test integration proxy. Matches the `custom` provider in `ax ai-integrations create`.
       #   import os
       #   from openai import OpenAI
       #   resp = OpenAI(
       #       base_url=os.environ["CUSTOM_BASE_URL"],          # e.g. https://my-proxy.example.com/v1
       #       api_key=os.environ.get("CUSTOM_API_KEY", "none"),
       #   ).chat.completions.create(
       #       model=os.environ.get("CUSTOM_MODEL", "default"),
       #       messages=[{"role": "user", "content": user_input}]
       #   )
       #   output_text = resp.choices[0].message.content

       latency_ms = round((time.time() - start) * 1000)
       runs.append({
           "example_id": ex["id"],
           "output": output_text,
           "metadata": {"model": "MODEL_NAME", "latency_ms": latency_ms}
       })
       print(f"  {ex['id']}: {latency_ms}ms", file=sys.stderr)

   json.dump(runs, sys.stdout, indent=2)
   ```

   **Before running:** install the provider SDK (`pip install openai` / `anthropic` / `google-genai`) and ensure the API key is set as an environment variable in your shell. If you cannot access the API, stop and tell the user what is needed.

4. Verify the runs file:
   ```bash
   python3 -c "import json; runs=json.load(open('runs.json')); print(f'{len(runs)} runs'); print(json.dumps(runs[0], indent=2))"
   ```
   Each run must have `example_id` and `output`. Optional fields: `evaluations`, `metadata`.
5. Create the experiment:
   ```bash
   ax experiments create --name "gpt-4o-baseline" --dataset DATASET_NAME --space SPACE --file runs.json
   ```
6. Verify: `ax experiments get "gpt-4o-baseline" --dataset DATASET_NAME --space SPACE`

### Compare two experiments

1. Export both experiments:
   ```bash
   ax experiments export "experiment-a" --dataset DATASET_NAME --space SPACE --stdout > a.json
   ax experiments export "experiment-b" --dataset DATASET_NAME --space SPACE --stdout > b.json
   ```
2. Compare evaluation scores by `example_id`:
   ```bash
   # Average correctness score for experiment A
   jq '[.[] | .evaluations.correctness.score] | add / length' a.json

   # Same for experiment B
   jq '[.[] | .evaluations.correctness.score] | add / length' b.json
   ```
3. Find examples where results differ:
   ```bash
   jq -s '.[0] as $a | .[1][] | . as $run |
     {
       example_id: $run.example_id,
       b_score: $run.evaluations.correctness.score,
       a_score: ($a[] | select(.example_id == $run.example_id) | .evaluations.correctness.score)
     }' a.json b.json
   ```
4. Score distribution per evaluator (pass/fail/partial counts):
   ```bash
   # Count by label for experiment A
   jq '[.[] | .evaluations.correctness.label] | group_by(.) | map({label: .[0], count: length})' a.json
   ```
5. Find regressions (examples that passed in A but fail in B):
   ```bash
   jq -s '
     [.[0][] | select(.evaluations.correctness.label == "correct")] as $passed_a |
     [.[1][] | select(.evaluations.correctness.label != "correct") |
       select(.example_id as $id | $passed_a | any(.example_id == $id))
     ]
   ' a.json b.json
   ```

**Statistical significance note:** Score comparisons are most reliable with ≥ 30 examples per evaluator. With fewer examples, treat the delta as directional only — a 5% difference on n=10 may be noise. Report sample size alongside scores: `jq 'length' a.json`.

### Download experiment results for analysis

1. `ax experiments list --dataset DATASET_NAME --space SPACE` -- find experiments
2. `ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE` -- download to file
3. Parse: `jq '.[] | {example_id, score: .evaluations.correctness.score}' experiment_*/runs.json`

### Pipe export to other tools

```bash
# Count runs
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq 'length'

# Extract all outputs
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq '.[].output'

# Get runs with low scores
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq '[.[] | select(.evaluations.correctness.score < 0.5)]'

# Convert to CSV
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq -r '.[] | [.example_id, .output, .evaluations.correctness.score] | @csv'
```

## Related Skills

- **arize-dataset**: Create or export the dataset this experiment runs against → use `arize-dataset` first
- **arize-prompt-optimization**: Use experiment results to improve prompts → next step is `arize-prompt-optimization`
- **arize-trace**: Inspect individual span traces for failing experiment runs → use `arize-trace`
- **arize-link**: Generate clickable UI links to traces from experiment runs → use `arize-link`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ax: command not found` | See references/ax-setup.md |
| `401 Unauthorized` | API key is wrong, expired, or doesn't have access to this space. Fix the profile using references/ax-profiles.md. |
| `No profile found` | No profile is configured. See references/ax-profiles.md to create one. |
| `Experiment not found` | Verify experiment name with `ax experiments list --space SPACE` |
| `Invalid runs file` | Each run must have `example_id` and `output` fields |
| `example_id mismatch` | Ensure `example_id` values match IDs from the dataset (export dataset to verify) |
| `No runs found` | Export returned empty -- verify experiment has runs via `ax experiments get` |
| `Dataset not found` | The linked dataset may have been deleted; check with `ax datasets list` |

## Save Credentials for Future Use

See references/ax-profiles.md § Save Credentials for Future Use.
