# Batch Evaluation with evaluate_dataframe (Python)

Run evaluators across a DataFrame. The core 2.0 batch evaluation API.

## Preferred: async_evaluate_dataframe

For batch evaluations (especially with LLM evaluators), prefer the async version
for better throughput:

```python
from phoenix.evals import async_evaluate_dataframe

results_df = await async_evaluate_dataframe(
    dataframe=df,              # pandas DataFrame with columns matching evaluator params
    evaluators=[eval1, eval2], # List of evaluators
    concurrency=5,             # Max concurrent LLM calls (default 3)
    exit_on_error=False,       # Optional: stop on first error (default True)
    max_retries=3,             # Optional: retry failed LLM calls (default 10)
)
```

## Sync Version

```python
from phoenix.evals import evaluate_dataframe

results_df = evaluate_dataframe(
    dataframe=df,              # pandas DataFrame with columns matching evaluator params
    evaluators=[eval1, eval2], # List of evaluators
    exit_on_error=False,       # Optional: stop on first error (default True)
    max_retries=3,             # Optional: retry failed LLM calls (default 10)
)
```

## Result Column Format

`async_evaluate_dataframe` / `evaluate_dataframe` returns a copy of the input DataFrame with added columns.
**Result columns contain dicts, NOT raw numbers.**

For each evaluator named `"foo"`, two columns are added:

| Column | Type | Contents |
| ------ | ---- | -------- |
| `foo_score` | `dict` | `{"name": "foo", "score": 1.0, "label": "True", "explanation": "...", "metadata": {...}, "kind": "code", "direction": "maximize"}` |
| `foo_execution_details` | `dict` | `{"status": "success", "exceptions": [], "execution_seconds": 0.001}` |

Only non-None fields appear in the score dict.

### Extracting Numeric Scores

```python
# WRONG — these will fail or produce unexpected results
score = results_df["relevance"].mean()                    # KeyError!
score = results_df["relevance_score"].mean()              # Tries to average dicts!

# RIGHT — extract the numeric score from each dict
scores = results_df["relevance_score"].apply(
    lambda x: x.get("score", 0.0) if isinstance(x, dict) else 0.0
)
mean_score = scores.mean()
```

### Extracting Labels

```python
labels = results_df["relevance_score"].apply(
    lambda x: x.get("label", "") if isinstance(x, dict) else ""
)
```

### Extracting Explanations (LLM evaluators)

```python
explanations = results_df["relevance_score"].apply(
    lambda x: x.get("explanation", "") if isinstance(x, dict) else ""
)
```

### Finding Failures

```python
scores = results_df["relevance_score"].apply(
    lambda x: x.get("score", 0.0) if isinstance(x, dict) else 0.0
)
failed_mask = scores < 0.5
failures = results_df[failed_mask]
```

## Input Mapping

Evaluators receive each row as a dict. Column names must match the evaluator's
expected parameter names. If they don't match, use `.bind()` or `bind_evaluator`:

```python
from phoenix.evals import bind_evaluator, create_evaluator, async_evaluate_dataframe

@create_evaluator(name="check", kind="code")
def check(response: str) -> bool:
    return len(response.strip()) > 0

# Option 1: Use .bind() method on the evaluator
check.bind(input_mapping={"response": "answer"})
results_df = await async_evaluate_dataframe(dataframe=df, evaluators=[check])

# Option 2: Use bind_evaluator function
bound = bind_evaluator(evaluator=check, input_mapping={"response": "answer"})
results_df = await async_evaluate_dataframe(dataframe=df, evaluators=[bound])
```

Or simply rename columns to match:

```python
df = df.rename(columns={
    "attributes.input.value": "input",
    "attributes.output.value": "output",
})
```

## DO NOT use run_evals

```python
# WRONG — legacy 1.0 API
from phoenix.evals import run_evals
results = run_evals(dataframe=df, evaluators=[eval1])
# Returns List[DataFrame] — one per evaluator

# RIGHT — current 2.0 API
from phoenix.evals import async_evaluate_dataframe
results_df = await async_evaluate_dataframe(dataframe=df, evaluators=[eval1])
# Returns single DataFrame with {name}_score dict columns
```

Key differences:
- `run_evals` returns a **list** of DataFrames (one per evaluator)
- `async_evaluate_dataframe` returns a **single** DataFrame with all results merged
- `async_evaluate_dataframe` uses `{name}_score` dict column format
- `async_evaluate_dataframe` uses `bind_evaluator` for input mapping (not `input_mapping=` param)
