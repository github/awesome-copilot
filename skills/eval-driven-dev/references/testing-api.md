# Testing API Reference

> Auto-generated from pixie source code docstrings.
> Do not edit by hand — run `uv run python scripts/generate_skill_docs.py`.

pixie.evals — evaluation harness for LLM applications.

Public API: - `Evaluation` — result dataclass for a single evaluator run - `Evaluator` — protocol for evaluation callables - `evaluate` — run one evaluator against one evaluable - `run_and_evaluate` — evaluate spans from a MemoryTraceHandler - `assert_pass` — batch evaluation with pass/fail criteria - `assert_dataset_pass` — load a dataset and run assert_pass - `EvalAssertionError` — raised when assert_pass fails - `capture_traces` — context manager for in-memory trace capture - `MemoryTraceHandler` — InstrumentationHandler that collects spans - `ScoreThreshold` — configurable pass criteria - `last_llm_call` / `root` — trace-to-evaluable helpers - `DatasetEntryResult` — evaluation results for a single dataset entry - `DatasetScorecard` — per-dataset scorecard with non-uniform evaluators - `generate_dataset_scorecard_html` — render a scorecard as HTML - `save_dataset_scorecard` — write scorecard HTML to disk

Pre-made evaluators (autoevals adapters): - `AutoevalsAdapter` — generic wrapper for any autoevals `Scorer` - `LevenshteinMatch` — edit-distance string similarity - `ExactMatch` — exact value comparison - `NumericDiff` — normalised numeric difference - `JSONDiff` — structural JSON comparison - `ValidJSON` — JSON syntax / schema validation - `ListContains` — list overlap - `EmbeddingSimilarity` — embedding cosine similarity - `Factuality` — LLM factual accuracy check - `ClosedQA` — closed-book QA evaluation - `Battle` — head-to-head comparison - `Humor` — humor detection - `Security` — security vulnerability check - `Sql` — SQL equivalence - `Summary` — summarisation quality - `Translation` — translation quality - `Possible` — feasibility check - `Moderation` — content moderation - `ContextRelevancy` — RAGAS context relevancy - `Faithfulness` — RAGAS faithfulness - `AnswerRelevancy` — RAGAS answer relevancy - `AnswerCorrectness` — RAGAS answer correctness

## Dataset JSON Format

The dataset is a JSON object with these top-level fields:

```json
{
  "name": "customer-faq",
  "runnable": "pixie_qa/run_app.py:AppRunnable",
  "evaluators": ["Factuality"],
  "entries": [
    {
      "input_data": { "question": "Hello" },
      "description": "Basic greeting",
      "eval_input": [{ "name": "input", "value": "Hello" }],
      "expectation": "A friendly greeting that offers to help",
      "evaluators": ["...", "ClosedQA"]
    }
  ]
}
```

### Entry structure

All fields are top-level on each entry (flat structure — no nesting):

```
entry:
  ├── input_data    (required) — args for Runnable.run()
  ├── eval_input      (optional) — list of {"name": ..., "value": ...} objects (default: [])
  ├── description     (required) — human-readable label for the test case
  ├── expectation     (optional) — reference for comparison-based evaluators
  ├── eval_metadata   (optional) — extra per-entry data for custom evaluators
  └── evaluators      (optional) — evaluator names for THIS entry
```

### Field reference

- `runnable` (required): `filepath:ClassName` reference to the `Runnable`
  subclass that drives the app during evaluation.
- `evaluators` (dataset-level, optional): Default evaluator names — applied to
  every entry that does not declare its own `evaluators`.
- `entries[].input_data` (required): Kwargs passed to `Runnable.run()` as a
  Pydantic model. Keys must match the fields of the Pydantic model used in
  `run(args: T)`.
- `entries[].description` (required): Human-readable label for the test case.
- `entries[].eval_input` (optional, default `[]`): List of `{"name": ..., "value": ...}`
  objects. Used to populate the wrap input registry — `wrap(purpose="input")`
  calls in the app return registry values keyed by `name`. The runner
  automatically prepends `input_data` when building the `Evaluable`.
