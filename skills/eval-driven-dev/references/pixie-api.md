# pixie API Reference

## Configuration

All settings read from environment variables at call time. By default,
every artefact lives inside a single `pixie_qa` project directory:

| Variable            | Default                    | Description                        |
| ------------------- | -------------------------- | ---------------------------------- |
| `PIXIE_ROOT`        | `pixie_qa`                 | Root directory for all artefacts   |
| `PIXIE_DB_PATH`     | `pixie_qa/observations.db` | SQLite database file path          |
| `PIXIE_DB_ENGINE`   | `sqlite`                   | Database engine (currently sqlite) |
| `PIXIE_DATASET_DIR` | `pixie_qa/datasets`        | Directory for dataset JSON files   |

---

## Instrumentation API (`pixie`)

```python
from pixie import enable_storage, observe, start_observation, flush, init, add_handler
```

| Function / Decorator | Signature                                                    | Notes                                                                                               |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `enable_storage()`   | `() → StorageHandler`                                        | Idempotent. Creates DB, registers handler. Call at app startup.                                     |
| `init()`             | `(*, capture_content=True, queue_size=1000) → None`          | Called internally by `enable_storage`. Idempotent.                                                  |
| `observe`            | `(name=None) → decorator`                                    | Wraps a sync or async function. Captures all kwargs as `eval_input`, return value as `eval_output`. |
| `start_observation`  | `(*, input, name=None) → ContextManager[ObservationContext]` | Manual span. Call `obs.set_output(v)` and `obs.set_metadata(key, value)` inside.                    |
| `flush`              | `(timeout_seconds=5.0) → bool`                               | Drains the queue. Call after a run before using CLI commands.                                       |
| `add_handler`        | `(handler) → None`                                           | Register a custom handler (must call `init()` first).                                               |

---

## CLI Commands

```bash
# Dataset management
pixie dataset create <name>
pixie dataset list
pixie dataset save <name>                              # root span (default)
pixie dataset save <name> --select last_llm_call       # last LLM call
pixie dataset save <name> --select by_name --span-name <name>
pixie dataset save <name> --notes "some note"
echo '"expected value"' | pixie dataset save <name> --expected-output

# Run eval tests
pixie test [path] [-k filter_substring] [-v]
```

**`pixie dataset save` selection modes:**

- `root` (default) — the outermost `@observe` or `start_observation` span
- `last_llm_call` — the most recent LLM API call span in the trace
- `by_name` — a span matching the `--span-name` argument (takes the last matching span)

---

## Eval Harness (`pixie`)

```python
from pixie import (
    assert_dataset_pass, assert_pass, run_and_evaluate, evaluate,
    EvalAssertionError, Evaluation, ScoreThreshold,
    capture_traces, MemoryTraceHandler,
    last_llm_call, root,
)
```

### Key functions

**`assert_dataset_pass(runnable, dataset_name, evaluators, *, dataset_dir=None, passes=1, pass_criteria=None, from_trace=None)`**

- Loads dataset by name, runs `assert_pass` with all items.
- `runnable`: callable `(eval_input) → None` (sync or async). Must instrument itself.
- `evaluators`: list of evaluator callables.
- `pass_criteria`: defaults to `ScoreThreshold()` (all scores >= 0.5).
- `from_trace`: `last_llm_call` or `root` — selects which span to evaluate.

**`assert_pass(runnable, eval_inputs, evaluators, *, evaluables=None, passes=1, pass_criteria=None, from_trace=None)`**

- Same, but takes explicit inputs (and optionally `Evaluable` items for expected outputs).

**`run_and_evaluate(evaluator, runnable, eval_input, *, expected_output=..., from_trace=None)`**

- Runs `runnable(eval_input)`, captures traces, evaluates. Returns one `Evaluation`.

**`ScoreThreshold(threshold=0.5, pct=1.0)`**

- `threshold`: min score per item (default 0.5).
- `pct`: fraction of items that must meet threshold (default 1.0 = all).
- Example: `ScoreThreshold(0.7, pct=0.8)` = 80% of cases must score ≥ 0.7.

**`Evaluation(score, reasoning, details={})`** — frozen result. `score` is 0.0–1.0.

**`capture_traces()`** — context manager; use for in-memory trace capture without DB.

