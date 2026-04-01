---
name: arize-experiment
description: "INVOKE THIS SKILL when creating, running, or analyzing Arize experiments. Covers experiment CRUD, exporting runs, comparing results, and evaluation workflows using the ax CLI."
---

# Arize Experiment Skill

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
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong: check `.env` for `ARIZE_API_KEY` and use it to create/update the profile via references/ax-profiles.md. If `.env` has no key either, ask the user for their Arize API key (https://app.arize.com/admin > API Keys)
- Space ID unknown → check `.env` for `ARIZE_SPACE_ID`, or run `ax spaces list -o json`, or ask the user
- Project unclear → check `.env` for `ARIZE_DEFAULT_PROJECT`, or ask, or run `ax projects list -o json --limit 100` and present as selectable options

## List Experiments: `ax experiments list`

Browse experiments, optionally filtered by dataset. Output goes to stdout.

```bash
ax experiments list
ax experiments list --dataset-id DATASET_ID --limit 20
ax experiments list --cursor CURSOR_TOKEN
ax experiments list -o json
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dataset-id` | string | none | Filter by dataset |
| `--limit, -l` | int | 15 | Max results (1-100) |
| `--cursor` | string | none | Pagination cursor from previous response |
| `-o, --output` | string | table | Output format: table, json, csv, parquet, or file path |
| `-p, --profile` | string | default | Configuration profile |

## Get Experiment: `ax experiments get`

Quick metadata lookup -- returns experiment name, linked dataset/version, and timestamps.

```bash
ax experiments get EXPERIMENT_ID
ax experiments get EXPERIMENT_ID -o json
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `EXPERIMENT_ID` | string | required | Positional argument |
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
ax experiments export EXPERIMENT_ID
# -> experiment_abc123_20260305_141500/runs.json

ax experiments export EXPERIMENT_ID --all
ax experiments export EXPERIMENT_ID --output-dir ./results
ax experiments export EXPERIMENT_ID --stdout
ax experiments export EXPERIMENT_ID --stdout | jq '.[0]'
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `EXPERIMENT_ID` | string | required | Positional argument |
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
ax experiments create --name "gpt-4o-baseline" --dataset-id DATASET_ID --file runs.json
ax experiments create --name "claude-test" --dataset-id DATASET_ID --file runs.csv
```

### Flags

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--name, -n` | string | yes | Experiment name |
| `--dataset-id` | string | yes | Dataset to run the experiment against |
| `--file, -f` | path | yes | Data file with runs: CSV, JSON, JSONL, or Parquet |
| `-o, --output` | string | no | Output format |
| `-p, --profile` | string | no | Configuration profile |

### Passing data via stdin

Use `--file -` to pipe data directly — no temp file needed:

```bash
echo '[{"example_id": "ex_001", "output": "Paris"}]' | ax experiments create --name "my-experiment" --dataset-id DATASET_ID --file -

# Or with a heredoc
ax experiments create --name "my-experiment" --dataset-id DATASET_ID --file - << 'EOF'
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
ax experiments delete EXPERIMENT_ID
ax experiments delete EXPERIMENT_ID --force   # skip confirmation prompt
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `EXPERIMENT_ID` | string | required | Positional argument |
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
   ax datasets list
   ax datasets export DATASET_ID --stdout | jq 'length'
   ```
2. Export the dataset examples:
   ```bash
   ax datasets export DATASET_ID
   ```
3. Process each example through your system, collecting outputs and evaluations
4. Build a runs file (JSON array) with `example_id`, `output`, and optional `evaluations`:
   ```json
   [
     {"example_id": "ex_001", "output": "4", "evaluations": {"correctness": {"label": "correct", "score": 1.0}}},
     {"example_id": "ex_002", "output": "Paris", "evaluations": {"correctness": {"label": "correct", "score": 1.0}}}
   ]
   ```
5. Create the experiment:
   ```bash
   ax experiments create --name "gpt-4o-baseline" --dataset-id DATASET_ID --file runs.json
   ```
6. Verify: `ax experiments get EXPERIMENT_ID`

### Compare two experiments

1. Export both experiments:
   ```bash
   ax experiments export EXPERIMENT_ID_A --stdout > a.json
   ax experiments export EXPERIMENT_ID_B --stdout > b.json
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

1. `ax experiments list --dataset-id DATASET_ID` -- find experiments
2. `ax experiments export EXPERIMENT_ID` -- download to file
3. Parse: `jq '.[] | {example_id, score: .evaluations.correctness.score}' experiment_*/runs.json`

### Pipe export to other tools

```bash
# Count runs
ax experiments export EXPERIMENT_ID --stdout | jq 'length'

# Extract all outputs
ax experiments export EXPERIMENT_ID --stdout | jq '.[].output'

# Get runs with low scores
ax experiments export EXPERIMENT_ID --stdout | jq '[.[] | select(.evaluations.correctness.score < 0.5)]'

# Convert to CSV
ax experiments export EXPERIMENT_ID --stdout | jq -r '.[] | [.example_id, .output, .evaluations.correctness.score] | @csv'
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
| `Experiment not found` | Verify experiment ID with `ax experiments list` |
| `Invalid runs file` | Each run must have `example_id` and `output` fields |
| `example_id mismatch` | Ensure `example_id` values match IDs from the dataset (export dataset to verify) |
| `No runs found` | Export returned empty -- verify experiment has runs via `ax experiments get` |
| `Dataset not found` | The linked dataset may have been deleted; check with `ax datasets list` |

## Save Credentials for Future Use

See references/ax-profiles.md § Save Credentials for Future Use.