- `entries[].expectation` (optional): Concise expectation description
  for comparison-based evaluators. Should describe what a correct output looks
  like, **not** copy the verbatim output. Use `pixie format` on the trace to
  see the real output shape, then write a shorter description.
- `entries[].eval_metadata` (optional): Extra per-entry data for custom
  evaluators — e.g., expected tool names, boolean flags, thresholds. Accessed in
  evaluators as `evaluable.eval_metadata`.
- `entries[].evaluators` (optional): Row-level evaluator override. Rules:
  - Omit → entry inherits dataset-level `evaluators`.
  - `["...", "ClosedQA"]` → dataset defaults **plus** ClosedQA.
  - `["OnlyThis"]` (no `"..."`) → **only** OnlyThis, no defaults.

## Evaluator Name Resolution

In dataset JSON, evaluator names are resolved as follows:

- **Built-in names** (bare names like `"Factuality"`, `"ExactMatch"`) are
  resolved to `pixie.{Name}` automatically.
- **Custom evaluators** use `filepath:callable_name` format
  (e.g. `"pixie_qa/evaluators.py:my_evaluator"`).
- Custom evaluator references point to module-level callables — classes
  (instantiated automatically), factory functions (called if zero-arg),
  evaluator functions (used as-is), or pre-instantiated callables (e.g.
  `create_llm_evaluator` results — used as-is).

## CLI Commands

| Command                                     | Description                           |
| ------------------------------------------- | ------------------------------------- |
| `pixie test [path] [-v] [--no-open]`        | Run eval tests on dataset files       |
| `pixie dataset create <name>`               | Create a new empty dataset            |
| `pixie dataset list`                        | List all datasets                     |
| `pixie dataset save <name> [--select MODE]` | Save a span to a dataset              |
| `pixie dataset validate [path]`             | Validate dataset JSON files           |
| `pixie analyze <test_run_id>`               | Generate analysis and recommendations |

---

## Types

### `Evaluable`

```python
class Evaluable(TestCase):
    eval_output: list[NamedData]      # wrap(purpose="output") + wrap(purpose="state") values
    # Inherited from TestCase:
    # eval_input: list[NamedData]     # from eval_input in dataset entry
    # expectation: JsonValue | _Unset # from expectation in dataset entry
    # eval_metadata: dict[str, JsonValue] | None  # from eval_metadata in dataset entry
    # description: str | None
```

Data carrier for evaluators. Extends `TestCase` with actual output.

- `eval_input` — `list[NamedData]` populated from the entry's `eval_input` field plus `input_data` (prepended by the runner). Always has at least one item.
- `eval_output` — `list[NamedData]` containing ALL `wrap(purpose="output")` and `wrap(purpose="state")` values captured during the run. Each item has `.name` (str) and `.value` (JsonValue). Use `_get_output(evaluable, "name")` to look up by name.
- `eval_metadata` — `dict[str, JsonValue] | None` from the entry's `eval_metadata` field
- `expected_output` — expectation text from dataset (or `UNSET` if not provided)

Attributes:
eval_input: Named input data items (from dataset + input_data prepended by runner). Always non-empty.
eval_output: Named output data items (from wrap calls during run).
Each item has `.name` (str) and `.value` (JsonValue).
Contains ALL `wrap(purpose="output")` and `wrap(purpose="state")` values.
eval_metadata: Supplementary metadata (`None` when absent).
expected_output: The expected/reference output for evaluation.
Defaults to `UNSET` (not provided). May be explicitly
set to `None` to indicate "there is no expected output".

### How `wrap()` maps to `Evaluable` fields at test time

When `pixie test` runs a dataset entry, `wrap()` calls in the app populate the `Evaluable` that evaluators receive:

| `wrap()` call in app code                | Evaluable field   | Type              | How to access in evaluator                           |
| ---------------------------------------- | ----------------- | ----------------- | ---------------------------------------------------- |
| `wrap(data, purpose="input", name="X")`  | `eval_input`      | `list[NamedData]` | Pre-populated from `eval_input` in the dataset entry |
| `wrap(data, purpose="output", name="X")` | `eval_output`     | `list[NamedData]` | `_get_output(evaluable, "X")` — see helper below     |
| `wrap(data, purpose="state", name="X")`  | `eval_output`     | `list[NamedData]` | `_get_output(evaluable, "X")` — same list as output  |
| (from dataset entry `expectation`)       | `expected_output` | `str \| None`     | `evaluable.expected_output`                          |
| (from dataset entry `eval_metadata`)     | `eval_metadata`   | `dict \| None`    | `evaluable.eval_metadata`                            |