**`last_llm_call(trace)`** / **`root(trace)`** — `from_trace` helpers.

---

## Evaluators

### Heuristic (no LLM needed)

| Evaluator                        | Use when                                            |
| -------------------------------- | --------------------------------------------------- |
| `ExactMatchEval(expected=...)`   | Output must exactly equal the expected string       |
| `LevenshteinMatch(expected=...)` | Partial string similarity (edit distance)           |
| `NumericDiffEval(expected=...)`  | Normalised numeric difference                       |
| `JSONDiffEval(expected=...)`     | Structural JSON comparison                          |
| `ValidJSONEval(schema=None)`     | Output is valid JSON (optionally matching a schema) |
| `ListContainsEval(expected=...)` | Output list contains expected items                 |

### LLM-as-judge (require OpenAI key or compatible client)

| Evaluator                                             | Use when                                  |
| ----------------------------------------------------- | ----------------------------------------- |
| `FactualityEval(expected=..., model=..., client=...)` | Output is factually accurate vs reference |
| `ClosedQAEval(expected=..., model=..., client=...)`   | Closed-book QA comparison                 |
| `SummaryEval(expected=..., model=..., client=...)`    | Summarisation quality                     |
| `TranslationEval(expected=..., language=..., ...)`    | Translation quality                       |
| `PossibleEval(model=..., client=...)`                 | Output is feasible / plausible            |
| `SecurityEval(model=..., client=...)`                 | No security vulnerabilities in output     |
| `ModerationEval(threshold=..., client=...)`           | Content moderation                        |
| `BattleEval(expected=..., model=..., client=...)`     | Head-to-head comparison                   |

### RAG / retrieval

| Evaluator                                         | Use when                                   |
| ------------------------------------------------- | ------------------------------------------ |
| `ContextRelevancyEval(expected=..., client=...)`  | Retrieved context is relevant to query     |
| `FaithfulnessEval(client=...)`                    | Answer is faithful to the provided context |
| `AnswerRelevancyEval(client=...)`                 | Answer addresses the question              |
| `AnswerCorrectnessEval(expected=..., client=...)` | Answer is correct vs reference             |

### Custom evaluator template

```python
from pixie import Evaluation, Evaluable

async def my_evaluator(evaluable: Evaluable, *, trace=None) -> Evaluation:
    # evaluable.eval_input  — what was passed to the observed function
    # evaluable.eval_output — what the function returned
    # evaluable.expected_output — reference answer (UNSET if not provided)
    score = 1.0 if "expected pattern" in str(evaluable.eval_output) else 0.0
    return Evaluation(score=score, reasoning="...")
```

---

## Dataset Python API

```python
from pixie import DatasetStore, Evaluable

store = DatasetStore()                               # reads PIXIE_DATASET_DIR
store.create("my-dataset")                          # create empty
store.create("my-dataset", items=[...])             # create with items
store.append("my-dataset", Evaluable(...))          # add one item
store.get("my-dataset")                             # returns Dataset
store.list()                                        # list names
store.remove("my-dataset", index=2)                 # remove by index
store.delete("my-dataset")                          # delete entirely
```

**`Evaluable` fields:**

- `eval_input`: the input (what `@observe` captured as function kwargs)
- `eval_output`: the output (return value of the observed function)
- `eval_metadata`: dict of extra info (trace_id, span_id, provider, token counts, etc.) — always includes `trace_id` and `span_id`
- `expected_output`: reference answer for comparison (`UNSET` if not provided)

---

## ObservationStore Python API

```python
from pixie import ObservationStore

store = ObservationStore()   # reads PIXIE_DB_PATH
await store.create_tables()

# Read traces
await store.list_traces(limit=10, offset=0)         # → list of trace summaries
await store.get_trace(trace_id)                     # → list[ObservationNode] (tree)
await store.get_root(trace_id)                      # → root ObserveSpan
await store.get_last_llm(trace_id)                  # → most recent LLMSpan
await store.get_by_name(name, trace_id=None)        # → list of spans

# ObservationNode
node.to_text()          # pretty-print span tree
node.find(name)         # find a child span by name
node.children           # list of child ObservationNode
node.span               # the underlying span (ObserveSpan or LLMSpan)
```