**Key insight**: Both `purpose="output"` and `purpose="state"` wrap values end up in `eval_output` as `NamedData` items. There is no separate `captured_output` or `captured_state` dict. Use the helper function below to look up values by wrap name:

```python
def _get_output(evaluable: Evaluable, name: str) -> Any:
    """Look up a wrap value by name from eval_output."""
    for item in evaluable.eval_output:
        if item.name == name:
            return item.value
    return None
```

**`eval_metadata`** is for passing extra per-entry data to evaluators that isn't an input data or output — e.g., expected tool names, boolean flags, thresholds. Defined as a top-level field on the entry, accessed as `evaluable.eval_metadata`.

**Complete custom evaluator example** (tool call check + dataset entry):

```python
from pixie import Evaluation, Evaluable

def _get_output(evaluable: Evaluable, name: str) -> Any:
    """Look up a wrap value by name from eval_output."""
    for item in evaluable.eval_output:
        if item.name == name:
            return item.value
    return None

def tool_call_check(evaluable: Evaluable, *, trace=None) -> Evaluation:
    expected = evaluable.eval_metadata.get("expected_tool") if evaluable.eval_metadata else None
    actual = _get_output(evaluable, "function_called")
    if expected is None:
        return Evaluation(score=1.0, reasoning="No expected_tool specified")
    match = str(actual) == str(expected)
    return Evaluation(
        score=1.0 if match else 0.0,
        reasoning=f"Expected {expected}, got {actual}",
    )
```

Corresponding dataset entry:

```json
{
  "input_data": { "user_message": "I want to end this call" },
  "description": "User requests call end after failed verification",
  "eval_input": [{ "name": "user_input", "value": "I want to end this call" }],
  "expectation": "Agent should call endCall tool",
  "eval_metadata": {
    "expected_tool": "endCall",
    "expected_call_ended": true
  },
  "evaluators": ["...", "pixie_qa/evaluators.py:tool_call_check"]
}
```

### `Evaluation`

```python
Evaluation(score: 'float', reasoning: 'str', details: 'dict[str, Any]' = <factory>) -> None
```

The result of a single evaluator applied to a single test case.

Attributes:
score: Evaluation score between 0.0 and 1.0.
reasoning: Human-readable explanation (required).
details: Arbitrary JSON-serializable metadata.

### `ScoreThreshold`

```python
ScoreThreshold(threshold: 'float' = 0.5, pct: 'float' = 1.0) -> None
```

Pass criteria: _pct_ fraction of inputs must score >= _threshold_ on all evaluators.

Attributes:
threshold: Minimum score an individual evaluation must reach.
pct: Fraction of test-case inputs (0.0–1.0) that must pass.

## Eval Functions

### `pixie.run_and_evaluate`

```python
pixie.run_and_evaluate(evaluator: 'Callable[..., Any]', runnable: 'Callable[..., Any]', eval_input: 'Any', *, expected_output: 'Any' = <object object at 0x7788c2ad5c80>, from_trace: 'Callable[[list[ObservationNode]], Evaluable] | None' = None) -> 'Evaluation'
```

Run _runnable(eval_input)_ while capturing traces, then evaluate.

Convenience wrapper combining `_run_and_capture` and `evaluate`.
The runnable is called exactly once.

Args:
evaluator: An evaluator callable (sync or async).
runnable: The application function to test.
eval*input: The single input passed to \_runnable*.
expected_output: Optional expected value merged into the
evaluable.
from_trace: Optional callable to select a specific span from
the trace tree for evaluation.

Returns:
The `Evaluation` result.

Raises:
ValueError: If no spans were captured during execution.

### `pixie.assert_pass`

```python
pixie.assert_pass(runnable: 'Callable[..., Any]', eval_inputs: 'list[Any]', evaluators: 'list[Callable[..., Any]]', *, evaluables: 'list[Evaluable] | None' = None, pass_criteria: 'Callable[[list[list[Evaluation]]], tuple[bool, str]] | None' = None, from_trace: 'Callable[[list[ObservationNode]], Evaluable] | None' = None) -> 'None'
```

Run evaluators against a runnable over multiple inputs.

For each input, runs the runnable once via `_run_and_capture`,
then evaluates with every evaluator concurrently via
`asyncio.gather`.

The results matrix has shape `[eval_inputs][evaluators]`.
If the pass criteria are not met, raises :class:`EvalAssertionError`
carrying the matrix.

When `evaluables` is provided, behaviour depends on whether each
item already has `eval_output` populated:

- **eval_output is None** — the `runnable` is called via
  `run_and_evaluate` to produce an output from traces, and
  `expected_output` from the evaluable is merged into the result.
- **eval_output is not None** — the evaluable is used directly
  (the runnable is not called for that item).

Args:
runnable: The application function to test.
eval*inputs: List of inputs, each passed to \_runnable*.
evaluators: List of evaluator callables.
evaluables: Optional list of `Evaluable` items, one per input.
When provided, their `expected_output` is forwarded to
`run_and_evaluate`. Must have the same length as
_eval_inputs_.
pass_criteria: Receives the results matrix, returns
`(passed, message)`. Defaults to `ScoreThreshold()`.
from_trace: Optional span selector forwarded to
`run_and_evaluate`.

Raises:
EvalAssertionError: When pass criteria are not met.
ValueError: When _evaluables_ length does not match _eval_inputs_.

### `pixie.assert_dataset_pass`

```python
pixie.assert_dataset_pass(runnable: 'Callable[..., Any]', dataset_name: 'str', evaluators: 'list[Callable[..., Any]]', *, dataset_dir: 'str | None' = None, pass_criteria: 'Callable[[list[list[Evaluation]]], tuple[bool, str]] | None' = None, from_trace: 'Callable[[list[ObservationNode]], Evaluable] | None' = None) -> 'None'
```

Load a dataset by name, then run `assert_pass` with its items.

This is a convenience wrapper that:

1. Loads the dataset from the `DatasetStore`.
2. Extracts `eval_input` from each item as the runnable inputs.
3. Uses the full `Evaluable` items (which carry `expected_output`)
   as the evaluables.
4. Delegates to `assert_pass`.

Args:
runnable: The application function to test.
dataset_name: Name of the dataset to load.
evaluators: List of evaluator callables.
dataset_dir: Override directory for the dataset store.
When `None`, reads from `PixieConfig.dataset_dir`.
pass_criteria: Receives the results matrix, returns
`(passed, message)`.
from_trace: Optional span selector forwarded to
`assert_pass`.

Raises:
FileNotFoundError: If no dataset with _dataset_name_ exists.
EvalAssertionError: When pass criteria are not met.

## Trace Helpers

### `pixie.last_llm_call`

```python
pixie.last_llm_call(trace: 'list[ObservationNode]') -> 'Evaluable'
```

Find the `LLMSpan` with the latest `ended_at` in the trace tree.

Args:
trace: The trace tree (list of root `ObservationNode` instances).

Returns:
An `Evaluable` wrapping the most recently ended `LLMSpan`.

Raises:
ValueError: If no `LLMSpan` exists in the trace.

### `pixie.root`

```python
pixie.root(trace: 'list[ObservationNode]') -> 'Evaluable'
```

Return the first root node's span as `Evaluable`.

Args:
trace: The trace tree (list of root `ObservationNode` instances).

Returns:
An `Evaluable` wrapping the first root node's span.

Raises:
ValueError: If the trace is empty.

### `pixie.capture_traces`

```python
pixie.capture_traces() -> 'Generator[MemoryTraceHandler, None, None]'
```

Context manager that installs a `MemoryTraceHandler` and yields it.

Calls `init()` (no-op if already initialised) then registers the
handler via `add_handler()`. On exit the handler is removed and
the delivery queue is flushed so that all spans are available on
`handler.spans`.
